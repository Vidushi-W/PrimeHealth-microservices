import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import DoctorCard from '../components/DoctorCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import SummaryCard from '../components/SummaryCard';
import { getDoctors, summarizeDoctorAppointments } from '../services/doctorService';
import { resolveCurrentDoctor } from '../utils/currentDoctor';

function DoctorListPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getDoctors();
        setDoctors(data);
      } catch (requestError) {
        const message = requestError.message || 'Failed to fetch doctors';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const specializations = useMemo(
    () =>
      [
        ...new Set(
          doctors
            .map((doctor) => doctor.specialization)
            .filter(Boolean)
        )
      ].sort(),
    [doctors]
  );

  const currentDoctorContext = useMemo(() => resolveCurrentDoctor(doctors), [doctors]);
  const currentDoctor = currentDoctorContext.doctor;
  const appointmentSummary = useMemo(
    () => summarizeDoctorAppointments(currentDoctor),
    [currentDoctor]
  );

  const filteredDoctors = useMemo(() => {
    if (!specializationFilter) return doctors;
    return doctors.filter((doctor) => doctor.specialization === specializationFilter);
  }, [doctors, specializationFilter]);

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.3fr_0.9fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              Doctor Portal
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900">
              Welcome{currentDoctor?.name ? `, Dr. ${currentDoctor.name}` : ''}.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Manage your PrimeHealth doctor profile, review your booked patient slots, and keep
              an eye on the clinicians registered across the platform.
            </p>
            {currentDoctorContext.source === 'demo-fallback' ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No logged-in doctor id or email was found in browser session data. The dashboard is
                previewing the first registered doctor until the auth service provides the current
                doctor identity.
              </p>
            ) : null}
            {currentDoctor ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/profile" className="button-primary">
                  Profile
                </Link>
                <a href={`mailto:${currentDoctor.email}`} className="button-secondary">
                  {currentDoctor.email}
                </a>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-brand-100 bg-brand-50 p-6 text-slate-900 shadow-soft">
            <p className="text-sm font-medium text-brand-700">My practice today</p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-4xl font-semibold">{appointmentSummary.total}</p>
                <p className="mt-2 text-sm text-slate-600">appointments booked for your profile</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-brand-100 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Specialization</p>
                  <p className="mt-2 font-semibold text-slate-900">{currentDoctor?.specialization || 'Not set'}</p>
                </div>
                <div className="rounded-lg border border-brand-100 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Experience</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {currentDoctor?.experience ?? 0} years
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Registered Doctors"
          value={String(doctors.length)}
          helper="All doctors in the Doctor Service"
        />
        <SummaryCard
          label="Specializations"
          value={String(specializations.length)}
          helper="Unique specialties across the platform"
        />
        <SummaryCard
          label="My Appointments"
          value={String(appointmentSummary.total)}
          helper="Counted from booked slots until appointment-service is connected"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
            My Profile
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">
            {currentDoctor?.name || 'Current doctor'}
          </h3>
          <div className="mt-5 grid gap-4 text-sm">
            <div>
              <p className="font-medium text-slate-500">Email</p>
              <p className="mt-1 text-slate-900">{currentDoctor?.email || 'Not available'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Specialization</p>
              <p className="mt-1 text-slate-900">{currentDoctor?.specialization || 'Not set'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Experience</p>
              <p className="mt-1 text-slate-900">{currentDoctor?.experience ?? 0} years</p>
            </div>
          </div>
          <Link to="/profile" className="button-primary mt-6 w-full">
            Edit my profile
          </Link>
        </div>

        <div className="panel p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
                My Appointments
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">Booked patient slots</h3>
            </div>
            <span className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
              {appointmentSummary.total} total
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {appointmentSummary.recent.length ? (
              appointmentSummary.recent.map((slot) => (
                <div
                  key={`${slot.day}-${slot.start}-${slot.end}`}
                  className="rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3"
                >
                  <p className="font-semibold text-slate-900">{slot.day}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {slot.start} - {slot.end}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                No booked slots are recorded for this doctor yet.
              </p>
            )}
          </div>

          <p className="mt-5 text-sm text-slate-500">
            The appointment-service endpoint is not implemented in this repo yet, so this dashboard
            is prepared to swap this card to real patient appointment records when that API becomes
            available.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Registered doctors</h3>
          <p className="mt-1 text-sm text-slate-500">
            Review every doctor currently registered in the system.
          </p>
        </div>

        <div className="w-full md:w-80">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-600">Filter by specialization</span>
            <select
              value={specializationFilter}
              onChange={(event) => setSpecializationFilter(event.target.value)}
              className="input"
            >
              <option value="">All specializations</option>
              {specializations.map((specialization) => (
                <option key={specialization} value={specialization}>
                  {specialization}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? <LoadingState label="Loading doctors..." /> : null}

      {!loading && error ? (
        <EmptyState
          title="Unable to load doctors"
          description="Please check that doctor-service is running on http://localhost:5002."
        />
      ) : null}

      {!loading && !error && filteredDoctors.length === 0 ? (
        <EmptyState
          title="No doctors matched"
          description="Try a different specialization filter or add doctors in the backend."
        />
      ) : null}

      {!loading && !error && filteredDoctors.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDoctors.map((doctor) => (
            <DoctorCard key={doctor._id} doctor={doctor} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default DoctorListPage;
