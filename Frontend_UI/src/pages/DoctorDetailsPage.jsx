import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AvailabilityForm from '../components/AvailabilityForm';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import SlotCard from '../components/SlotCard';
import SummaryCard from '../components/SummaryCard';
import {
  addAvailability,
  getDoctorById,
  getPatientSummary,
  updateSlotStatus
} from '../services/doctorService';
import { formatDateTime } from '../utils/formatters';

function DoctorDetailsPage() {
  const { doctorId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingAvailability, setSubmittingAvailability] = useState(false);
  const [updatingSlot, setUpdatingSlot] = useState('');
  const [patientId, setPatientId] = useState('');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        setLoading(true);
        const data = await getDoctorById(doctorId);
        setDoctor(data);
      } catch (error) {
        toast.error(error.message || 'Failed to load doctor details');
      } finally {
        setLoading(false);
      }
    };

    loadDoctor();
  }, [doctorId]);

  const sortedAvailability = useMemo(() => {
    if (!doctor?.availability) return [];
    return [...doctor.availability];
  }, [doctor]);

  const handleGenerateSlots = async (payload) => {
    try {
      setSubmittingAvailability(true);
      const updatedAvailability = await addAvailability(doctorId, payload);
      setDoctor((current) => ({
        ...current,
        availability: updatedAvailability
      }));
      toast.success('Availability updated successfully');
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to update availability');
      return false;
    } finally {
      setSubmittingAvailability(false);
    }
  };

  const handleBookSlot = async (day, slot) => {
    const key = `${day}-${slot.start}-${slot.end}`;

    setDoctor((current) => ({
      ...current,
      availability: current.availability.map((availabilityItem) =>
        availabilityItem.day === day
          ? {
              ...availabilityItem,
              slots: availabilityItem.slots.map((item) =>
                item.start === slot.start && item.end === slot.end
                  ? { ...item, status: 'booked' }
                  : item
              )
            }
          : availabilityItem
      )
    }));

    try {
      setUpdatingSlot(key);
      const updatedAvailability = await updateSlotStatus(doctorId, {
        day,
        start: slot.start,
        end: slot.end,
        status: 'booked'
      });

      setDoctor((current) => ({
        ...current,
        availability: updatedAvailability
      }));
      toast.success('Slot booked successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update slot');
      const refreshedDoctor = await getDoctorById(doctorId);
      setDoctor(refreshedDoctor);
    } finally {
      setUpdatingSlot('');
    }
  };

  const handleFetchSummary = async (event) => {
    event.preventDefault();

    if (!patientId.trim()) {
      toast.error('Please enter a patient ID');
      return;
    }

    try {
      setSummaryLoading(true);
      setSummaryError('');
      const data = await getPatientSummary(doctorId, patientId.trim());
      setSummary(data);
    } catch (error) {
      const message = error.message || 'Failed to fetch patient summary';
      setSummaryError(message);
      setSummary(null);
      toast.error(message);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading doctor details..." />;
  }

  if (!doctor) {
    return (
      <EmptyState
        title="Doctor not found"
        description="The selected doctor could not be loaded from doctor-service."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            Back to doctor list
          </Link>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">{doctor.name}</h2>
          <p className="mt-2 text-base text-slate-500">
            {doctor.specialization} | {doctor.experience} years of experience
          </p>
          <p className="mt-1 text-sm text-slate-400">{doctor.email}</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Specialization" value={doctor.specialization} />
        <SummaryCard label="Experience" value={`${doctor.experience} years`} />
        <SummaryCard
          label="Availability Days"
          value={String(doctor.availability?.length || 0)}
          helper="Configured scheduling days"
        />
      </section>

      <AvailabilityForm onSubmit={handleGenerateSlots} submitting={submittingAvailability} />

      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
            Availability Overview
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">Daily schedules</h3>
        </div>

        {sortedAvailability.length === 0 ? (
          <EmptyState
            title="No availability configured"
            description="Generate slots above to create the first scheduling window for this doctor."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {sortedAvailability.map((availabilityItem) => (
              <div key={availabilityItem.day} className="panel p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900">{availabilityItem.day}</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Slot duration: {availabilityItem.slotDuration} minutes
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    {availabilityItem.slots.length} slots
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {availabilityItem.slots.map((slot) => {
                    const slotKey = `${availabilityItem.day}-${slot.start}-${slot.end}`;
                    return (
                      <SlotCard
                        key={slotKey}
                        slot={slot}
                        disabled={updatingSlot === slotKey}
                        onBook={() => handleBookSlot(availabilityItem.day, slot)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              Patient Insights
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Prescription-driven summary</h3>
            <p className="mt-2 text-sm text-slate-500">
              Enter a patient ID to view prescription statistics sourced from the prescription
              service.
            </p>
          </div>

          <form className="flex w-full max-w-lg flex-col gap-3 sm:flex-row" onSubmit={handleFetchSummary}>
            <input
              type="text"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              placeholder="Enter patient ID"
              className="input"
            />
            <button type="submit" className="button-primary sm:w-44" disabled={summaryLoading}>
              {summaryLoading ? 'Loading...' : 'Load Summary'}
            </button>
          </form>
        </div>

        {summaryError ? <p className="mt-4 text-sm font-medium text-red-600">{summaryError}</p> : null}

        {summary ? (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="Total Prescriptions"
                value={String(summary.stats?.totalPrescriptions ?? 0)}
              />
              <SummaryCard
                label="Last Prescription"
                value={formatDateTime(summary.stats?.lastPrescriptionDate)}
              />
              <SummaryCard
                label="Most Common Diagnosis"
                value={summary.stats?.mostCommonDiagnosis || 'No diagnosis data'}
              />
            </div>

            <div className="rounded-3xl border border-brand-100 bg-brand-50/40 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Recent prescriptions</h4>
                  <p className="mt-1 text-sm text-slate-500">Latest five prescriptions for this doctor and patient.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700">
                  Patient ID: {summary.patient?.id}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {summary.recentPrescriptions?.length ? (
                  summary.recentPrescriptions.map((prescription) => (
                    <div
                      key={prescription._id}
                      className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {prescription.diagnosis || 'No diagnosis'}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                            Appointment: {prescription.appointmentId || 'N/A'}
                          </p>
                        </div>
                        <p className="text-sm text-slate-500">
                          {formatDateTime(prescription.createdAt)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(prescription.medicines || []).map((medicine, index) => (
                          <span
                            key={`${prescription._id}-${medicine.name || index}`}
                            className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                          >
                            {medicine.name} {medicine.dosage ? `| ${medicine.dosage}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No prescriptions found"
                    description="This doctor has no prescription records yet for the selected patient."
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default DoctorDetailsPage;
