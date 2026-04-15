import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAppointment, getBookableDoctors, getDoctorSlots } from '../lib/api';
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
  reason: '',
};

function BookAppointmentPage({ auth }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(true);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
  }, [auth.token, filters]);

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

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleBookingChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'mode' ? { timeSlot: '' } : null),
      ...(name === 'appointmentDate' ? { timeSlot: '' } : null),
    }));
  };

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setBookingForm((current) => ({
      ...current,
      mode: doctor.supportedModes?.[0] || 'online',
      timeSlot: '',
    }));
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDoctor) {
      setError('Select a doctor first.');
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

      setSuccess(response.message || 'Appointment booked successfully.');
      navigate('/patient/dashboard');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
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
              <button className="btn btn-primary small" onClick={() => handleSelectDoctor(doctor)} type="button">
                Book now
              </button>
            </article>
          ))}
        </div>

        {!isDoctorsLoading && !doctors.length ? <p className="list-empty">No doctors match the current filters.</p> : null}
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Booking details</h2>
            <p>{selectedDoctor ? `Booking with ${selectedDoctor.fullName}` : 'Choose a doctor to continue.'}</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="booking-filter-grid">
            <label className="form-field">
              <span>Appointment date</span>
              <input
                min={new Date().toISOString().slice(0, 10)}
                name="appointmentDate"
                onChange={handleBookingChange}
                type="date"
                value={bookingForm.appointmentDate}
              />
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
              <span>Available slot</span>
              <select
                disabled={!selectedDoctor || isSlotsLoading || !bookingForm.appointmentDate}
                name="timeSlot"
                onChange={handleBookingChange}
                value={bookingForm.timeSlot}
              >
                <option value="">{isSlotsLoading ? 'Loading slots...' : 'Select a slot'}</option>
                {slots.map((slot) => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </label>
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

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <div className="booking-actions">
            <button className="btn btn-primary" disabled={isSubmitting || !selectedDoctor} type="submit">
              {isSubmitting ? 'Booking...' : 'Confirm appointment'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/patient/dashboard')} type="button">
              Back to dashboard
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default BookAppointmentPage;
