import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const notifiedLiveSessionIdsRef = useRef(new Set());

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
      notifiedLiveSessionIdsRef.current = new Set(
        (Array.isArray(sessions) ? sessions : [])
          .filter((session) => hasDoctorStartedTelemedicine(session))
          .map((session) => String(session.id || ''))
          .filter(Boolean)
      );
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
        const sessionId = String(session.id || '');
        if (
          sessionId
          && hasDoctorStartedTelemedicine(session)
          && !notifiedLiveSessionIdsRef.current.has(sessionId)
        ) {
          notifiedLiveSessionIdsRef.current.add(sessionId);
          toast.success('Your doctor has started a telemedicine meeting. You can join now.');
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
            ? { ...item, ...updated }
            : item
        )
      );
      toast.success('Appointment cancelled');
    } catch (error) {
      toast.error(error.message || 'Unable to cancel appointment');
    } finally {
      setWorkingId('');
    }
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

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Appointments</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Your bookings and reminders</h1>
            <p className="mt-2 text-sm text-slate-600">
              Track status changes, upcoming reminders, and launch telemedicine calls when online visits are due.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">{upcomingCount} upcoming</span>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{visibleAppointments.length} shown</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['ACTIVE_PAID', 'ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'ONLINE', 'PENDING_PAYMENT'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setViewFilter(filter)}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${viewFilter === filter ? 'bg-brand-500 text-white' : 'bg-brand-50 text-slate-700 hover:bg-brand-100'}`}
            >
              {filter === 'ACTIVE_PAID' ? 'Active (paid)' : filter.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {loading ? <article className="panel p-5 text-sm text-slate-500">Loading appointments...</article> : null}

        {!loading && !visibleAppointments.length ? (
          <article className="panel p-6 text-sm text-slate-500">
            No appointments yet. Start by finding a doctor and reserving your first slot.
          </article>
        ) : null}

        {!loading &&
          visibleAppointments.map((appointment) => {
            const appointmentId = String(appointment.canonicalAppointmentId || appointment.externalAppointmentId || appointment.appointmentId || appointment._id || appointment.id || '');
            const status = String(appointment.status || 'PENDING').toUpperCase();
            const isOnline = String(appointment.mode || '').toLowerCase() === 'online';
            const paymentStatus = String(appointment.paymentStatus || '').toUpperCase();
            const supportsCentralActions = Boolean(appointment.externalAppointmentId || appointment.source === 'central');
            const appointmentIdCandidates = [
              appointment.localAppointmentId,
              appointment._id,
              appointment.id,
              appointment.appointmentId,
              appointment.canonicalAppointmentId,
              appointment.externalAppointmentId,
              appointmentId
            ].map((value) => String(value || '').trim()).filter(Boolean);
            const linkedSession = telemedicineSessions.find((item) =>
              appointmentIdCandidates.includes(String(item?.appointmentId || '').trim())
            ) || telemedicineByAppointment[appointmentId];
            const sessionStatus = String(linkedSession?.status || '').toLowerCase();
            const canPayAfterSession =
              isOnline
              && sessionStatus === 'completed'
              && paymentStatus !== 'PAID'
              && !['CANCELLED'].includes(status);
            const joinWindow = getJoinWindowState(appointment);
            const joinAppointmentId = String(
              appointment.canonicalAppointmentId
              || appointment.externalAppointmentId
              || linkedSession?.appointmentId
              || appointment.appointmentId
              || appointment.localAppointmentId
              || appointment._id
              || appointment.id
              || appointmentId
              || ''
            ).trim();
            const paymentReady = paymentStatus === 'PAID' || status === 'CONFIRMED';
            const joinSessionId = String(linkedSession?.id || '').trim();
            const canShowJoin = isMongoId(joinAppointmentId || linkedSession?.appointmentId)
              && isOnline
              && paymentReady
              && ['PENDING', 'CONFIRMED'].includes(status);
            const joinHref = joinSessionId
              ? `/telemedicine?sessionId=${encodeURIComponent(joinSessionId)}&appointmentId=${encodeURIComponent(joinAppointmentId)}`
              : `/telemedicine?appointmentId=${encodeURIComponent(joinAppointmentId)}`;
            const paymentTargetId = appointment.canonicalAppointmentId || appointment.externalAppointmentId || appointment.appointmentId || appointment._id || appointment.id;
            const canInitiatePayment = isMongoId(paymentTargetId);

            return (
              <article key={appointmentId} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{appointment.doctorName || 'Doctor consultation'}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDate(appointment.appointmentDate)} • {appointment.startTime || appointment.timeSlot || 'TBD'}
                    </p>
                    {appointment.reason ? <p className="mt-2 text-sm text-slate-500">Reason: {appointment.reason}</p> : null}
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(status)}`}>{status}</span>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{getReminderText(appointment)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="button-secondary" to="/doctors">
                    Find another doctor
                  </Link>
                  {supportsCentralActions && ['PENDING', 'CONFIRMED'].includes(status) ? (
                    <button
                      type="button"
                      disabled={workingId === appointmentId}
                      onClick={() => handleCancelAppointment(appointmentId)}
                      className="button-secondary"
                    >
                      Cancel appointment
                    </button>
                  ) : null}

                  {supportsCentralActions && ['PENDING', 'CONFIRMED'].includes(status) ? (
                    <button
                      type="button"
                      disabled={workingId === appointmentId}
                      onClick={() => handleFetchQueue(appointmentId)}
                      className="button-secondary"
                    >
                      View queue
                    </button>
                  ) : null}

                  {canShowJoin ? (
                    <Link
                      className="button-primary"
                      to={joinHref}
                    >
                      Join online consultation
                    </Link>
                  ) : null}

                  {canPayAfterSession && canInitiatePayment ? (
                    <button
                      type="button"
                      disabled={workingId === appointmentId}
                      onClick={() => handlePayOnline(appointment)}
                      className="button-primary"
                    >
                      {workingId === appointmentId ? 'Processing payment...' : 'Pay online now'}
                    </button>
                  ) : null}
                  {!canPayAfterSession && canInitiatePayment && paymentStatus !== 'PAID' && !['CANCELLED', 'COMPLETED'].includes(status) ? (
                    <button
                      type="button"
                      disabled={workingId === appointmentId}
                      onClick={() => handlePayOnline(appointment)}
                      className="button-secondary"
                    >
                      {workingId === appointmentId ? 'Processing payment...' : 'Pay online now'}
                    </button>
                  ) : null}
                </div>

                {queueByAppointment[appointmentId] ? (
                  <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/40 px-3 py-2 text-xs text-slate-700">
                    Queue position: {queueByAppointment[appointmentId]?.position ?? queueByAppointment[appointmentId]?.myQueueNumber ?? 'N/A'}
                    {' · '}
                    Waiting count: {queueByAppointment[appointmentId]?.waitingCount ?? queueByAppointment[appointmentId]?.peopleAheadOfMe ?? 'N/A'}
                  </div>
                ) : null}

                {isOnline ? (
                  <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/40 px-3 py-2 text-xs text-slate-700">
                    Session: {linkedSession ? sessionStatus.toUpperCase() : 'NOT CREATED'}
                    {' · '}
                    Payment: {paymentStatus || 'UNPAID'}
                    {' · '}
                    {joinWindow.label}
                  </div>
                ) : null}
              </article>
            );
          })}
      </section>
    </div>
  );
}
