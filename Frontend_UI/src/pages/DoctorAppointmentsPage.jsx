import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchDoctorAppointments, updateAppointmentStatus } from '../services/platformApi';

function formatDate(value) {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString();
}

function resolvePatientDisplayName(item) {
  return item?.patientName || item?.patient?.name || item?.patient?.fullName || 'Unknown patient';
}

function getCreatedTimestamp(appointment) {
  const candidate =
    appointment?.createdAt
    || appointment?.created_at
    || appointment?.updatedAt
    || appointment?.updated_at
    || appointment?.appointmentDate
    || 0;
  const time = new Date(candidate).getTime();
  return Number.isFinite(time) ? time : 0;
}

function parseTimeTokenTo24Hour(timeToken, meridiemToken = '') {
  const raw = String(timeToken || '').trim();
  const [hoursText, minutesText] = raw.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return '';
  }

  const meridiem = String(meridiemToken || '').trim().toUpperCase();
  if (meridiem === 'AM' || meridiem === 'PM') {
    const normalizedHours = meridiem === 'PM'
      ? (hours % 12) + 12
      : (hours % 12);
    return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function resolveStartTimeText(appointment) {
  const directStart = String(appointment.startTime || '').trim();
  if (directStart) {
    return directStart.slice(0, 5);
  }

  const slotText = String(appointment.timeSlot || '').trim();
  const match = slotText.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
  if (!match) {
    return '';
  }

  return parseTimeTokenTo24Hour(match[1], match[2]);
}

function resolveAppointmentStartTime(appointment) {
  const dateText = String(appointment.appointmentDate || '').slice(0, 10);
  const timeText = resolveStartTimeText(appointment);
  if (!dateText || !timeText) return null;
  const start = new Date(`${dateText}T${timeText}:00`);
  return Number.isNaN(start.getTime()) ? null : start;
}

function getJoinWindowState(appointment) {
  const start = resolveAppointmentStartTime(appointment);
  if (!start) return { canJoin: false, label: 'Schedule unavailable' };

  const now = new Date();
  const opensAt = new Date(start.getTime() - (60 * 60 * 1000));
  if (now < opensAt) {
    const diffMs = opensAt.getTime() - now.getTime();
    const minutes = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    return { canJoin: false, label: `Join opens in ${minutes} min` };
  }

  return { canJoin: true, label: 'Join available now' };
}

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const STATUS_FILTER_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED'];

const PAYMENT_SCOPE_OPTIONS = [
  { id: 'PAID', label: 'Paid (active)' },
  { id: 'NOT_PAID', label: 'Awaiting payment' },
  { id: 'ALL', label: 'All payments' },
];

export default function DoctorAppointmentsPage({ auth }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentScope, setPaymentScope] = useState('PAID');
  const [updatingId, setUpdatingId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const params = {
          status: statusFilter,
          page: 1,
          limit: 200,
        };
        if (paymentScope === 'PAID') {
          params.paymentStatus = 'PAID';
        }
        const list = await fetchDoctorAppointments(auth, params);
        if (!mounted) return;
        setAppointments(Array.isArray(list) ? list : []);
      } catch (error) {
        toast.error(error.message || 'Unable to load doctor appointments');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth, statusFilter, paymentScope]);

  const filteredAppointments = useMemo(() => {
    let rows = appointments
      .filter((item) => String(item.status || '').toUpperCase() !== 'CANCELLED')
      .sort((left, right) => getCreatedTimestamp(right) - getCreatedTimestamp(left));

    if (paymentScope === 'NOT_PAID') {
      rows = rows.filter((item) => {
        const ps = String(item.paymentStatus || '').toUpperCase();
        const st = String(item.status || '').toUpperCase();
        return ps !== 'PAID' && st !== 'CONFIRMED';
      });
    }

    return rows;
  }, [appointments, paymentScope]);

  const visibleAppointments = useMemo(() => {
    if (!search.trim()) return filteredAppointments;
    const term = search.toLowerCase();
    return filteredAppointments.filter((item) => {
      const text = [
        resolvePatientDisplayName(item),
        item.reason,
        item.status,
        item.startTime,
        item.endTime
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(term);
    });
  }, [filteredAppointments, search]);

  const handleStatusChange = async (appointment, nextStatus) => {
    try {
      setUpdatingId(String(appointment._id || appointment.id));
      const updated = await updateAppointmentStatus(auth, appointment._id || appointment.id, nextStatus);
      const updatedId = String(updated?._id || updated?.id || appointment._id || appointment.id);

      setAppointments((current) => {
        const merged = current.map((item) =>
          String(item._id || item.id) === updatedId ? { ...item, ...updated } : item
        );

        // Keep active tab accurate without waiting for the next fetch cycle.
        if (statusFilter !== 'ALL' && String(nextStatus).toUpperCase() !== statusFilter) {
          return merged.filter((item) => String(item._id || item.id) !== updatedId);
        }

        return merged;
      });
      toast.success(`Appointment marked ${nextStatus.toLowerCase()}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update appointment status');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Appointments</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Manage scheduled sessions</h1>
            <p className="mt-2 text-sm text-slate-600">Update statuses and join online consultations directly from this tab.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTER_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${statusFilter === status ? 'bg-brand-500 text-white' : 'bg-brand-50 text-slate-700 hover:bg-brand-100'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PAYMENT_SCOPE_OPTIONS.map((scope) => (
              <button
                key={scope.id}
                type="button"
                onClick={() => setPaymentScope(scope.id)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${paymentScope === scope.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <input
            className="input max-w-sm"
            placeholder="Search patient, reason, or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <article className="panel p-5 text-sm text-slate-500">Loading appointments...</article>
        ) : null}

        {!loading && visibleAppointments.length === 0 ? (
          <article className="panel p-5 text-sm text-slate-500">No appointments match this filter.</article>
        ) : null}

        {!loading && visibleAppointments.map((item) => {
          const appointmentId = String(item._id || item.id);
          const currentStatus = String(item.status || 'PENDING').toUpperCase();
          const joinWindow = getJoinWindowState(item);
          const paymentStatus = String(item.paymentStatus || '').toUpperCase();
          const paymentReady = paymentStatus === 'PAID' || currentStatus === 'CONFIRMED';

          return (
            <article key={appointmentId} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Appointment #{appointmentId.slice(-6)}</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Patient {resolvePatientDisplayName(item)}</h2>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(item.appointmentDate)} • {item.startTime || 'TBD'} - {item.endTime || 'TBD'}</p>
                  {item.reason ? <p className="mt-2 text-sm text-slate-500">Reason: {item.reason}</p> : null}
                  <p className="mt-2 text-xs font-semibold text-slate-600">Payment: {paymentStatus || 'UNPAID'}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{currentStatus}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_FLOW.filter((status) => status !== currentStatus).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={updatingId === appointmentId}
                    onClick={() => handleStatusChange(item, status)}
                    className="button-secondary"
                  >
                    Mark {status.toLowerCase()}
                  </button>
                ))}
                {(item.mode || '').toLowerCase() === 'online' && paymentReady ? (
                  <Link className="button-primary" to={`/telemedicine?appointmentId=${encodeURIComponent(appointmentId)}`}>Join telemedicine</Link>
                ) : null}
              </div>
              {(item.mode || '').toLowerCase() === 'online' ? (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {paymentReady ? joinWindow.label : 'Complete payment before joining video.'}
                </p>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
