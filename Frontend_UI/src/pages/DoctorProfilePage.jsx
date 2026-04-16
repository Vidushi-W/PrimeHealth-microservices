import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import SummaryCard from '../components/SummaryCard';
import {
  getDoctors,
  summarizeDoctorAppointments,
  updateDoctor
} from '../services/doctorService';
import { resolveCurrentDoctor } from '../utils/currentDoctor';

const emptyForm = {
  name: '',
  email: '',
  specialization: '',
  experience: ''
};

function toFormValues(doctor) {
  return {
    name: doctor?.name || '',
    email: doctor?.email || '',
    specialization: doctor?.specialization || '',
    experience: String(doctor?.experience ?? 0)
  };
}

function DoctorProfilePage() {
  const [doctors, setDoctors] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [identitySource, setIdentitySource] = useState('missing');
  const [formValues, setFormValues] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await getDoctors();
        const resolved = resolveCurrentDoctor(data);

        setDoctors(data);
        setDoctor(resolved.doctor);
        setIdentitySource(resolved.source);
        setFormValues(toFormValues(resolved.doctor));
      } catch (error) {
        toast.error(error.message || 'Failed to load doctor profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const appointmentSummary = useMemo(() => summarizeDoctorAppointments(doctor), [doctor]);
  const availabilityDays = doctor?.availability?.length || 0;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleCancel = () => {
    setFormValues(toFormValues(doctor));
    setEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!doctor?._id) {
      toast.error('No logged-in doctor profile was found');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        specialization: formValues.specialization.trim(),
        experience: Number(formValues.experience)
      };

      const updatedDoctor = await updateDoctor(doctor._id, payload);
      setDoctor(updatedDoctor);
      setDoctors((current) =>
        current.map((item) => (item._id === updatedDoctor._id ? updatedDoctor : item))
      );
      setFormValues(toFormValues(updatedDoctor));
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update doctor profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading your doctor profile..." />;
  }

  if (!doctor) {
    return (
      <EmptyState
        title="Doctor profile unavailable"
        description="No registered doctor matched the current browser session. Sign in as a doctor or add doctor identity data from the auth service."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link to="/" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            Back to dashboard
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
            My Doctor Profile
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
            Dr. {doctor.name}
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Update the personal and professional details patients and staff use across PrimeHealth.
          </p>
        </div>

        <button type="button" className="button-primary" onClick={() => setEditing(true)}>
          Edit
        </button>
      </section>

      {identitySource === 'demo-fallback' ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This profile is using the first doctor record as a demo fallback because no logged-in
          doctor id or email was found in local/session storage.
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Registered Doctors" value={String(doctors.length)} />
        <SummaryCard label="My Appointments" value={String(appointmentSummary.total)} />
        <SummaryCard label="Availability Days" value={String(availabilityDays)} />
        <SummaryCard label="Experience" value={`${doctor.experience} years`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
            Profile Snapshot
          </p>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="font-medium text-slate-500">Name</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{doctor.name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Email</p>
              <p className="mt-1 text-slate-900">{doctor.email}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Specialization</p>
              <p className="mt-1 text-slate-900">{doctor.specialization}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Experience</p>
              <p className="mt-1 text-slate-900">{doctor.experience} years</p>
            </div>
          </div>
        </div>

        <form className="panel p-6" onSubmit={handleSave}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
                Edit Details
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                Personal and professional information
              </h3>
            </div>
            {!editing ? (
              <button type="button" className="button-secondary" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Name</span>
              <input
                name="name"
                value={formValues.name}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Email</span>
              <input
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Specialization
              </span>
              <input
                name="specialization"
                value={formValues.specialization}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Experience
              </span>
              <input
                name="experience"
                type="number"
                min="0"
                value={formValues.experience}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {editing ? (
              <>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Update'}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Editing is locked until you choose Edit profile.
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

export default DoctorProfilePage;
