import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createAppointment, getBookableDoctors, getDoctorSlots, getPatientReports } from '../services/patientApi';
import {
  downloadPaymentInvoice,
  fetchPaymentById,
  fetchPaymentByOrderId,
  initiatePayment,
  submitHostedCheckout
} from '../services/platformApi';
import './Dashboard.css';

const initialFilters = {
  search: '',
  specialization: '',
  hospitalOrClinic: '',
  mode: '',
};

const initialBookingForm = {
  appointmentDate: '',
  timeSlot: '',
  mode: 'online',
  paymentOption: 'ONLINE_AFTER',
  reason: '',
};
const MIN_VISIBLE_SLOTS = 10;

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

function formatLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildAvailableDateOptions(doctor, mode) {
  if (!doctor?.availability?.length) {
    return [];
  }

  const matchingDays = new Set(
    doctor.availability
      .filter((item) => !mode || item.mode === mode)
      .map((item) => item.day),
  );

  if (!matchingDays.size) {
    return [];
  }

  const options = [];
  const today = new Date();

  for (let offset = 0; offset < 28; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(candidate);

    if (matchingDays.has(weekday)) {
      const value = formatLocalDateValue(candidate);
      options.push({
        value,
        label: formatDateLabel(value),
      });
    }
  }

  return options;
}

function parseTimeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
}

