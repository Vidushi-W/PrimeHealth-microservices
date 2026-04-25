import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StarRating from './StarRating';
import { API_BASE_DOCTOR } from '../config/apiBase';
import { createAppointment, getDoctorSlots } from '../services/patientApi';
import { initiatePaymentFlow, startStripeCheckout } from '../services/platformApi';

/** Matches payment-service `body('appointmentId').isMongoId()` and avoids a bad central sync id. */
function isMongoId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || '').trim());
}

/** PayHere initiate requires amount > 0; directory doctors may have fee unset in dev. */
const DEFAULT_PAYMENT_AMOUNT_LKR = 2500;

function formatApiError(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Request failed';
  const details = data.data;
  if (Array.isArray(details) && details.length) {
    const first = details.find((row) => row?.msg || row?.message) || details[0];
    const detailMsg = first?.msg || first?.message;
    if (detailMsg) return detailMsg;
  }
  return data.message || error.message || 'Request failed';
}

function formatLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateText) {
  const parsed = new Date(`${dateText}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/** Build date options from doctor-service shape: availability[].day + slots[].status */
function buildDateOptionsFromDirectoryDoctor(doctor) {
  const avail = doctor?.availability || [];
  const daysWithOpen = new Set(
    avail
      .filter((d) => (d.slots || []).some((s) => String(s.status || '').toLowerCase() === 'available'))
      .map((d) => d.day),
  );
  if (!daysWithOpen.size) return [];

  const options = [];
  const today = new Date();
  for (let offset = 0; offset < 28; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(candidate);
    if (daysWithOpen.has(weekday)) {
      const value = formatLocalDateValue(candidate);
      options.push({ value, label: formatDateLabel(value) });
    }
  }
  return options;
}

function getDoctorImageSrc(doctor) {
  const picture = doctor?.profilePicture || doctor?.profileImage || '';
  if (!picture) return '';
  if (picture.startsWith('http://') || picture.startsWith('https://')) return picture;
  const base = API_BASE_DOCTOR.replace(/\/+$/, '');
  const path = picture.startsWith('/') ? picture : `/${picture}`;
  return `${base}${path}`;
}

export default function FindDoctorBookModal({ auth, doctor, open, onClose }) {
  const doctorId = doctor ? String(doctor._id || doctor.id || '') : '';
  const [mode, setMode] = useState('online');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [reason, setReason] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);

  const dateOptions = useMemo(() => (doctor ? buildDateOptionsFromDirectoryDoctor(doctor) : []), [doctor]);

  useEffect(() => {
    if (!open || !doctor) return;
    setMode('online');
    setAppointmentDate(dateOptions[0]?.value || '');
    setTimeSlot('');
    setReason('');
    setSlots([]);
  }, [open, doctor, dateOptions]);

  useEffect(() => {
    if (!open || !doctorId || !appointmentDate || !auth?.token) {
      setSlots([]);
      return;
    }

    let active = true;
    (async () => {
      try {
        setSlotsLoading(true);
        const response = await getDoctorSlots(auth.token, doctorId, { date: appointmentDate, mode });
        if (!active) return;
        setSlots(response.slots || []);
      } catch (e) {
        if (active) {
          toast.error(e.message || 'Could not load time slots');
          setSlots([]);
        }
      } finally {
        if (active) setSlotsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, doctorId, appointmentDate, mode, auth?.token]);

  useEffect(() => {
    setTimeSlot((current) => {
      if (current && slots.some((s) => s.value === current && !s.disabled)) return current;
      return '';
    });
  }, [slots]);

  if (!open || !doctor) return null;

  const runBookAndPayment = async () => {
    if (!doctorId) {
      toast.error('Invalid doctor');
      return;
    }
    if (!appointmentDate || !timeSlot) {
      toast.error('Choose a date and time slot');
      return;
    }

    try {
      setSubmitting(true);
      const response = await createAppointment(auth.token, {
        doctorId,
        appointmentDate,
        timeSlot,
        mode,
        reason: reason.trim(),
      });

      const appt = response.appointment;
      if (!appt) {
        throw new Error('No appointment returned');
      }

      const ext = String(appt.externalAppointmentId || '').trim();
      const localApptId = String(appt.appointmentId || appt.id || '').trim();
      const appointmentId = isMongoId(ext) ? ext : localApptId;
      if (!isMongoId(appointmentId)) {
        throw new Error('Booking reference is invalid. Try again or contact support.');
      }

      const patientId = String(
        auth?.user?.userId || auth?.user?.id || auth?.user?._id || localStorage.getItem('primehealth:userId') || '',
      ).trim();
      if (!patientId) {
        throw new Error('Patient ID missing. Please sign out and sign in again.');
      }

      let amount = Number(appt.fee || doctor.consultationFee || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        amount = DEFAULT_PAYMENT_AMOUNT_LKR;
      }

      setPaying(true);
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
          country: 'Sri Lanka',
        },
        returnUrl: `${window.location.origin}/appointments`,
        cancelUrl: `${window.location.origin}/appointments`,
      });

      if (flow.kind === 'stripe') {
        startStripeCheckout(flow.initiated.checkout);
        onClose();
        toast.success(
          'Stripe checkout started. Complete payment and you will return to Appointments with the booking updated.',
        );
        return;
      }

      throw new Error('Stripe checkout is unavailable. Please confirm payment-service PAYMENT_PROVIDER=STRIPE.');
    } catch (e) {
      toast.error(formatApiError(e) || 'Booking or payment failed');
    } finally {
      setSubmitting(false);
      setPaying(false);
    }
  };

  const handleBookAndPay = (event) => {
    event.preventDefault();
    runBookAndPayment();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <img
              src={getDoctorImageSrc(doctor) || 'https://placehold.co/80x80?text=Dr'}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl border border-brand-100 object-cover"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{doctor.specialization || 'Specialist'}</p>
              <h2 className="text-lg font-bold text-slate-900">{doctor.name || 'Doctor'}</h2>
              <p className="text-sm text-slate-600">{doctor.hospitalOrClinic || 'PrimeHealth'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Rating</span>
                <StarRating value={doctor.ratingAverage} size="sm" showValue reviewCount={doctor.ratingCount} />
              </div>
            </div>
          </div>
          <button type="button" className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleBookAndPay}>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Consultation type</span>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="online">Online</option>
              <option value="physical">In person</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Date</span>
            <select
              className="input"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            >
              <option value="">Select date</option>
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Available time</span>
            <select
              className="input"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              required
              disabled={slotsLoading || !appointmentDate}
            >
              <option value="">{slotsLoading ? 'Loading times…' : 'Select a time slot'}</option>
              {slots.map((slot) => (
                <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                  {slot.label || slot.value}
                  {slot.disabled ? ' (taken)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Reason (optional)</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for visit" />
          </label>

          <p className="text-xs text-slate-500">
            Consultation fee (LKR):{' '}
            <strong>
              {Number(doctor.consultationFee || 0) > 0
                ? Number(doctor.consultationFee || 0)
                : `${DEFAULT_PAYMENT_AMOUNT_LKR} (default)`}
            </strong>
            .{' '}
            {'You complete checkout on Stripe; your booking is updated when you return.'}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={submitting || paying}>
              {submitting || paying ? 'Processing…' : 'Book & pay now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
