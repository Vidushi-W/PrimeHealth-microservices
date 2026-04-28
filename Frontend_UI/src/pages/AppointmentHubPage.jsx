import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  cancelAppointment,
  confirmStripePaymentSession,
  fetchAppointmentQueue,
  fetchAppointmentById,
  fetchPatientAppointments,
  fetchPaymentById,
  fetchPaymentByOrderId,
  fetchTelemedicineSessions,
  initiatePaymentFlow,
  startStripeCheckout
} from '../services/platformApi';
import { getMyAppointments as getPatientPortalAppointments } from '../services/patientApi';
import { Modal, Button } from '../components/SharedUI';

function normalizeStatus(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'pending_payment' || raw === 'pending') return 'PENDING';
  if (raw === 'booked' || raw === 'confirmed') return 'CONFIRMED';
  if (raw === 'cancelled') return 'CANCELLED';
  if (raw === 'completed') return 'COMPLETED';
  return String(value || 'PENDING').toUpperCase();
}

function normalizeMergedAppointment(item, source = 'central') {
  const externalId = String(item.externalAppointmentId || '').trim();
  const localId = String(item._id || item.id || item.appointmentId || '').trim();
  const canonicalId = externalId || localId;

  return {
    ...item,
    _id: localId || canonicalId,
    appointmentId: localId || canonicalId,
    canonicalAppointmentId: canonicalId,
    localAppointmentId: localId,
    externalAppointmentId: externalId,
    source,
    status: normalizeStatus(item.status),
    paymentStatus: String(item.paymentStatus || '').toUpperCase() || 'UNPAID'
  };
}

function paymentRank(value) {
  const u = String(value || '').toUpperCase();
  if (u === 'PAID') return 4;
  if (u === 'PENDING') return 2;
  if (u === 'UNPAID') return 1;
  return 0;
}

function mergePaymentTiered(a, b) {
  const A = String(a || '').toUpperCase() || 'UNPAID';
  const B = String(b || '').toUpperCase() || 'UNPAID';
  return paymentRank(A) >= paymentRank(B) ? A : B;
}

function statusRank(value) {
  const u = String(value || '').toUpperCase();
  if (u === 'COMPLETED') return 4;
  if (u === 'CONFIRMED') return 3;
  if (u === 'PENDING') return 2;
  if (u === 'CANCELLED') return 0;
  return 1;
}

function mergeStatusTiered(a, b) {
  const A = normalizeStatus(a);
  const B = normalizeStatus(b);
  // If either source says CANCELLED, honour the cancellation
  if (A === 'CANCELLED' || B === 'CANCELLED') return 'CANCELLED';
  return statusRank(A) >= statusRank(B) ? A : B;
}

function mergeAppointments(centralAppointments, portalAppointments) {
  const map = new Map();

  (Array.isArray(centralAppointments) ? centralAppointments : []).forEach((item) => {
    const normalized = normalizeMergedAppointment(item, 'central');
    if (normalized.appointmentId) {
      map.set(normalized.canonicalAppointmentId || normalized.appointmentId, normalized);
    }
  });

  (Array.isArray(portalAppointments) ? portalAppointments : []).forEach((item) => {
    const normalized = normalizeMergedAppointment(item, 'portal');
    const key = normalized.canonicalAppointmentId || normalized.appointmentId;
    if (!key) {
      return;
    }

    if (!map.has(key)) {
      map.set(key, normalized);
      return;
    }

    const existing = map.get(key);
    map.set(key, {
      ...normalized,
      ...existing,
      externalAppointmentId: existing.externalAppointmentId || normalized.externalAppointmentId,
      localAppointmentId: normalized.localAppointmentId || existing.localAppointmentId,
      canonicalAppointmentId: existing.canonicalAppointmentId || normalized.canonicalAppointmentId,
      source: existing.source || normalized.source,
      status: mergeStatusTiered(existing.status, normalized.status),
      paymentStatus: mergePaymentTiered(existing.paymentStatus, normalized.paymentStatus)
    });
  });

  return [...map.values()];
}

function formatDate(value) {
  if (!value) return 'Date pending';
  return new Date(value).toLocaleDateString();
}

