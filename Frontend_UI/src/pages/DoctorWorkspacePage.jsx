import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDoctorAppointments,
  fetchDoctorPrescriptions,
  fetchTelemedicineSessions
} from '../services/platformApi';

export default function DoctorWorkspacePage({ auth }) {
  const [appointments, setAppointments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  const doctorKeys = useMemo(
    () =>
      [
        auth?.user?.id,
        auth?.user?._id,
        auth?.user?.userId,
        auth?.user?.uniqueId,
        auth?.user?.email
      ]
        .filter(Boolean)
        .map((value) => String(value)),
    [auth?.user]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const doctorIdForPrescription = auth?.user?.id || auth?.user?._id || auth?.user?.userId;

      const [appointmentList, sessionList, prescriptionList] = await Promise.all([
        fetchDoctorAppointments(auth).catch(() => []),
        fetchTelemedicineSessions(auth.token).catch(() => []),
        fetchDoctorPrescriptions(auth.token, doctorIdForPrescription).catch(() => [])
      ]);

      if (!mounted) return;
      setAppointments(Array.isArray(appointmentList) ? appointmentList : []);
      setSessions(Array.isArray(sessionList) ? sessionList : []);
      setPrescriptions(Array.isArray(prescriptionList) ? prescriptionList : []);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth]);

  const doctorAppointments = useMemo(() => {
    const filtered = appointments.filter((item) => {
      const doctorId = String(item?.doctorId || item?.doctor?._id || item?.doctor?.id || '');
      return doctorKeys.includes(doctorId);
    });

    return filtered.length ? filtered : appointments;
  }, [appointments, doctorKeys]);

  const doctorSessions = useMemo(() => {
    const filtered = sessions.filter((item) => {
      const doctorId = String(item?.doctorId || item?.doctor?._id || item?.doctor?.id || '');
      return doctorKeys.includes(doctorId);
    });

    return filtered.length ? filtered : sessions;
  }, [sessions, doctorKeys]);

  const liveSessionCount = useMemo(
    () => doctorSessions.filter((item) => item?.status === 'live').length,
    [doctorSessions]
  );

  return (
    <div className="space-y-7 animate-fade-up">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-soft">
        <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-600">Doctor workspace</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Welcome Dr. {auth.user?.fullName || auth.user?.name || 'Doctor'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Manage availability, review appointment load, and start virtual consultations with a patient-centric workflow.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="button-primary" to="/doctors">Doctor directory tools</Link>
              <Link className="button-secondary" to="/telemedicine">Open telemedicine</Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] bg-brand-50 p-6 text-slate-900 shadow-soft sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <DoctorMetric label="Appointments" value={String(doctorAppointments.length)} />
            <DoctorMetric label="Live sessions" value={String(liveSessionCount)} />
            <DoctorMetric label="Prescriptions" value={String(prescriptions.length)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <ActionCard
          title="Manage profile"
          description="Update specialization, experience, and credentials."
          action="Open profile"
          to="/doctor/profile"
        />
        <ActionCard
          title="Update availability"
          description="Generate slots and manage status for patient bookings."
          action="Open scheduler"
          to="/doctors"
        />
        <ActionCard
          title="Start telemedicine"
          description="Launch secure Jitsi sessions and live patient chat."
          action="Open sessions"
          to="/telemedicine"
        />
      </section>
    </div>
  );
}

function ActionCard({ title, description, action, to }) {
  return (
    <Link to={to} className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-soft transition hover:-translate-y-1 hover:border-brand-200 hover:bg-white">
      <p className="text-lg font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <p className="mt-5 text-sm font-semibold text-brand-700">{action} →</p>
    </Link>
  );
}

function DoctorMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