function minutesToTime(minutes) {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatTimeLabel(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatSlotLabel(startTime, endTime) {
  return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
}

function getWeekdayName(dateText) {
  if (!dateText) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${dateText}T00:00:00Z`));
}

function buildClientFallbackSlots(doctor, dateText, mode) {
  if (!doctor?.availability?.length || !dateText) {
    return [];
  }

  const weekdayName = getWeekdayName(dateText);
  const matchingAvailability = doctor.availability.filter((item) => item.day === weekdayName && item.mode === mode);

  const slots = matchingAvailability.flatMap((item) => {
    const startMinutes = parseTimeToMinutes(item.startTime);
    const endMinutes = parseTimeToMinutes(item.endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return [];
    }

    const minimumWindowEnd = startMinutes + (MIN_VISIBLE_SLOTS * 15);
    const effectiveEndMinutes = Math.max(endMinutes, minimumWindowEnd);

    const generatedSlots = [];
    for (let cursor = startMinutes; cursor + 15 <= effectiveEndMinutes; cursor += 15) {
      const slotStart = minutesToTime(cursor);
      const slotEnd = minutesToTime(cursor + 15);
      generatedSlots.push({
        value: formatSlotLabel(slotStart, slotEnd),
        label: formatSlotLabel(slotStart, slotEnd),
        disabled: false,
      });
    }

    return generatedSlots;
  });

  if (slots.length >= MIN_VISIBLE_SLOTS || slots.length === 0) {
    return slots;
  }

  const deduped = new Map(slots.map((slot) => [slot.value, slot]));
  const last = slots[slots.length - 1];
  let cursor = parseTimeToMinutes(last?.endTime || '');
  if (cursor === null) {
    return slots;
  }

  while (deduped.size < MIN_VISIBLE_SLOTS) {
    const slotStart = minutesToTime(cursor);
    const slotEnd = minutesToTime(cursor + 15);
    const value = formatSlotLabel(slotStart, slotEnd);
    deduped.set(value, {
      value,
      label: value,
      startTime: slotStart,
      endTime: slotEnd,
      disabled: false
    });
    cursor += 15;
  }

  return Array.from(deduped.values());
}

function BookAppointmentPage({ auth }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    specialization: searchParams.get('specialization') || '',
  }));
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientReports, setPatientReports] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reservedAppointment, setReservedAppointment] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentState, setPaymentState] = useState('');
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [paymentRecord, setPaymentRecord] = useState(null);
  const bookingSectionRef = useRef(null);
  const availableDateOptions = buildAvailableDateOptions(selectedDoctor, bookingForm.mode);
  const visibleSlots = useMemo(
    () =>
      slots.length
        ? slots
        : buildClientFallbackSlots(selectedDoctor, bookingForm.appointmentDate, bookingForm.mode),
    [slots, selectedDoctor, bookingForm.appointmentDate, bookingForm.mode]
  );

  useEffect(() => {
    const specialization = searchParams.get('specialization') || '';
    setFilters((current) => ({
      ...current,
      specialization,
    }));
  }, [searchParams]);

  useEffect(() => {
    const returnedOrderId = searchParams.get('order_id') || searchParams.get('orderId') || '';
    if (!returnedOrderId) {
      return;
    }

    let active = true;
    const syncReturnedPayment = async () => {
      try {
        const byOrder = await fetchPaymentByOrderId(auth, returnedOrderId);
        if (!active || !byOrder) {
          return;
        }

        const byId = byOrder?._id ? await fetchPaymentById(auth, byOrder._id).catch(() => byOrder) : byOrder;
        setPaymentOrderId(returnedOrderId);
        setPaymentRecord(byId || null);
        if (String(byOrder.status || '').toUpperCase() === 'SUCCESS') {
          setPaymentState('paid');
          setSuccess('Payment completed and appointment confirmed.');
        }
      } catch (_error) {
        // Ignore noisy callback fetch failures and rely on manual refresh actions.
      }
    };

    syncReturnedPayment();
    return () => {
      active = false;
    };
  }, [auth, searchParams]);

  useEffect(() => {
    let active = true;

    async function loadDoctors() {
      setIsDoctorsLoading(true);
      setError('');

      try {
        const response = await getBookableDoctors(auth.token, filters);
        if (!active) {
          return;
        }

        setDoctors(response.doctors || []);

        const requestedDoctorId = searchParams.get('doctorId');
        if (requestedDoctorId) {
          const matchedDoctor = (response.doctors || []).find((doctor) => String(doctor.id) === String(requestedDoctorId));
          if (matchedDoctor) {
            const nextMode = matchedDoctor.supportedModes?.[0] || 'online';
            const nextDateOptions = buildAvailableDateOptions(matchedDoctor, nextMode);

            setSelectedDoctor(matchedDoctor);
            setBookingForm((current) => ({
              ...current,
              mode: nextMode,
              paymentOption: nextMode === 'physical' ? 'PHYSICAL_ONSITE' : 'ONLINE_AFTER',
              appointmentDate: nextDateOptions[0]?.value || '',
              timeSlot: '',
              reason: '',
            }));
            setSlots([]);
            setReservedAppointment(null);
            setPaymentState('');
            setPaymentOrderId('');
            setPaymentRecord(null);
            setSuccess('');
            setError('');
          }
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setIsDoctorsLoading(false);
        }
      }
    }

    loadDoctors();

    return () => {
      active = false;
    };
  }, [auth.token, filters, searchParams]);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        const response = await getPatientReports(auth.token);
        if (active) {
          setPatientReports(response.reports || []);
        }
      } catch (_requestError) {
        if (active) {
          setPatientReports([]);
        }
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, [auth.token]);

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      if (!selectedDoctor || !bookingForm.appointmentDate) {
        setSlots([]);
        return;
      }

      setIsSlotsLoading(true);
      setError('');

      try {
        const response = await getDoctorSlots(auth.token, selectedDoctor.id, {
          date: bookingForm.appointmentDate,
          mode: bookingForm.mode,
        });

        if (!active) {
          return;
        }

        setSlots(response.slots || []);
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setIsSlotsLoading(false);
        }
      }
    }

    loadSlots();

    return () => {
      active = false;
    };
  }, [auth.token, bookingForm.appointmentDate, bookingForm.mode, selectedDoctor]);

  useEffect(() => {
    setBookingForm((current) => {
      const nextTimeSlot =
        current.timeSlot && visibleSlots.some((slot) => slot.value === current.timeSlot && !slot.disabled)
          ? current.timeSlot
          : '';

      if (current.timeSlot === nextTimeSlot) {
        return current;
      }

      return {
        ...current,
        timeSlot: nextTimeSlot,
      };
    });
  }, [visibleSlots]);

  useEffect(() => {
    if (!selectedDoctor || !bookingSectionRef.current) {
      return;
    }

    bookingSectionRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedDoctor]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleBookingChange = (event) => {
    const { name, value } = event.target;
    const nextMode = name === 'mode' ? value : bookingForm.mode;
    const normalizedPaymentOption = name === 'paymentOption'
      ? value
      : nextMode === 'physical'
        ? 'PHYSICAL_ONSITE'
        : 'ONLINE_AFTER';
    setBookingForm((current) => ({
      ...current,
      [name]: value,
      paymentOption: normalizedPaymentOption,
      ...(name === 'mode' ? { timeSlot: '' } : null),
      ...(name === 'appointmentDate' ? { timeSlot: '' } : null),
    }));
  };

  const handleSelectDoctor = (doctor) => {
    const nextMode = doctor.supportedModes?.[0] || 'online';
    const nextDateOptions = buildAvailableDateOptions(doctor, nextMode);

    setSelectedDoctor(doctor);
    setBookingForm((current) => ({
      ...current,
      mode: nextMode,
      paymentOption: nextMode === 'physical' ? 'PHYSICAL_ONSITE' : 'ONLINE_AFTER',
      appointmentDate: nextDateOptions[0]?.value || '',
      timeSlot: '',
      reason: '',
    }));
    setSlots([]);
    setReservedAppointment(null);
    setPaymentState('');
    setPaymentOrderId('');
    setPaymentRecord(null);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDoctor) {
      setError('Select a doctor first.');
      return;
    }

    if (!bookingForm.timeSlot) {
      setError('Choose an available time before reserving the appointment.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await createAppointment(auth.token, {
        doctorId: selectedDoctor.id,
        appointmentDate: bookingForm.appointmentDate,
        timeSlot: bookingForm.timeSlot,
        mode: bookingForm.mode,
        reason: bookingForm.reason,
      });

      setReservedAppointment(response.appointment);
      setPaymentState('pending');
      const paymentOption = bookingForm.paymentOption;
      const payNowSelected = paymentOption === 'ONLINE_NOW' || paymentOption === 'PHYSICAL_ONLINE_NOW';
      if (payNowSelected) {
        await handlePayNow(response.appointment);
      } else if (paymentOption === 'ONLINE_AFTER') {
        setSuccess(`Online appointment reserved with ${response.appointment.doctorName}. You can pay now from this screen or after consultation from your Appointments tab.`);
      } else {
        setSuccess(`Physical appointment reserved with ${response.appointment.doctorName}. You can pay online now or pay on-site at the clinic.`);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeSlotSelect = (slotValue) => {
    setBookingForm((current) => ({
      ...current,
      timeSlot: slotValue,
    }));
    setError('');
  };

  const handlePayNow = async (appointmentOverride = null) => {
    const targetAppointment = appointmentOverride || reservedAppointment;

    if (!targetAppointment) {
      setError('Reserve the appointment first, then proceed to payment.');
      return;
    }

    try {
      setPaymentProcessing(true);
      setError('');

      const appointmentId = targetAppointment.externalAppointmentId || targetAppointment.appointmentId || targetAppointment.id;
      const patientId = auth?.user?.id || auth?.user?._id || auth?.user?.userId;
      const doctorId = selectedDoctor?.id || targetAppointment.doctorId;
      const amount = Number(targetAppointment.fee || selectedDoctor?.consultationFee || 0);

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
        returnUrl: `${window.location.origin}/patient/appointments/book`,
        cancelUrl: `${window.location.origin}/patient/appointments/book`
      });

      const orderId = initiated?.orderId;
      if (!orderId) {
        throw new Error('Payment order was not created');
      }

      setPaymentOrderId(orderId);

      if (initiated?.checkout?.gateway === 'PAYHERE') {
        setPaymentState('pending');
        submitHostedCheckout(initiated.checkout);
        return;
      }

      throw new Error('PayHere checkout payload was not returned. Please check sandbox configuration.');
    } catch (requestError) {
      setPaymentState('failed');
      const serverMessage = requestError?.response?.data?.message || requestError?.response?.data?.error;
      setError(serverMessage || requestError.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleInvoiceDownload = async () => {
    if (!paymentRecord?._id) {
      setError('Invoice is available after successful payment confirmation.');
      return;
    }

    try {
      const invoiceUrl = await downloadPaymentInvoice(auth, paymentRecord._id);
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    } catch (requestError) {
      setError(requestError.message || 'Unable to download invoice');
    }
  };

  return (
    <div className="dashboard animate-fade-in">
      <section className="welcome-card glass">
        <div>
          <p className="eyebrow">Book appointment</p>
          <h1>Find the right doctor and reserve a slot.</h1>
          <p>Search by specialty, clinic, or consultation mode, then confirm a date and time.</p>
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Search doctors</h2>
            <p>Use filters to narrow down the best match for your visit.</p>
          </div>
        </div>

        <div className="booking-filter-grid">
          <label className="form-field">
            <span>Doctor or keyword</span>
            <input name="search" value={filters.search} onChange={handleFilterChange} placeholder="Cardiology, Dr. Silva" />
          </label>
          <label className="form-field">
            <span>Specialization</span>
            <input name="specialization" value={filters.specialization} onChange={handleFilterChange} placeholder="Dermatology" />
          </label>
          <label className="form-field">
            <span>Hospital / clinic</span>
            <input name="hospitalOrClinic" value={filters.hospitalOrClinic} onChange={handleFilterChange} placeholder="Nawaloka" />
          </label>
          <label className="form-field">
            <span>Consultation mode</span>
            <select name="mode" value={filters.mode} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="online">Online</option>
              <option value="physical">Physical</option>
            </select>
          </label>
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Available doctors</h2>
            <p>Select a doctor to continue with booking.</p>
          </div>
        </div>

        {isDoctorsLoading ? <p className="list-empty">Loading doctors...</p> : null}

        <div className="doctor-card-grid">
          {doctors.map((doctor) => (
            <article className={`doctor-card ${selectedDoctor?.id === doctor.id ? 'selected' : ''}`} key={doctor.id}>
              <div>
                <p className="role-card-kicker">{doctor.specialization}</p>
                <h3>{doctor.fullName}</h3>
                <p>{doctor.hospitalOrClinic}</p>
              </div>
              <div className="doctor-meta">
                <span>Fee: LKR {doctor.consultationFee}</span>
                <span>Next slot: {doctor.nextAvailableSlot}</span>
                <span>Modes: {(doctor.supportedModes || []).join(', ')}</span>
              </div>
              {selectedDoctor?.id === doctor.id ? <p className="doctor-selected-note">Doctor selected. Continue below.</p> : null}
              <button className="btn btn-primary small" onClick={() => handleSelectDoctor(doctor)} type="button">
                {selectedDoctor?.id === doctor.id ? 'Selected' : 'Book now'}
              </button>
            </article>
          ))}
        </div>

        {!isDoctorsLoading && !doctors.length ? <p className="list-empty">No doctors match the current filters.</p> : null}
      </section>

      {selectedDoctor ? (
        <section className="dashboard-section glass" ref={bookingSectionRef}>
          <div className="section-header">
            <div>
              <h2>Reserve appointment</h2>
              <p>
                {bookingForm.mode === 'physical'
                  ? `Pick a date and slot for ${selectedDoctor.fullName}. Reserve now and choose to pay online or at the clinic.`
                  : `Pick a date and slot for ${selectedDoctor.fullName}. Reserve now and pay online now or after the consultation.`}
              </p>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="booking-filter-grid">
              <label className="form-field">
                <span>Available date</span>
                <select
                  disabled={!selectedDoctor || !availableDateOptions.length}
                  name="appointmentDate"
                  onChange={handleBookingChange}
                  value={bookingForm.appointmentDate}
                >
                  <option value="">{availableDateOptions.length ? 'Select a date' : 'No dates for this mode'}</option>
                  {availableDateOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Appointment mode</span>
                <select
                  disabled={!selectedDoctor}
                  name="mode"
                  onChange={handleBookingChange}
                  value={bookingForm.mode}
                >
                  {(selectedDoctor?.supportedModes || ['online', 'physical']).map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === 'online' ? 'Online' : 'Physical'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Payment preference</span>
                <select
                  name="paymentOption"
                  onChange={handleBookingChange}
                  value={bookingForm.paymentOption}
                >
                  {bookingForm.mode === 'online' ? (
                    <>
                      <option value="ONLINE_AFTER">Pay after consultation</option>
                      <option value="ONLINE_NOW">Pay now (online)</option>
                    </>
                  ) : (
                    <>
                      <option value="PHYSICAL_ONSITE">Pay on-site</option>
                      <option value="PHYSICAL_ONLINE_NOW">Pay now (online)</option>
                    </>
                  )}
                </select>
              </label>
            </div>

            <div className="booking-schedule-note">
              <span>Available times</span>
              <strong>
                {isSlotsLoading
                  ? 'Loading times...'
                  : visibleSlots.length
                    ? 'Choose one 15-minute time slot'
                    : 'No available time for the selected date and mode'}
              </strong>
            </div>

            <div className="time-slot-grid">
              {visibleSlots.map((slot) => (
                <button
                  key={slot.value}
                  className={`time-slot-chip ${bookingForm.timeSlot === slot.value ? 'selected' : ''}`}
                  disabled={slot.disabled}
                  onClick={() => handleTimeSlotSelect(slot.value)}
                  type="button"
                >
                  {slot.label}
                </button>
              ))}
            </div>

            <label className="form-field">
              <span>Reason for visit</span>
              <input
                name="reason"
                onChange={handleBookingChange}
                placeholder="Short note for the consultation"
                value={bookingForm.reason}
              />
            </label>

            <div className="booking-schedule-note">
              <span>Reports shared with doctor</span>
              <strong>
                {patientReports.length
                  ? `${patientReports.length} uploaded report${patientReports.length === 1 ? '' : 's'} will be available to the doctor`
                  : 'No uploaded reports yet. You can still continue with booking.'}
              </strong>
            </div>

            {patientReports.length ? (
              <div className="list-stack">
                {patientReports.slice(0, 3).map((report) => (
                  <article className="list-card" key={report.id}>
                    <div>
                      <h3>{report.name}</h3>
                      <p>{report.reportType} · {report.hospitalOrLabName}</p>
                    </div>
                    <div className="list-meta">
                      <strong>{report.reportDateLabel}</strong>
                      <span>{report.analyzer?.summaryLabel || 'Stored for doctor review'}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="booking-actions">
              <button className="btn btn-primary" disabled={isSubmitting || !selectedDoctor} type="submit">
                {isSubmitting
                  ? 'Reserving...'
                  : 'Reserve appointment'}
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/patient/dashboard')} type="button">
                Back to dashboard
              </button>
            </div>
          </form>

          <p className="booking-hint">
            Only dates that match the doctor&apos;s available days are shown here, and the slot list updates from that schedule.
          </p>
        </section>
      ) : null}

      {reservedAppointment ? (
        <section className="dashboard-section glass">
          <div className="section-header">
            <div>
              <h2>Payment step</h2>
              <p>
                {String(reservedAppointment.mode || '').toLowerCase() === 'online'
                  ? 'Online appointment reserved. You may pay immediately or after the consultation.'
                  : 'Physical appointment reserved. You may pay online now or on-site at the clinic.'}
              </p>
            </div>
          </div>

          <div className="confirmation-grid">
            <div className="dashboard-card glass">
              <h3>Doctor</h3>
              <p className="card-value">{reservedAppointment.doctorName}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Date</h3>
              <p className="card-value">{reservedAppointment.dateLabel}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Time</h3>
              <p className="card-value">{reservedAppointment.timeSlot}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Amount to pay</h3>
              <p className="card-value">LKR {reservedAppointment.fee || 0}</p>
            </div>
          </div>

          <div className="confirmation-grid">
            <div className="dashboard-card glass">
              <h3>Mode</h3>
              <p className="card-value">{reservedAppointment.mode}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Payment status</h3>
              <p className="card-value">{paymentRecord?.status || reservedAppointment.paymentStatus}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Appointment status</h3>
              <p className="card-value">{reservedAppointment.status}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Appointment ID</h3>
              <p className="card-value">{reservedAppointment.appointmentId}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Payment Order</h3>
              <p className="card-value">{paymentOrderId || 'Pending'}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Payment ID</h3>
              <p className="card-value">{paymentRecord?._id || 'Pending'}</p>
            </div>
          </div>

          <div className="dashboard-card glass">
            <h3>Reports shared</h3>
            <p className="card-value">{reservedAppointment.sharedReports?.length || 0}</p>
          </div>

          <div className="booking-actions">
            <button className="btn btn-primary" type="button" onClick={() => handlePayNow()} disabled={paymentProcessing || paymentState === 'paid'}>
              {paymentProcessing ? 'Processing payment...' : paymentState === 'paid' ? 'Payment complete' : 'Pay online now'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate('/appointments')}>
              Manage in appointments
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/patient/dashboard')} type="button">
              View dashboard
            </button>
            <button className="btn btn-secondary" onClick={handleInvoiceDownload} type="button" disabled={!paymentRecord?._id}>
              Download invoice
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="form-message error">{error}</p> : null}
      {success ? <p className="form-message success">{success}</p> : null}
    </div>
  );
}

export default BookAppointmentPage;