function getStatusTone(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'CONFIRMED') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'PENDING') return 'bg-amber-100 text-amber-700';
  if (normalized === 'CANCELLED') return 'bg-rose-100 text-rose-700';
  if (normalized === 'COMPLETED') return 'bg-slate-200 text-slate-700';
  return 'bg-brand-100 text-brand-700';
}

function getReminderText(appointment) {
  const appointmentDate = new Date(appointment.appointmentDate || 0);
  if (Number.isNaN(appointmentDate.getTime())) return 'Schedule date unavailable';

  const now = Date.now();
  const diffMs = appointmentDate.getTime() - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) return 'Past appointment';
  if (diffHours <= 24) return 'Upcoming within 24 hours';
  if (diffHours <= 72) return 'Upcoming within 3 days';
  return 'Scheduled';
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
  const opensAt = new Date(start.getTime() - (10 * 60 * 1000));
  if (now < opensAt) {
    const diffMs = opensAt.getTime() - now.getTime();
    const minutes = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    return { canJoin: false, label: `Join opens in ${minutes} min` };
  }

  return { canJoin: true, label: 'Join available now' };
}

function isMongoId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || '').trim());
}

function hasDoctorStartedTelemedicine(session) {
  const metadata = session?.metadata || {};
  const participants = metadata.participants || {};
  return Boolean(participants?.doctor?.joinedAt)
    || Boolean(metadata.doctorHasStarted)
    || ['live', 'completed'].includes(String(session?.status || '').toLowerCase());
}

const DEFAULT_PAYMENT_AMOUNT_LKR = 2500;

