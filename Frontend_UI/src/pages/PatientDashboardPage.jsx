import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDoctors, fetchPatientAppointments, fetchPatientPrescriptions } from '../services/platformApi';

export default function PatientDashboardPage({ auth }) {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const patientName = auth.user?.fullName || auth.user?.name || 'User';
  const quickActions = [
    { label: 'Book Appointment', to: '/patient/appointments/book', priority: 'primary' },
    { label: 'Open Profile', to: '/profile', priority: 'secondary' },
    { label: 'Calculate Risk Score', to: '/risk-score', priority: 'secondary' },
    { label: 'Open Reminders', to: '/reminders', priority: 'secondary' },
    { label: 'Start Symptom Check', to: '/symptom-checker', priority: 'secondary' },
    { label: 'Family Profile', to: '/family-profiles', priority: 'secondary' },
    { label: 'Health Risk Analyzer', to: '/health-risk-analyzer', priority: 'secondary' }
  ];

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [doctorList, appointmentList, prescriptionList] = await Promise.all([
          fetchDoctors().catch(() => []),
          fetchPatientAppointments(auth.token).catch(() => []),
          fetchPatientPrescriptions(auth.token, auth.user?.userId || auth.user?._id || auth.user?.id).catch(() => [])
        ]);

        if (!mounted) return;
        setDoctors(Array.isArray(doctorList) ? doctorList : []);
        setAppointments(Array.isArray(appointmentList) ? appointmentList : []);
        setPrescriptions(Array.isArray(prescriptionList) ? prescriptionList : []);
        setError('');
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message || 'Unable to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth.token, auth.user?.userId, auth.user?._id, auth.user?.id]);

  const topSpecialties = useMemo(() => {
    const counts = doctors.reduce((acc, doctor) => {
      const key = doctor.specialization || 'General';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [doctors]);

  return (
    <div className="space-y-7 animate-fade-up">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/80 shadow-soft">
        <div className="space-y-4 px-4 py-4 lg:px-5 lg:py-5">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-brand-600">Patient workspace</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
              Welcome back, {patientName}
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
              Your care updates, prescriptions, and next actions are available in one place.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <StatCard label="Appointments" value={appointments.length} />
            <StatCard label="Doctors" value={doctors.length} />
            <StatCard label="Prescriptions" value={prescriptions.length} />
            <StatCard label="Specialties" value={topSpecialties.length} />
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white/70 p-2 sm:p-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-brand-700">Quick actions</p>
            <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  className={`${action.priority === 'primary' ? 'button-primary' : 'button-secondary'} shrink-0 whitespace-nowrap px-3 py-2 text-xs`}
                  to={action.to}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <p className="max-w-2xl text-[0.7rem] text-slate-500 sm:text-xs">
            These quick actions cover appointment booking, profile management, reminders, family-member management, and AI-assisted symptom and risk workflows.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Upcoming appointments</h2>
            <Link to="/appointments" className="text-sm font-semibold text-brand-700 hover:text-brand-800">Manage</Link>
          </div>

          {loading ? <p className="mt-4 text-sm text-slate-500">Loading appointments...</p> : null}
          {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-4 space-y-3">
            {appointments.length === 0 ? (
              <EmptyCard text="No appointments yet. Start by booking with a specialist." />
            ) : (
              appointments.slice(0, 4).map((appointment, index) => (
                <article key={appointment.id || appointment._id || index} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <p className="text-sm font-semibold text-slate-800">{appointment.doctorName || appointment.specialty || 'Doctor consultation'}</p>
                  <p className="mt-1 text-sm text-slate-500">{appointment.appointmentDate || appointment.date || 'Date pending'} · {appointment.startTime || appointment.time || 'TBD'}</p>
                  <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {appointment.status || 'scheduled'}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Top specialties</h2>
          <p className="mt-2 text-sm text-slate-500">Suggested based on doctors currently available in PrimeHealth.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {topSpecialties.length === 0 ? (
              <EmptyCard text="No doctor data available right now." />
            ) : (
              topSpecialties.map(([specialty, count]) => (
                <article key={specialty} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">Specialty</p>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{specialty}</h3>
                  <p className="mt-1 text-sm text-slate-500">{count} doctors available</p>
                </article>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="button-secondary" to="/doctors">Browse all doctors</Link>
            <Link className="button-secondary" to="/telemedicine">Open telemedicine</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white px-2 py-2 text-center shadow-sm">
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-brand-700">{label}</p>
      <p className="mt-0.5 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function EmptyCard({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
