import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTelemedicineSessions } from '../services/platformApi';
import { fetchDoctorNotifications, getDoctors } from '../services/doctorService';
import { resolveCurrentDoctor } from '../utils/currentDoctor';

function toDate(value) {
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function DoctorNotificationsPage({ auth }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const doctors = await getDoctors().catch(() => []);
      const currentDoctor = resolveCurrentDoctor(Array.isArray(doctors) ? doctors : []).doctor;
      const doctorId = currentDoctor?._id || auth?.user?.id || auth?.user?._id || auth?.user?.userId;

      const [doctorNotifications, sessions] = await Promise.all([
        doctorId ? fetchDoctorNotifications(doctorId, 40).catch(() => []) : Promise.resolve([]),
        fetchTelemedicineSessions(auth.token).catch(() => [])
      ]);

      if (!mounted) return;

      const backendNotifications = (doctorNotifications || []).map((item) => ({
        id: item.id,
        type: String(item.type || 'appointment').toLowerCase(),
        title: item.title || 'Doctor update',
        subtitle: item.subtitle || '',
        actionLabel: item.actionLabel || 'Open',
        actionTo: item.actionTo || '/doctor/appointments',
        eventTime: item.eventTime
      }));

      const teleNotifications = (sessions || [])
        .filter((session) => ['scheduled', 'live'].includes(String(session.status || '').toLowerCase()))
        .map((session) => {
          const joinedRole = String(session?.metadata?.lastJoinedRole || '').toLowerCase();
          const joinedAt = session?.metadata?.lastJoinedAt || session.scheduledStartAt;
          const patientJoined = joinedRole === 'patient';

          return {
            id: `tm-${session.id}`,
            type: 'telemedicine',
            title: patientJoined
              ? 'Patient joined telemedicine waiting room'
              : session.status === 'live'
                ? 'Live telemedicine session available'
                : 'Scheduled telemedicine session',
            subtitle: `Session ${String(session.id).slice(-6)} • ${new Date(joinedAt || Date.now()).toLocaleString()}`,
            actionLabel: 'Open telemedicine',
            actionTo: `/telemedicine?appointmentId=${encodeURIComponent(session.appointmentId || '')}`,
            eventTime: joinedAt
          };
        });

      setNotifications([...backendNotifications, ...teleNotifications]);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth]);

  const orderedNotifications = useMemo(() => {
    return [...notifications].sort((left, right) => {
      const leftTime = toDate(left.eventTime)?.getTime() || 0;
      const rightTime = toDate(right.eventTime)?.getTime() || 0;
      return rightTime - leftTime;
    });
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (typeFilter === 'ALL') return orderedNotifications;
    return orderedNotifications.filter((item) => String(item.type || '').toUpperCase() === typeFilter);
  }, [orderedNotifications, typeFilter]);

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Notifications</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Doctor alerts and updates</h1>
            <p className="mt-2 text-sm text-slate-600">Stay on top of upcoming sessions and telemedicine activities.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'APPOINTMENT', 'TELEMEDICINE'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${typeFilter === value ? 'bg-brand-500 text-white' : 'bg-brand-50 text-slate-700 hover:bg-brand-100'}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? <article className="panel p-5 text-sm text-slate-500">Loading notifications...</article> : null}

        {!loading && visibleNotifications.length === 0 ? (
          <article className="panel p-5 text-sm text-slate-500">No active notifications right now.</article>
        ) : null}

        {!loading && visibleNotifications.map((item) => (
          <article key={item.id} className="panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-600">{item.type}</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
            <div className="mt-3">
              <Link className="button-secondary" to={item.actionTo}>{item.actionLabel}</Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