export default function AppointmentHubPage({ auth }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [queueByAppointment, setQueueByAppointment] = useState({});
  const [telemedicineByAppointment, setTelemedicineByAppointment] = useState({});
  const [telemedicineSessions, setTelemedicineSessions] = useState([]);
  const [viewFilter, setViewFilter] = useState('ACTIVE_PAID');
  const [cancelTarget, setCancelTarget] = useState(null);

  const payAppointmentId = String(searchParams.get('payAppointmentId') || '').trim();
  const returnedSessionId = String(searchParams.get('session_id') || '').trim();
  const returnedOrderId = String(searchParams.get('order_id') || searchParams.get('orderId') || '').trim();

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const [centralList, portalResponse, sessions] = await Promise.all([
        fetchPatientAppointments(auth),
        getPatientPortalAppointments(auth.token).catch(() => ({ appointments: [] })),
        fetchTelemedicineSessions(auth).catch(() => [])
      ]);

      const portalList = Array.isArray(portalResponse?.appointments)
        ? portalResponse.appointments
        : [];

      setAppointments(mergeAppointments(centralList, portalList));

      const nextTelemedicineMap = {};
      (Array.isArray(sessions) ? sessions : []).forEach((session) => {
        const appointmentId = String(session.appointmentId || '').trim();
        if (appointmentId) {
          nextTelemedicineMap[appointmentId] = session;
        }
      });
      setTelemedicineSessions(Array.isArray(sessions) ? sessions : []);
      setTelemedicineByAppointment(nextTelemedicineMap);
    } catch (error) {
      toast.error(error.message || 'Unable to load appointments');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const sessions = await fetchTelemedicineSessions(auth).catch(() => []);
      const nextTelemedicineMap = {};
      (Array.isArray(sessions) ? sessions : []).forEach((session) => {
        const appointmentId = String(session.appointmentId || '').trim();
        if (appointmentId) {
          nextTelemedicineMap[appointmentId] = session;
        }
      });
      setTelemedicineSessions(Array.isArray(sessions) ? sessions : []);
      setTelemedicineByAppointment(nextTelemedicineMap);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [auth]);

  const visibleAppointments = useMemo(
    () =>
      appointments
        .filter((item) => String(item.status || '').toUpperCase() !== 'CANCELLED')
        .filter((item) => {
          const st = String(item.status || '').toUpperCase();
          const ps = String(item.paymentStatus || '').toUpperCase();
          const paid = ps === 'PAID' || st === 'CONFIRMED';

          if (viewFilter === 'ACTIVE_PAID') {
            return paid;
          }
          if (viewFilter === 'ALL') return true;
          if (viewFilter === 'ONLINE') return String(item.mode || '').toLowerCase() === 'online';
          if (viewFilter === 'PENDING_PAYMENT') return ps !== 'PAID' && st !== 'CONFIRMED';
          return st === viewFilter;
        })
        .sort((left, right) => getCreatedTimestamp(right) - getCreatedTimestamp(left)),
    [appointments, viewFilter]
  );

  useEffect(() => {
    if (!payAppointmentId || loading) {
      return;
    }

    const target = visibleAppointments.find(
      (item) => String(item.canonicalAppointmentId || item.externalAppointmentId || item.appointmentId || item._id || item.id || '').trim() === payAppointmentId
    );

    if (target) {
      toast.success('Session ended. Complete payment from this appointment card.');
    }
  }, [payAppointmentId, visibleAppointments, loading]);

  useEffect(() => {
    if (!returnedOrderId && !returnedSessionId) {
      return;
    }

    let mounted = true;
    const syncReturnedOrder = async () => {
      try {
        if (returnedSessionId) {
          await confirmStripePaymentSession(auth, returnedSessionId);
        }
        const byOrder = await fetchPaymentByOrderId(auth, returnedOrderId);
        if (!mounted || !byOrder) {
          return;
        }

        const status = String(byOrder.status || '').toUpperCase();
        const byId = byOrder?._id ? await fetchPaymentById(auth, byOrder._id).catch(() => byOrder) : byOrder;

        setAppointments((current) =>
          current.map((item) =>
            String(item.canonicalAppointmentId || item.externalAppointmentId || item.appointmentId || item._id || item.id) === String(byOrder.appointmentId)
              ? {
                ...item,
                paymentStatus: status === 'SUCCESS' ? 'PAID' : item.paymentStatus,
                paymentId: byId?._id || item.paymentId,
                status: status === 'SUCCESS' && String(item.status || '').toUpperCase() === 'PENDING'
                  ? 'CONFIRMED'
                  : item.status
              }
              : item
          )
        );

        if (status === 'SUCCESS') {
          await loadAppointments();
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete('order_id');
              next.delete('orderId');
              next.delete('session_id');
              return next;
            },
            { replace: true }
          );
          toast.success('Payment confirmed. Your paid appointment appears under Active (paid).');
        }
      } catch (_error) {
        // Ignore callback lookup failures to avoid blocking appointment list rendering.
      }
    };

    syncReturnedOrder();
    return () => {
      mounted = false;
    };
  }, [returnedOrderId, returnedSessionId, auth, loadAppointments, setSearchParams]);

  const upcomingCount = useMemo(
    () =>
      visibleAppointments.filter((item) => {
        const st = String(item.status || '').toUpperCase();
        const ps = String(item.paymentStatus || '').toUpperCase();
        const paid = ps === 'PAID' || st === 'CONFIRMED';
        return paid && ['PENDING', 'CONFIRMED'].includes(st);
      }).length,
    [visibleAppointments]
  );

  const handleCancelAppointment = async (appointmentId) => {
    try {
      setWorkingId(appointmentId);
      const updated = await cancelAppointment(auth, appointmentId);
      setAppointments((current) =>
        current.map((item) =>
          String(item.canonicalAppointmentId || item.externalAppointmentId || item.appointmentId || item._id || item.id) === appointmentId
            ? { ...item, ...updated, status: 'CANCELLED' }
            : item
        )
      );
      toast.success('Appointment cancelled successfully');
      // Reload to get fresh data from all sources
      await loadAppointments();
    } catch (error) {
      const serverMsg = error?.response?.data?.message || error.message || 'Unable to cancel appointment';
      toast.error(serverMsg);
    } finally {
      setWorkingId('');
    }
  };

  const triggerCancelConfirmation = (appointment) => {
    setCancelTarget(appointment);
  };

  const executeCancel = async () => {
    if (!cancelTarget) return;
    const id = String(cancelTarget.canonicalAppointmentId || cancelTarget.externalAppointmentId || cancelTarget.appointmentId || cancelTarget._id || cancelTarget.id || '');
    setCancelTarget(null);
    await handleCancelAppointment(id);
  };

  const handleFetchQueue = async (appointmentId) => {
    try {
      setWorkingId(appointmentId);
      const queue = await fetchAppointmentQueue(auth, appointmentId);
      setQueueByAppointment((current) => ({
        ...current,
        [appointmentId]: queue
      }));
    } catch (error) {
      toast.error(error.message || 'Unable to fetch queue status');
    } finally {
      setWorkingId('');
    }
  };

  const handlePayOnline = async (appointment) => {
    const preferredId = String(
      appointment.externalAppointmentId || appointment.appointmentId || appointment._id || appointment.id || ''
    ).trim();
    const appointmentId = isMongoId(preferredId) ? preferredId : '';
    if (!appointmentId) {
      toast.error('This appointment is not ready for online payment yet.');
      return;
    }

    try {
      setWorkingId(appointmentId);
      const patientId = auth?.user?.id || auth?.user?._id || auth?.user?.userId || appointment.patientId;
      const appointmentDetails = await fetchAppointmentById(auth, appointmentId).catch(() => null);
      const doctorId =
        appointment.doctorId
        || appointmentDetails?.doctorId
        || appointment.doctor?._id
        || appointment.doctor?.id;

      const amount = DEFAULT_PAYMENT_AMOUNT_LKR;
      if (!patientId || !doctorId) {
        throw new Error('Unable to resolve appointment details for payment. Please re-open booking and try again.');
      }

      const flow = await initiatePaymentFlow(auth, {
        appointmentId,
        patientId,
        doctorId,
        amount,
        provider: 'STRIPE',
        method: 'CREDIT_CARD',
        customer: {
          firstName: auth?.user?.fullName || auth?.user?.name || 'PrimeHealth',
          lastName: 'Patient',
          email: auth?.user?.email || 'patient@primehealth.test',
          phone: auth?.user?.phone || auth?.user?.phoneNumber || '0771234567',
          address: 'PrimeHealth',
          city: 'Colombo',
          country: 'Sri Lanka'
        },
        returnUrl: `${window.location.origin}/appointments`,
        cancelUrl: `${window.location.origin}/appointments`
      });

      if (flow.kind === 'stripe') {
        startStripeCheckout(flow.initiated.checkout);
        toast.success('Stripe checkout started. Return to this page after payment and your appointment list will refresh.');
        return;
      }
      throw new Error('Stripe checkout is unavailable. Please confirm payment-service PAYMENT_PROVIDER=STRIPE.');
    } catch (error) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
      toast.error(serverMessage || error.message || 'Unable to complete payment');
    } finally {
      setWorkingId('');
    }
  };

  const filterLabels = {
    ACTIVE_PAID: '✓ Active',
    ALL: 'All',
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    ONLINE: '🎥 Online',
    PENDING_PAYMENT: '💳 Unpaid'
  };

  const statusDot = {
    CONFIRMED: 'bg-emerald-400',
    PENDING: 'bg-amber-400',
    CANCELLED: 'bg-rose-400',
    COMPLETED: 'bg-indigo-400'
  };

  const statusLabel = {
    CONFIRMED: 'Confirmed',
    PENDING: 'Pending',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed'
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ── Hero Header ─────────────────────────────────── */}
      <section className="panel overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(11,122,117,0.06) 0%, rgba(31,138,211,0.06) 50%, rgba(216,111,69,0.04) 100%)' }} />
        <div className="relative p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="eyebrow">📋 Appointments</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900" style={{ fontFamily: "'Fraunces', serif" }}>
                Your Bookings &amp; Reminders
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                Track status changes, upcoming reminders, and launch telemedicine calls when online visits are due.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                <span className="text-2xl font-black text-emerald-600">{upcomingCount}</span>
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-500">Upcoming</span>
              </div>
              <div className="flex flex-col items-center rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3">
                <span className="text-2xl font-black text-brand-600">{visibleAppointments.length}</span>
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-500">Shown</span>
              </div>
            </div>
          </div>

          {/* ── Filter Tabs ──────────────────────────────── */}
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(filterLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewFilter(key)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  viewFilter === key
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-200'
                    : 'bg-white border border-brand-200 text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:-translate-y-0.5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Appointment Cards ───────────────────────────── */}
      <section className="space-y-4">
        {loading ? (
          <div className="panel p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
            <p className="mt-4 text-sm font-medium text-slate-400">Loading your appointments…</p>
          </div>
        ) : null}

        {!loading && !visibleAppointments.length ? (
          <div className="panel p-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
              <span className="text-4xl">📅</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Fraunces', serif" }}>No appointments yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Start by finding a doctor and reserving your first slot. We'll keep everything organized here for you.
            </p>
            <Link to="/doctors" className="button-primary mt-6 inline-flex">
              🔍 Find a Doctor
            </Link>
          </div>
        ) : null}

        {!loading &&
          visibleAppointments.map((appointment) => {
            const appointmentId = String(appointment.canonicalAppointmentId || appointment.externalAppointmentId || appointment.appointmentId || appointment._id || appointment.id || '');
            const status = String(appointment.status || 'PENDING').toUpperCase();
            const isOnline = String(appointment.mode || '').toLowerCase() === 'online';
            const paymentStatus = String(appointment.paymentStatus || '').toUpperCase();
            const supportsCentralActions = Boolean(appointment.externalAppointmentId || appointment.source === 'central');
            const appointmentIdCandidates = [
              appointment.localAppointmentId, appointment._id, appointment.id,
              appointment.appointmentId, appointment.canonicalAppointmentId,
              appointment.externalAppointmentId, appointmentId
            ].map((value) => String(value || '').trim()).filter(Boolean);
            const linkedSession = telemedicineSessions.find((item) =>
              appointmentIdCandidates.includes(String(item?.appointmentId || '').trim())
            ) || telemedicineByAppointment[appointmentId];
            const sessionStatus = String(linkedSession?.status || '').toLowerCase();
            const canPayAfterSession = isOnline && sessionStatus === 'completed' && paymentStatus !== 'PAID' && !['CANCELLED'].includes(status);
            const joinWindow = getJoinWindowState(appointment);
            const joinAppointmentId = String(
              appointment.localAppointmentId || appointment._id || appointment.id
              || appointment.appointmentId || appointment.canonicalAppointmentId
              || appointment.externalAppointmentId || appointmentId || ''
            ).trim();
            const paymentReady = paymentStatus === 'PAID' || status === 'CONFIRMED';
            const canShowJoin = isMongoId(joinAppointmentId || linkedSession?.appointmentId) && isOnline && paymentReady && ['PENDING', 'CONFIRMED'].includes(status);
            const paymentTargetId = appointment.canonicalAppointmentId || appointment.externalAppointmentId || appointment.appointmentId || appointment._id || appointment.id;
            const canInitiatePayment = isMongoId(paymentTargetId);
            const doctorInitial = (appointment.doctorName || 'D').charAt(0).toUpperCase();

            return (
              <article
                key={appointmentId}
                className="panel overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{ borderLeft: `4px solid ${status === 'CONFIRMED' ? '#10b981' : status === 'PENDING' ? '#f59e0b' : status === 'CANCELLED' ? '#ef4444' : '#6366f1'}` }}
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Doctor Avatar */}
                    <div className="flex-shrink-0">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
                      >
                        {doctorInitial}
                      </div>
                    </div>

                    {/* Doctor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 truncate">
                          {appointment.doctorName || 'Doctor consultation'}
                        </h2>
                        {isOnline && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[0.65rem] font-bold text-sky-600">
                            🎥 Online
                          </span>
                        )}
                        {!isOnline && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[0.65rem] font-bold text-amber-600">
                            🏥 In-person
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">📅 {formatDate(appointment.appointmentDate)}</span>
                        <span className="inline-flex items-center gap-1">🕐 {appointment.startTime || appointment.timeSlot || 'TBD'}</span>
                      </div>
                      {appointment.reason ? (
                        <p className="mt-2 text-sm text-slate-400 italic">"{appointment.reason}"</p>
                      ) : null}
                    </div>

                    {/* Status & Payment Badges */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusDot[status] || 'bg-slate-300'}`} />
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusTone(status)}`}>
                          {statusLabel[status] || status}
                        </span>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${
                        paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>
                        {paymentStatus === 'PAID' ? '✓ Paid' : paymentStatus === 'PENDING' ? '⏳ Payment Pending' : '○ Unpaid'}
                      </span>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-slate-400">
                        {getReminderText(appointment)}
                      </p>
                    </div>
                  </div>

                  {/* ── Info Bar (Queue / Telemedicine) ────── */}
                  {(queueByAppointment[appointmentId] || isOnline) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {queueByAppointment[appointmentId] && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                          <span>🎫</span>
                          Queue #{queueByAppointment[appointmentId]?.position ?? queueByAppointment[appointmentId]?.myQueueNumber ?? 'N/A'}
                          <span className="text-indigo-300">|</span>
                          {queueByAppointment[appointmentId]?.waitingCount ?? queueByAppointment[appointmentId]?.peopleAheadOfMe ?? '0'} ahead
                        </div>
                      )}
                      {isOnline && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-1.5 text-xs font-semibold text-brand-700">
                          <span>{linkedSession ? (sessionStatus === 'live' ? '🟢' : '📡') : '⏸️'}</span>
                          Session: {linkedSession ? sessionStatus.toUpperCase() : 'NOT CREATED'}
                          <span className="text-brand-300">|</span>
                          {joinWindow.label}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Action Buttons ────────────────────── */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <Link className="button-secondary text-xs" to="/doctors">
                      🔍 Find another doctor
                    </Link>
                    {supportsCentralActions && ['PENDING', 'CONFIRMED'].includes(status) && (
                      <button
                        type="button"
                        disabled={workingId === appointmentId}
                        onClick={() => triggerCancelConfirmation(appointment)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 hover:border-rose-300 hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        ✕ Cancel
                      </button>
                    )}
                    {supportsCentralActions && ['PENDING', 'CONFIRMED'].includes(status) && (
                      <button
                        type="button"
                        disabled={workingId === appointmentId}
                        onClick={() => handleFetchQueue(appointmentId)}
                        className="button-secondary text-xs"
                      >
                        🎫 View queue
                      </button>
                    )}
                    {canShowJoin && (
                      <Link className="button-primary text-xs" to={`/telemedicine?appointmentId=${encodeURIComponent(joinAppointmentId)}`}>
                        🎥 Join Consultation
                      </Link>
                    )}
                    {canPayAfterSession && canInitiatePayment && (
                      <button type="button" disabled={workingId === appointmentId} onClick={() => handlePayOnline(appointment)} className="button-primary text-xs">
                        {workingId === appointmentId ? '⏳ Processing…' : '💳 Pay Now'}
                      </button>
                    )}
                    {!canPayAfterSession && canInitiatePayment && paymentStatus !== 'PAID' && !['CANCELLED', 'COMPLETED'].includes(status) && (
                      <button type="button" disabled={workingId === appointmentId} onClick={() => handlePayOnline(appointment)} className="button-secondary text-xs">
                        {workingId === appointmentId ? '⏳ Processing…' : '💳 Pay online'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
      </section>

      {/* ── Cancel Confirmation Modal ───────────────────── */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Appointment"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>No, Keep it</Button>
            <Button variant="error" onClick={executeCancel}>Yes, Cancel Appointment</Button>
          </>
        }
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-slate-600">
            Are you sure you want to cancel your appointment with <strong className="text-slate-800">{cancelTarget?.doctorName || 'the doctor'}</strong> on <strong className="text-slate-800">{formatDate(cancelTarget?.appointmentDate)}</strong>?
          </p>
          <p className="mt-4 text-sm text-rose-500 font-semibold bg-rose-50 p-3 rounded-xl border border-rose-100">
            This action cannot be undone and will remove the appointment from your active list.
          </p>
        </div>
      </Modal>
    </div>
  );
}
