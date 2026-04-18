import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AvailabilityForm from '../components/AvailabilityForm';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import SlotCard from '../components/SlotCard';
import StarRating, { StarRatingInput } from '../components/StarRating';
import SummaryCard from '../components/SummaryCard';
import { API_BASE_DOCTOR } from '../config/apiBase';
import {
  addAvailability,
  deleteAvailabilitySlot,
  fetchDoctorReviews,
  getDoctorById,
  getPatientSummary,
  submitDoctorReview,
  updateAvailabilitySlot,
  updateSlotStatus
} from '../services/doctorService';
import { formatDateTime } from '../utils/formatters';
import { getStoredAuth } from '../services/platformApi';
import { getStoredDoctorIdentity } from '../utils/currentDoctor';

function getDoctorImageSrc(doctor) {
  const picture = doctor?.profilePicture || doctor?.profileImage || '';
  if (!picture) return 'https://placehold.co/120x120?text=Dr';
  if (picture.startsWith('http://') || picture.startsWith('https://')) return picture;
  const base = API_BASE_DOCTOR.replace(/\/+$/, '');
  const path = picture.startsWith('/') ? picture : `/${picture}`;
  return `${base}${path}`;
}

function DoctorDetailsPage({ auth }) {
  const { doctorId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingAvailability, setSubmittingAvailability] = useState(false);
  const [updatingSlot, setUpdatingSlot] = useState('');
  const [patientId, setPatientId] = useState('');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalRatings: 0, reviews: [] });
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        setLoading(true);
        const data = await getDoctorById(doctorId);
        setDoctor(data);
        const reviews = await fetchDoctorReviews(doctorId).catch(() => ({ averageRating: 0, totalRatings: 0, reviews: [] }));
        setReviewSummary(reviews);
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

  const role = String(auth?.user?.role || getStoredAuth()?.user?.role || '').toLowerCase();
  const isDoctorViewer = role === 'doctor';
  const identity = getStoredDoctorIdentity();

  const canManageAvailability = useMemo(() => {
    if (!isDoctorViewer || !doctor) return false;

    const viewerIds = [
      auth?.user?.id,
      auth?.user?._id,
      auth?.user?.userId,
      identity.id
    ]
      .filter(Boolean)
      .map((value) => String(value));
    const viewerEmail = String(auth?.user?.email || identity.email || '').toLowerCase();

    const doctorIds = [doctor?._id, doctor?.id, doctor?.doctorId]
      .filter(Boolean)
      .map((value) => String(value));
    const doctorEmail = String(doctor?.email || '').toLowerCase();

    const sameById = doctorIds.some((id) => viewerIds.includes(id));
    const sameByEmail = viewerEmail && doctorEmail && viewerEmail === doctorEmail;

    return sameById || sameByEmail;
  }, [auth?.user, doctor, identity.email, identity.id, isDoctorViewer]);

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

  const handleToggleSlotStatus = async (day, slot) => {
    const key = `${day}-${slot.start}-${slot.end}`;
    const nextStatus = slot.status === 'available' ? 'booked' : 'available';

    setDoctor((current) => ({
      ...current,
      availability: current.availability.map((availabilityItem) =>
        availabilityItem.day === day
          ? {
              ...availabilityItem,
              slots: availabilityItem.slots.map((item) =>
                item.start === slot.start && item.end === slot.end
                  ? { ...item, status: nextStatus }
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
        status: nextStatus
      });

      setDoctor((current) => ({
        ...current,
        availability: updatedAvailability
      }));
      toast.success('Slot status updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update slot');
      const refreshedDoctor = await getDoctorById(doctorId);
      setDoctor(refreshedDoctor);
    } finally {
      setUpdatingSlot('');
    }
  };

  const handleEditSlot = async (day, slot) => {
    const newStart = window.prompt('Enter new start time (HH:mm)', slot.start);
    if (!newStart) return;

    const newEnd = window.prompt('Enter new end time (HH:mm)', slot.end);
    if (!newEnd) return;

    const key = `${day}-${slot.start}-${slot.end}`;

    try {
      setUpdatingSlot(key);
      const updatedAvailability = await updateAvailabilitySlot(doctorId, {
        day,
        start: slot.start,
        end: slot.end,
        newStart,
        newEnd,
        status: slot.status
      });

      setDoctor((current) => ({
        ...current,
        availability: updatedAvailability
      }));
      toast.success('Slot updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update availability slot');
    } finally {
      setUpdatingSlot('');
    }
  };

  const handleDeleteSlot = async (day, slot) => {
    const approved = window.confirm(`Remove slot ${slot.start} - ${slot.end} from ${day}?`);
    if (!approved) return;

    const key = `${day}-${slot.start}-${slot.end}`;

    try {
      setUpdatingSlot(key);
      const updatedAvailability = await deleteAvailabilitySlot(doctorId, {
        day,
        start: slot.start,
        end: slot.end
      });

      setDoctor((current) => ({
        ...current,
        availability: updatedAvailability
      }));
      toast.success('Slot deleted');
    } catch (error) {
      toast.error(error.message || 'Failed to delete slot');
    } finally {
      setUpdatingSlot('');
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    const auth = getStoredAuth();
    const patientId = auth?.user?.id || auth?.user?._id || auth?.user?.userId;

    if (!patientId) {
      toast.error('Sign in as a patient to submit a review');
      return;
    }

    try {
      setSubmittingReview(true);
      await submitDoctorReview(doctorId, {
        patientId,
        patientName: auth?.user?.fullName || auth?.user?.name || auth?.user?.email || 'Patient',
        rating: Number(reviewForm.rating),
        review: reviewForm.review
      });

      const reviews = await fetchDoctorReviews(doctorId);
      setReviewSummary(reviews);
      setReviewForm({ rating: 5, review: '' });
      toast.success('Thanks for your review');
    } catch (error) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
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
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-col gap-3">
          <Link to="/" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            Back to doctor list
          </Link>
          <div className="flex items-start gap-3">
            <img
              src={getDoctorImageSrc(doctor)}
              alt={`${doctor?.name || 'Doctor'} profile`}
              className="h-16 w-16 shrink-0 rounded-2xl border border-brand-100 object-cover"
            />
            <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{doctor.name}</h2>
          <p className="text-xs text-slate-600">
            {doctor.specialization} | {doctor.experience} years experience
          </p>
          <p className="text-xs text-slate-500">{doctor.email}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true">⭐</span> Rating
            </span>
            <StarRating
              value={doctor.ratingAverage}
              size="sm"
              showValue
              reviewCount={doctor.ratingCount}
            />
          </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-3">
        {[
          ['🩺', 'Specialization', doctor.specialization],
          ['⏱️', 'Experience', `${doctor.experience} years`],
          ['📅', 'Availability Days', String(doctor.availability?.length || 0), 'Configured scheduling days']
        ].map(([icon, label, value, helper]) => (
          <div key={label} className="panel p-2">
            <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              <span aria-hidden="true">{icon}</span>
              {label}
            </p>
            <p className="mt-1 text-xl font-semibold leading-none text-slate-900">{value}</p>
            {helper ? <p className="mt-1 text-[10px] text-slate-500">{helper}</p> : null}
          </div>
        ))}
      </section>

      {canManageAvailability ? (
        <AvailabilityForm onSubmit={handleGenerateSlots} submitting={submittingAvailability} />
      ) : (
        <section className="panel p-5 text-sm text-slate-600">
          Availability for this doctor is read-only. You can only manage your own schedule.
        </section>
      )}

      <section className="space-y-4">
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
            <span aria-hidden="true">🗂️</span> Availability Overview
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">Daily schedules</h3>
        </div>

        {sortedAvailability.length === 0 ? (
          <EmptyState
            title="No availability configured"
            description="Generate slots above to create the first scheduling window for this doctor."
          />
        ) : (
            <div className="grid gap-4 xl:grid-cols-2">
            {sortedAvailability.map((availabilityItem) => (
              <div key={availabilityItem.day} className="panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{availabilityItem.day}</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Slot duration: {availabilityItem.slotDuration} minutes
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    {availabilityItem.slots.length} slots
                  </span>
                </div>

                <div className="mt-3 grid gap-2.5">
                  {availabilityItem.slots.map((slot) => {
                    const slotKey = `${availabilityItem.day}-${slot.start}-${slot.end}`;
                    return (
                      <SlotCard
                        key={slotKey}
                        slot={slot}
                        disabled={!canManageAvailability || updatingSlot === slotKey}
                        onToggleStatus={
                          canManageAvailability ? () => handleToggleSlotStatus(availabilityItem.day, slot) : undefined
                        }
                        onEdit={canManageAvailability ? () => handleEditSlot(availabilityItem.day, slot) : undefined}
                        onDelete={canManageAvailability ? () => handleDeleteSlot(availabilityItem.day, slot) : undefined}
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

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Ratings and reviews</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Patient feedback</h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
            <StarRating
              value={reviewSummary.averageRating}
              size="sm"
              showValue
              reviewCount={reviewSummary.totalRatings}
            />
          </span>
        </div>

        <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={handleReviewSubmit}>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Your rating</span>
            <StarRatingInput
              value={Number(reviewForm.rating) || 5}
              onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))}
            />
          </div>
          <input
            className="input min-w-[12rem] flex-1 sm:min-w-[200px]"
            value={reviewForm.review}
            onChange={(event) => setReviewForm((current) => ({ ...current, review: event.target.value }))}
            placeholder="Write a review (optional)"
          />
          <button className="button-primary shrink-0" type="submit" disabled={submittingReview}>
            {submittingReview ? 'Submitting...' : 'Submit review'}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {(reviewSummary.reviews || []).slice(0, 8).map((item) => (
            <article key={item._id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.patientName || item.patientId}</p>
                <StarRating value={item.rating} size="sm" />
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.review || 'No comment provided.'}</p>
            </article>
          ))}
          {!reviewSummary.reviews?.length ? (
            <p className="text-sm text-slate-500">No ratings submitted yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default DoctorDetailsPage;
