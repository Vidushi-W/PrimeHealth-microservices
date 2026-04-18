import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  cancelAppointment,
  fetchAppointmentQueue,
  fetchAppointmentById,
  fetchDoctorById,
  fetchPatientAppointments,
  fetchPaymentById,
  fetchPaymentByOrderId,
  fetchTelemedicineSessions,
  initiatePayment,
  submitHostedCheckout
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
    _id: canonicalId,
    appointmentId: canonicalId,
    localAppointmentId: localId,
    externalAppointmentId: externalId,
    source,
    status: normalizeStatus(item.status),
    paymentStatus: String(item.paymentStatus || '').toUpperCase() || 'UNPAID'
  };
}

function mergeAppointments(centralAppointments, portalAppointments) {
  const map = new Map();

  (Array.isArray(centralAppointments) ? centralAppointments : []).forEach((item) => {
    const normalized = normalizeMergedAppointment(item, 'central');
    if (normalized.appointmentId) {
      map.set(normalized.appointmentId, normalized);
    }
  });

  (Array.isArray(portalAppointments) ? portalAppointments : []).forEach((item) => {
    const normalized = normalizeMergedAppointment(item, 'portal');
    const key = normalized.appointmentId;
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
      source: existing.source || normalized.source,
      status: normalizeStatus(existing.status || normalized.status),
      paymentStatus: String(existing.paymentStatus || normalized.paymentStatus || 'UNPAID').toUpperCase()
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
  const opensAt = new Date(start.getTime() - (60 * 60 * 1000));
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
const DEFAULT_PAYMENT_AMOUNT_LKR = 2500;

export default function AppointmentHubPage({ auth }) {
  const [searchParams] = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [queueByAppointment, setQueueByAppointment] = useState({});
  const [telemedicineByAppointment, setTelemedicineByAppointment] = useState({});
  const [viewFilter, setViewFilter] = useState('ALL');

  const payAppointmentId = String(searchParams.get('payAppointmentId') || '').trim();
  const returnedOrderId = String(searchParams.get('order_id') || searchParams.get('orderId') || '').trim();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [centralList, portalResponse, sessions] = await Promise.all([
          fetchPatientAppointments(auth),
          getPatientPortalAppointments(auth.token).catch(() => ({ appointments: [] })),
          fetchTelemedicineSessions(auth).catch(() => [])
        ]);
        if (!mounted) return;

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
        setTelemedicineByAppointment(nextTelemedicineMap);
      } catch (error) {
        toast.error(error.message || 'Unable to load appointments');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth]);

  const visibleAppointments = useMemo(
    () =>
      appointments
        .filter((item) => String(item.status || '').toUpperCase() !== 'CANCELLED')
        .filter((item) => {
          if (viewFilter === 'ALL') return true;
          if (viewFilter === 'ONLINE') return String(item.mode || '').toLowerCase() === 'online';
          if (viewFilter === 'PENDING_PAYMENT') return String(item.paymentStatus || '').toUpperCase() !== 'PAID';
          return String(item.status || '').toUpperCase() === viewFilter;
        })
        .sort((left, right) => getCreatedTimestamp(right) - getCreatedTimestamp(left)),
    [appointments, viewFilter]
  );

  useEffect(() => {
    if (!payAppointmentId || loading) {
      return;
    }

    const target = visibleAppointments.find(
      (item) => String(item._id || item.id || item.appointmentId || '').trim() === payAppointmentId
    );

    if (target) {
      toast.success('Session ended. Complete payment from this appointment card.');
    }
  }, [payAppointmentId, visibleAppointments, loading]);

  useEffect(() => {
    if (!returnedOrderId) {
      return;
    }

    let mounted = true;
    const syncReturnedOrder = async () => {
      try {
        const byOrder = await fetchPaymentByOrderId(auth, returnedOrderId);
        if (!mounted || !byOrder) {
          return;
        }

        const status = String(byOrder.status || '').toUpperCase();
        const byId = byOrder?._id ? await fetchPaymentById(auth, byOrder._id).catch(() => byOrder) : byOrder;

        setAppointments((current) =>
          current.map((item) =>
            String(item._id || item.id || item.appointmentId) === String(byOrder.appointmentId)
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
          toast.success('Payment completed successfully.');
        }
      } catch (_error) {
        // Ignore callback lookup failures to avoid blocking appointment list rendering.
      }
    };

    syncReturnedOrder();
    return () => {
      mounted = false;
    };
  }, [returnedOrderId, auth]);

  const upcomingCount = useMemo(
    () =>
      visibleAppointments.filter((item) => ['PENDING', 'CONFIRMED'].includes(String(item.status || '').toUpperCase())).length,
    [visibleAppointments]
  );

  const handleCancelAppointment = async (appointmentId) => {
    try {
      setWorkingId(appointmentId);
      const updated = await cancelAppointment(auth, appointmentId);
      setAppointments((current) =>
        current.map((item) =>
          String(item._id || item.id || item.appointmentId) === appointmentId ? { ...item, ...updated } : item
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

      let amount = Number(
        appointment.fee
        || appointment.consultationFee
        || appointment.amount
        || appointment.paymentAmount
        || appointmentDetails?.consultationFee
        || 0
      );

      if (amount <= 0 && doctorId) {
        const doctor = await fetchDoctorById(doctorId).catch(() => null);
        amount = Number(doctor?.consultationFee || 0);
      }

      if (amount <= 0) {
        amount = DEFAULT_PAYMENT_AMOUNT_LKR;
      }
      if (!patientId || !doctorId) {
        throw new Error('Unable to resolve appointment details for payment. Please re-open booking and try again.');
      }

      const initiated = await initiatePayment(auth, {
        appointmentId,
        patientId,
        doctorId,
        amount,
        provider: 'PAYHERE',
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

      const orderId = initiated?.orderId;
      if (!orderId) {
        throw new Error('Payment order was not created');
      }

      if (initiated?.checkout?.gateway === 'PAYHERE') {
        submitHostedCheckout(initiated.checkout);
        return;
      }

      throw new Error('PayHere checkout payload was not returned. Please check sandbox configuration.');
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
            <Link className="button-primary" to="/patient/appointments/book">
              Book new appointment
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'ONLINE', 'PENDING_PAYMENT'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setViewFilter(filter)}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${viewFilter === filter ? 'bg-brand-500 text-white' : 'bg-brand-50 text-slate-700 hover:bg-brand-100'}`}
            >
              {filter.replace('_', ' ')}
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
            const appointmentId = String(appointment._id || appointment.id || appointment.appointmentId || '');
            const status = String(appointment.status || 'PENDING').toUpperCase();
            const isOnline = String(appointment.mode || '').toLowerCase() === 'online';
            const paymentStatus = String(appointment.paymentStatus || '').toUpperCase();
            const supportsCentralActions = Boolean(appointment.externalAppointmentId || appointment.source === 'central');
            const linkedSession = telemedicineByAppointment[appointmentId];
            const sessionStatus = String(linkedSession?.status || '').toLowerCase();
            const canPayAfterSession =
              isOnline
              && sessionStatus === 'completed'
              && paymentStatus !== 'PAID'
              && !['CANCELLED'].includes(status);
            const joinWindow = getJoinWindowState(appointment);
            const joinAppointmentId = String(appointment.externalAppointmentId || appointmentId || '').trim();
            const canShowJoin = isMongoId(joinAppointmentId)
              && isOnline
              && ['PENDING', 'CONFIRMED'].includes(status)
              && joinWindow.canJoin;
            const paymentTargetId = appointment.externalAppointmentId || appointment.appointmentId || appointment._id || appointment.id;
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
                    <Link className="button-primary" to={`/telemedicine?appointmentId=${encodeURIComponent(joinAppointmentId)}`}>
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
                    Queue position: {queueByAppointment[appointmentId]?.position ?? 'N/A'}
                    {' · '}
                    Waiting count: {queueByAppointment[appointmentId]?.waitingCount ?? 'N/A'}
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
