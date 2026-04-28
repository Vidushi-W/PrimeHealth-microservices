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

  const quickActionIcons = {
    'Book Appointment': '📅',
    'Open Profile': '👤',
    'Calculate Risk Score': '📊',
    'Open Reminders': '🔔',
    'Start Symptom Check': '🩺',
    'Family Profile': '👨‍👩‍👧',
    'Health Risk Analyzer': '💡'
  };

  const specialtyIcons = ['💊', '🫀', '🧠', '🦴', '👁️', '🦷', '🩻', '🧬'];
  const specialtyColors = [
    'from-teal-400 to-emerald-500',
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-amber-400 to-orange-500'
  ];

  const statusConfig = {
    CONFIRMED: { dot: 'bg-emerald-400', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PENDING: { dot: 'bg-amber-400', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    CANCELLED: { dot: 'bg-rose-400', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    COMPLETED: { dot: 'bg-indigo-400', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 17) return '☀️ Good afternoon';
    return '🌙 Good evening';
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Welcome Hero ──────────────────────────────────── */}
      <section className="panel overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(11,122,117,0.08) 0%, rgba(31,138,211,0.06) 40%, rgba(216,111,69,0.04) 100%)' }} />
        <div className="relative p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div
                className="flex-shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
              >
                {patientInitials}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-600">{getGreeting()}</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', serif" }}>
                  {patientName}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{patientEmail}</p>
              </div>
            </div>
            <Link to="/profile" className="button-secondary text-xs hover:-translate-y-0.5">
              ✏️ Edit Profile
            </Link>
          </div>

          {/* ── Stat Cards ──────────────────────────────── */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="📅" label="Appointments" value={appointments.length} color="from-teal-50 to-emerald-50" borderColor="border-emerald-200" textColor="text-emerald-700" />
            <StatCard icon="👨‍⚕️" label="Doctors" value={doctors.length} color="from-sky-50 to-blue-50" borderColor="border-sky-200" textColor="text-sky-700" />
            <StatCard icon="💊" label="Prescriptions" value={prescriptions.length} color="from-violet-50 to-purple-50" borderColor="border-violet-200" textColor="text-violet-700" />
            <StatCard icon="🏥" label="Specialties" value={topSpecialties.length} color="from-amber-50 to-orange-50" borderColor="border-amber-200" textColor="text-amber-700" />
          </div>
        </div>
      </section>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <section className="panel p-6">
        <p className="eyebrow">⚡ Quick Actions</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`group flex items-center gap-3 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                action.priority === 'primary'
                  ? 'border-brand-200 bg-gradient-to-br from-brand-50 to-white'
                  : 'border-brand-100 bg-white hover:border-brand-300'
              }`}
            >
              <span className="text-2xl">{quickActionIcons[action.label] || '📌'}</span>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-brand-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Main Content Grid ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* ── Upcoming Appointments ───────────────────── */}
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">📋 Schedule</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', serif" }}>
                Upcoming Appointments
              </h2>
            </div>
            <Link to="/appointments" className="button-secondary text-xs">
              View all →
            </Link>
          </div>

          {loading && (
            <div className="mt-6 flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
            </div>
          )}
          {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">⚠️ {error}</p>}

          <div className="mt-4 space-y-3">
            {!loading && appointments.length === 0 ? (
              <EmptyCard icon="📅" title="No appointments yet" text="Start by booking with a specialist to see your upcoming schedule here." />
            ) : (
              appointments.slice(0, 4).map((appointment, index) => {
                const status = String(appointment.status || 'PENDING').toUpperCase();
                const cfg = statusConfig[status] || statusConfig.PENDING;
                const doctorInitial = (appointment.doctorName || 'D').charAt(0).toUpperCase();
                return (
                  <article
                    key={appointment.id || appointment._id || index}
                    className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderLeft: `4px solid ${status === 'CONFIRMED' ? '#10b981' : status === 'COMPLETED' ? '#6366f1' : '#f59e0b'}` }}
                  >
                    <div
                      className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white"
                      style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
                    >
                      {doctorInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{appointment.doctorName || appointment.specialty || 'Doctor consultation'}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        📅 {appointment.appointmentDate || appointment.date || 'Date pending'} · 🕐 {appointment.startTime || appointment.time || 'TBD'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold ${cfg.bg}`}>
                        {status}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ── Specialties + Profile ───────────────────── */}
        <div className="space-y-6">
          <section className="panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">🏥 Explore</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', serif" }}>
                  Top Specialties
                </h2>
              </div>
              <Link to="/doctors" className="button-secondary text-xs">Browse →</Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topSpecialties.length === 0 ? (
                <EmptyCard icon="🏥" title="No data" text="Doctor data is not available right now." />
              ) : (
                topSpecialties.map(([specialty, count], idx) => (
                  <Link to="/doctors" key={specialty} className="group rounded-2xl border border-brand-100 bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${specialtyColors[idx % specialtyColors.length]} text-lg text-white shadow-md`}>
                      {specialtyIcons[idx % specialtyIcons.length]}
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-800 group-hover:text-brand-700">{specialty}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{count} doctor{count !== 1 ? 's' : ''} available</p>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Profile Card */}
          <section className="panel p-6">
            <p className="eyebrow">👤 Your Profile</p>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
              >
                {patientInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">{patientName}</p>
                <p className="text-sm text-slate-500 truncate">{patientEmail}</p>
                <div className="mt-1 inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-600">Active</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/profile" className="button-secondary text-xs">View Profile</Link>
              <Link to="/family-profiles" className="button-secondary text-xs">Family Profiles</Link>
              <Link to="/medical-history" className="button-secondary text-xs">Medical History</Link>
            </div>
          </section>
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
    </div>
  );
}

function StatCard({ icon, label, value, color, borderColor, textColor }) {
  return (
    <div className={`rounded-2xl border ${borderColor} bg-gradient-to-br ${color} p-4 text-center transition-all hover:-translate-y-1 hover:shadow-md`}>
      <span className="text-2xl">{icon}</span>
      <p className={`mt-1 text-2xl font-black ${textColor}`}>{value}</p>
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function EmptyCard({ icon, title, text }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
        <span className="text-2xl">{icon || '📭'}</span>
      </div>
      <p className="text-sm font-bold text-slate-700">{title || 'Nothing here yet'}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}
