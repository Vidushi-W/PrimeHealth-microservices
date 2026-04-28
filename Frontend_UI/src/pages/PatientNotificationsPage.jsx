import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUpcomingReminders } from '../services/patientApi';
import { fetchPatientAppointments } from '../services/platformApi';

function parseTime(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export default function PatientNotificationsPage({ auth }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const [upcomingReminders, appointments] = await Promise.all([
        getUpcomingReminders(auth.token).catch(() => ({ reminders: [] })),
        fetchPatientAppointments(auth).catch(() => [])
      ]);

      if (!mounted) return;

      const reminderItems = (upcomingReminders?.reminders || []).map((reminder) => ({
        id: `rem-${reminder._id || reminder.id}`,
        category: 'Reminder',
        title: reminder.title || 'Medication reminder',
        detail: `${reminder.scheduledAt ? new Date(reminder.scheduledAt).toLocaleString() : 'Upcoming'}`,
        actionLabel: 'Open reminders',
        actionTo: '/reminders',
        eventTime: reminder.scheduledAt || reminder.createdAt
      }));

      const appointmentItems = (appointments || [])
        .filter((appointment) => {
          const status = String(appointment.status || '').toUpperCase();
          return status === 'PENDING' || status === 'CONFIRMED';
        })
        .map((appointment) => ({
          id: `appt-${appointment._id || appointment.id}`,
          category: 'Appointment',
          title: `Upcoming visit with ${appointment.doctorName || 'your doctor'}`,
          detail: `${new Date(appointment.appointmentDate || Date.now()).toLocaleDateString()} • ${appointment.startTime || 'TBD'}`,
          actionLabel: (appointment.mode || '').toLowerCase() === 'online' ? 'Join telemedicine' : 'View appointments',
          actionTo: (appointment.mode || '').toLowerCase() === 'online' ? '/telemedicine' : '/appointments',
          eventTime: appointment.appointmentDate
        }));

      setItems([...reminderItems, ...appointmentItems]);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth]);

  const ordered = useMemo(
    () => [...items].sort((left, right) => parseTime(right.eventTime) - parseTime(left.eventTime)),
    [items]
  );

  const visibleItems = useMemo(() => {
    if (categoryFilter === 'ALL') return ordered;
    return ordered.filter((item) => String(item.category || '').toUpperCase() === categoryFilter);
  }, [ordered, categoryFilter]);

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Notifications</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Reminders and appointment alerts</h1>
            <p className="mt-2 text-sm text-slate-600">Track upcoming reminders and healthcare actions from one feed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'REMINDER', 'APPOINTMENT'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategoryFilter(value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${categoryFilter === value ? 'bg-brand-500 text-white' : 'bg-brand-50 text-slate-700 hover:bg-brand-100'}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? <article className="panel p-5 text-sm text-slate-500">Loading notifications...</article> : null}
        {!loading && !visibleItems.length ? (
          <article className="panel p-5 text-sm text-slate-500">No notifications right now.</article>
        ) : null}

        {!loading && visibleItems.map((item) => (
          <article key={item.id} className="panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-600">{item.category}</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
            <div className="mt-3">
              <Link className="button-secondary" to={item.actionTo}>{item.actionLabel}</Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
