import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DoctorCard from '../components/DoctorCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { getDoctors } from '../services/doctorService';

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
    () => [...new Set(doctors.map((doctor) => doctor.specialization))].sort(),
    [doctors]
  );

  const filteredDoctors = useMemo(() => {
    if (!specializationFilter) return doctors;
    return doctors.filter((doctor) => doctor.specialization === specializationFilter);
  }, [doctors, specializationFilter]);

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.4fr_0.9fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-600">
              Doctor Directory
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900">
              Monitor clinicians, review availability, and manage active schedules.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This dashboard is focused purely on the Doctor Service. Browse your doctors, inspect
              availability, simulate bookings, and open patient prescription insights from one
              clean workspace.
            </p>
          </div>

          <div className="rounded-[28px] bg-gradient-to-br from-brand-500 via-brand-400 to-emerald-300 p-6 text-white shadow-soft">
            <p className="text-sm font-medium text-white/80">Current overview</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-sm text-white/80">Doctors</p>
                <p className="mt-2 text-3xl font-semibold">{doctors.length}</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="text-sm text-white/80">Specializations</p>
                <p className="mt-2 text-3xl font-semibold">{specializations.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Doctor list</h3>
          <p className="mt-1 text-sm text-slate-500">Select a doctor card to open the full view.</p>
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
