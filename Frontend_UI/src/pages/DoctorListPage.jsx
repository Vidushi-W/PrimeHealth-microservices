import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getDoctors } from '../services/doctorService';

const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getDoctorImageSrc(doctor) {
  const picture = doctor?.profilePicture || doctor?.profileImage || '';
  if (!picture) return '';
  if (picture.startsWith('http://') || picture.startsWith('https://')) return picture;

  const base = (import.meta.env.VITE_DOCTOR_API_URL || 'http://localhost:5002').replace(/\/+$/, '');
  const path = picture.startsWith('/') ? picture : `/${picture}`;
  return `${base}${path}`;
}

function getNextAvailableSlot(doctor) {
  const availability = Array.isArray(doctor?.availability) ? doctor.availability : [];

  const sortedDays = [...availability].sort((left, right) => {
    const leftKey = WEEKDAY_ORDER.indexOf(String(left.day || '').toLowerCase());
    const rightKey = WEEKDAY_ORDER.indexOf(String(right.day || '').toLowerCase());
    return (leftKey === -1 ? 999 : leftKey) - (rightKey === -1 ? 999 : rightKey);
  });

  for (const day of sortedDays) {
    const availableSlot = (day.slots || []).find((slot) => slot.status === 'available');
    if (availableSlot) {
      return `${day.day} ${availableSlot.start} - ${availableSlot.end}`;
    }
  }

  return 'No open slots right now';
}

function formatRating(doctor) {
  const average = Number(doctor?.ratingAverage || 0).toFixed(1);
  const count = Number(doctor?.ratingCount || 0);
  return `${average} / 5 (${count})`;
}

export default function DoctorListPage({ auth }) {
  const role = String(auth?.user?.role || '').toLowerCase();
  const isPatientView = role === 'patient';

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const list = await getDoctors({ includeInactive: false });
        if (!mounted) return;
        setDoctors(Array.isArray(list) ? list : []);
      } catch (error) {
        toast.error(error.message || 'Unable to load doctors');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const specializationOptions = useMemo(() => {
    return [...new Set(doctors.map((doctor) => doctor.specialization).filter(Boolean))].sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const doctorText = `${doctor.name || ''} ${doctor.specialization || ''} ${doctor.hospitalOrClinic || ''}`.toLowerCase();
      const nextSlot = getNextAvailableSlot(doctor);

      if (query && !doctorText.includes(query.toLowerCase())) {
        return false;
      }

      if (specialization && doctor.specialization !== specialization) {
        return false;
      }

      if (onlyAvailable && nextSlot === 'No open slots right now') {
        return false;
      }

      return true;
    });
  }, [doctors, onlyAvailable, query, specialization]);

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">
          {isPatientView ? 'Find a doctor' : 'Doctor directory'}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {isPatientView ? 'Choose the right specialist quickly' : 'Discover and manage doctor profiles'}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          {isPatientView
            ? 'Search by name or specialty, inspect ratings and availability, then book with confidence.'
            : 'Use directory filters to review colleagues and open profile-level availability controls.'}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search</span>
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, specialty, clinic"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Specialty</span>
            <select className="input" value={specialization} onChange={(event) => setSpecialization(event.target.value)}>
              <option value="">All specialties</option>
              {specializationOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(event) => setOnlyAvailable(event.target.checked)}
            />
            Show only available doctors
          </label>
        </div>
      </section>

      {loading ? <section className="panel p-5 text-sm text-slate-500">Loading doctors...</section> : null}

      {!loading && filteredDoctors.length === 0 ? (
        <section className="panel p-5 text-sm text-slate-500">No doctors match your search filters.</section>
      ) : null}

      {!loading && filteredDoctors.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDoctors.map((doctor) => {
            const doctorId = doctor._id || doctor.id;
            const nextAvailable = getNextAvailableSlot(doctor);

            return (
              <article key={doctorId} className="panel flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={getDoctorImageSrc(doctor) || 'https://placehold.co/96x96?text=Dr'}
                      alt={`${doctor.name || 'Doctor'} profile`}
                      className="h-16 w-16 shrink-0 rounded-2xl border border-brand-100 object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{doctor.specialization || 'General care'}</p>
                      <h2 className="mt-1 text-lg font-bold text-slate-900">{doctor.name || 'Doctor'}</h2>
                      <p className="mt-1 text-sm text-slate-500">{doctor.hospitalOrClinic || doctor.email || 'PrimeHealth network'}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    {doctor.experience || 0} yrs
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-700">
                  <p><strong>Rating:</strong> {formatRating(doctor)}</p>
                  <p><strong>Next availability:</strong> {nextAvailable}</p>
                  <p><strong>Qualifications:</strong> {doctor.qualifications || 'Not specified'}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link className="button-secondary" to={`/doctors/${doctorId}`}>View profile</Link>
                  {isPatientView ? (
                    <Link className="button-primary" to={`/patient/appointments/book?doctorId=${doctorId}`}>Book appointment</Link>
                  ) : (
                    <Link className="button-primary" to={`/doctors/${doctorId}`}>Manage availability</Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
