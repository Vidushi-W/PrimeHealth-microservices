import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createAppointment, fetchDoctors, fetchPatientAppointments } from '../services/platformApi';

const initialForm = {
  doctorId: '',
  appointmentDate: '',
  startTime: '',
  reason: '',
  mode: 'online'
};

export default function AppointmentHubPage({ auth }) {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [doctorList, patientAppointments] = await Promise.all([
        fetchDoctors().catch(() => []),
        fetchPatientAppointments(auth.token).catch(() => [])
      ]);

      if (!mounted) return;
      setDoctors(Array.isArray(doctorList) ? doctorList : []);
      setAppointments(Array.isArray(patientAppointments) ? patientAppointments : []);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [auth.token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.doctorId || !form.appointmentDate || !form.startTime) {
      toast.error('Select doctor, date, and time');
      return;
    }

    setSubmitting(true);
    try {
      const selectedDoctor = doctors.find((doctor) => (doctor._id || doctor.id) === form.doctorId);

      const created = await createAppointment(auth, {
        doctorId: form.doctorId,
        doctorName: selectedDoctor?.name || selectedDoctor?.fullName || 'Assigned doctor',
        appointmentDate: form.appointmentDate,
        startTime: form.startTime,
        mode: form.mode,
        reason: form.reason
      });

      setAppointments((current) => [created, ...current]);
      setForm(initialForm);
      toast.success('Appointment request submitted');
    } catch (error) {
      toast.error(error.message || 'Unable to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] animate-fade-up">
      <section className="panel p-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">New appointment</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Book with a specialist</h1>
        <p className="mt-2 text-sm text-slate-500">Submit your preferred slot and the platform will confirm availability.</p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">Doctor</span>
            <select
              className="input"
              value={form.doctorId}
              onChange={(event) => setForm((current) => ({ ...current, doctorId: event.target.value }))}
            >
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor._id || doctor.id} value={doctor._id || doctor.id}>
                  {doctor.name} · {doctor.specialization || 'General'}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">Date</span>
              <input
                className="input"
                type="date"
                value={form.appointmentDate}
                onChange={(event) => setForm((current) => ({ ...current, appointmentDate: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">Time</span>
              <input
                className="input"
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">Consultation mode</span>
            <select
              className="input"
              value={form.mode}
              onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))}
            >
              <option value="online">Online</option>
              <option value="physical">Physical</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">Reason (optional)</span>
            <textarea
              className="input min-h-[7rem] resize-y"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Brief symptoms or purpose of visit"
            />
          </label>

          <button className="button-primary w-full" type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Request appointment'}
          </button>
        </form>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">My appointments</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Recent requests</h2>
          </div>
          <span className="badge-soft">{appointments.length} total</span>
        </div>

        <div className="mt-5 space-y-3">
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
              Your appointment history will appear here.
            </div>
          ) : (
            appointments.slice(0, 8).map((appointment, index) => (
              <article key={appointment.id || appointment._id || index} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                <p className="text-sm font-semibold text-slate-800">{appointment.doctorName || appointment.doctorId || 'Doctor consultation'}</p>
                <p className="mt-1 text-sm text-slate-500">{appointment.appointmentDate || appointment.date || 'TBD'} · {appointment.startTime || appointment.time || 'TBD'}</p>
                <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {appointment.status || 'pending'}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
