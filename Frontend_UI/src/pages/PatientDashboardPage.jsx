import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
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

  const patientEmail = auth.user?.email || 'No email set';
  const patientInitials = useMemo(() => {
    const source = String(patientName || 'User').trim();
    if (!source) return 'U';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';
  }, [patientName]);

  const latestPrescription = useMemo(() => {
    const sorted = [...prescriptions].sort(
      (left, right) => new Date(right?.updatedAt || right?.createdAt || 0) - new Date(left?.updatedAt || left?.createdAt || 0)
    );
    return sorted[0] || null;
  }, [prescriptions]);

  const handleOpenPrescription = async (pdfUrl) => {
    if (!pdfUrl) {
      toast.error('Prescription PDF is not available yet.');
      return;
    }

    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('Prescription PDF could not be opened.');
      }
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (_error) {
      toast.error('Prescription PDF is unavailable right now. Please try again shortly.');
    }
  };

  const handleDownloadPrescription = async (pdfUrl, diagnosis = 'prescription') => {
    if (!pdfUrl) {
      toast.error('Prescription PDF is not available yet.');
      return;
    }

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Prescription download failed.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${String(diagnosis || 'prescription').trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'prescription'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (_error) {
      toast.error('Prescription download is unavailable right now. Please try again shortly.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 shadow-soft">
        <div className="space-y-3 px-4 py-4 lg:px-5 lg:py-5">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-brand-600">Patient workspace</p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">
              Welcome back, {patientName}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
              Your care updates, prescriptions, and next actions are available in one place.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Appointments" value={appointments.length} />
            <StatCard label="Doctors" value={doctors.length} />
            <StatCard label="Prescriptions" value={prescriptions.length} />
            <StatCard label="Specialties" value={topSpecialties.length} />
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white/70 p-2 sm:p-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-brand-700">Quick actions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  className={`${action.priority === 'primary' ? 'button-primary' : 'button-secondary'} shrink-0 whitespace-nowrap px-3 py-1.5 text-xs`}
                  to={action.to}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
            <article className="rounded-2xl border border-brand-100 bg-brand-50/35 p-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand-700">Profile at-a-glance</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-slate-500">Primary profile</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{patientName}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-slate-500">Latest status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Active</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-brand-100 bg-white p-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-700">
                  {patientInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{patientName}</p>
                  <p className="truncate text-xs text-slate-500">{patientEmail}</p>
                </div>
              </div>
              <Link to="/profile" className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:text-brand-800">
                View full profile
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight text-slate-900">Upcoming appointments</h2>
            <Link to="/appointments" className="text-xs font-semibold text-brand-700 hover:text-brand-800">Manage</Link>
          </div>

          {loading ? <p className="mt-4 text-sm text-slate-500">Loading appointments...</p> : null}
          {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-3 space-y-2.5">
            {appointments.length === 0 ? (
              <EmptyCard text="No appointments yet. Start by booking with a specialist." />
            ) : (
              appointments.slice(0, 4).map((appointment, index) => (
                <article key={appointment.id || appointment._id || index} className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
                  <p className="text-sm font-semibold text-slate-800">{appointment.doctorName || appointment.specialty || 'Doctor consultation'}</p>
                  <p className="mt-1 text-xs text-slate-500">{appointment.appointmentDate || appointment.date || 'Date pending'} · {appointment.startTime || appointment.time || 'TBD'}</p>
                  <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600">
                    {appointment.status || 'scheduled'}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight text-slate-900">Recent prescriptions</h2>
            <Link to="/patient/dashboard" className="text-xs font-semibold text-brand-700 hover:text-brand-800">Latest medications</Link>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Latest medications and treatment notes issued to you.</p>

          <div className="mt-3 space-y-2.5">
            {!latestPrescription ? (
              <EmptyCard text="No prescriptions have been issued yet." />
            ) : (
              <article className="rounded-xl border border-brand-100 bg-white/80 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{latestPrescription.diagnosis || 'Prescription issued'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Appointment: {latestPrescription.appointmentId || 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(latestPrescription.updatedAt || latestPrescription.createdAt || Date.now()).toLocaleDateString()} · {(latestPrescription.medicines || []).length} medicines
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {latestPrescription.pdfUrl ? (
                      <>
                        <button
                          type="button"
                          className="button-secondary px-3 py-1.5 text-xs"
                          onClick={() => handleOpenPrescription(latestPrescription.pdfUrl)}
                        >
                          View PDF
                        </button>
                        <button
                          type="button"
                          className="button-secondary px-3 py-1.5 text-xs"
                          onClick={() => handleDownloadPrescription(latestPrescription.pdfUrl, latestPrescription.diagnosis)}
                        >
                          Download Prescription
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {latestPrescription.notes ? <p className="mt-2 text-xs text-slate-600">{latestPrescription.notes}</p> : null}
              </article>
            )}
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="text-xl font-black tracking-tight text-slate-900">Top specialties</h2>
          <p className="mt-1.5 text-xs text-slate-500">Suggested based on doctors currently available in PrimeHealth.</p>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {topSpecialties.length === 0 ? (
              <EmptyCard text="No doctor data available right now." />
            ) : (
              topSpecialties.map(([specialty, count]) => (
                <article key={specialty} className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand-600">Specialty</p>
                  <h3 className="mt-1.5 text-base font-bold text-slate-900">{specialty}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{count} doctors available</p>
                </article>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link className="button-secondary px-3 py-1.5 text-xs" to="/doctors">Browse all doctors</Link>
            <Link className="button-secondary px-3 py-1.5 text-xs" to="/telemedicine">Open telemedicine</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white px-2.5 py-2 text-center shadow-sm">
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-brand-700">{label}</p>
      <p className="mt-0.5 text-base font-black text-slate-900 sm:text-lg">{value}</p>
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
