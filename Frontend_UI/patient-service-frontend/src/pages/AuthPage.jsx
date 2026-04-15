import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { loginUser, registerUser } from '../lib/api';

const loginFormInitialState = {
  email: '',
  password: '',
};

const patientRegisterInitialState = {
  role: 'patient',
  fullName: '',
  email: '',
  phone: '',
  password: '',
  gender: '',
  bloodGroup: '',
  dateOfBirth: '',
};

const doctorRegisterInitialState = {
  role: 'doctor',
  fullName: '',
  email: '',
  phone: '',
  password: '',
  specialization: '',
  licenseNumber: '',
  hospitalOrClinic: '',
  yearsOfExperience: '',
  consultationFee: '',
  availability: [],
};

const initialAvailabilityDraft = {
  date: '',
  startTime: '',
  endTime: '',
  mode: 'physical',
};

function getRegistrationConfig(role) {
  if (role === 'doctor') {
    return {
      title: 'Register as a doctor',
      description: 'Create your clinical account and submit your professional details for approval.',
      submitLabel: 'Create doctor account',
      successLabel: 'Doctor registration successful. Your account is awaiting approval.',
      secondaryLink: { to: '/register/patient', label: 'Register as patient instead' },
      fields: [
        { name: 'fullName', label: 'Full name', placeholder: 'Dr. Jane Doe', required: true },
        { name: 'email', label: 'Email', placeholder: 'doctor@primehealth.com', required: true, type: 'email' },
        { name: 'phone', label: 'Phone', placeholder: '0771234567' },
        { name: 'password', label: 'Password', placeholder: 'Minimum 8 characters', required: true, type: 'password' },
        { name: 'specialization', label: 'Specialization', placeholder: 'Cardiology', required: true },
        { name: 'licenseNumber', label: 'License number', placeholder: 'SLMC-45892', required: true },
        { name: 'hospitalOrClinic', label: 'Hospital or clinic', placeholder: 'PrimeHealth Medical Center', required: true },
        { name: 'yearsOfExperience', label: 'Years of experience', placeholder: '8', type: 'number', min: 0 },
        { name: 'consultationFee', label: 'Consultation fee', placeholder: '5000', type: 'number', min: 0 },
      ],
    };
  }

  return {
    title: 'Register as a patient',
    description: 'Set up your patient account so appointments, records, and profile details stay in one place.',
    submitLabel: 'Create patient account',
    successLabel: 'Patient registration successful.',
    secondaryLink: { to: '/register/doctor', label: 'Register as doctor instead' },
    fields: [
      { name: 'fullName', label: 'Full name', placeholder: 'Jane Doe', required: true },
      { name: 'email', label: 'Email', placeholder: 'jane@example.com', required: true, type: 'email' },
      { name: 'phone', label: 'Phone', placeholder: '0771234567' },
      { name: 'password', label: 'Password', placeholder: 'Minimum 8 characters', required: true, type: 'password' },
      { name: 'gender', label: 'Gender', options: ['', 'Female', 'Male', 'Other'] },
      { name: 'bloodGroup', label: 'Blood group', options: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    ],
  };
}

function FormField({ field, value, onChange }) {
  if (field.options) {
    return (
      <label className="form-field">
        <span>{field.label}</span>
        <select name={field.name} value={value} onChange={onChange} required={field.required}>
          {field.options.map((option) => (
            <option key={option || 'empty'} value={option}>
              {option || 'Select'}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="form-field">
      <span>{field.label}</span>
      <input
        min={field.min}
        name={field.name}
        onChange={onChange}
        placeholder={field.placeholder}
        required={field.required}
        type={field.type || 'text'}
        value={value}
      />
    </label>
  );
}

function RegistrationChoicePage() {
  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">PrimeHealth Access</p>
        <h1>Create the right account for your role.</h1>
        <p className="hero-copy">
          Patients and doctors share one authentication system, but registration should collect the
          right information for each workflow.
        </p>
        <div className="hero-points">
          <div className="hero-chip">Shared sign-in</div>
          <div className="hero-chip">Role-specific registration</div>
          <div className="hero-chip">No public admin signup</div>
        </div>
      </section>

      <section className="auth-panel glass">
        <div className="auth-switch">
          <Link to="/login" className="switch-link">Login</Link>
          <span className="switch-link active">Register</span>
        </div>

        <div className="auth-panel-header">
          <h2>Choose your registration path</h2>
          <p>Public signup is available for patients and doctors. Admin accounts stay protected.</p>
        </div>

        <div className="choice-grid">
          <Link className="role-card glass" to="/register/patient">
            <span className="role-card-kicker">Patient</span>
            <h3>Manage appointments, records, and profile details</h3>
            <p>Self-register with personal health information like blood group and date of birth.</p>
          </Link>

          <Link className="role-card glass" to="/register/doctor">
            <span className="role-card-kicker">Doctor</span>
            <h3>Join the clinical workflow with professional credentials</h3>
            <p>Submit specialization, license details, and clinic information for verification.</p>
          </Link>
        </div>

        <p className="auth-inline-note">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}

function RegistrationPage({ role, onAuthSuccess, getDefaultRoute }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [registerForm, setRegisterForm] = useState(
    role === 'doctor' ? doctorRegisterInitialState : patientRegisterInitialState,
  );
  const [availabilityDraft, setAvailabilityDraft] = useState(initialAvailabilityDraft);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const config = useMemo(() => getRegistrationConfig(role), [role]);
  const detailRows = [];

  for (let index = 4; index < config.fields.length; index += 2) {
    detailRows.push(config.fields.slice(index, index + 2));
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  };

  const handleAvailabilityDraftChange = (event) => {
    const { name, value } = event.target;
    setAvailabilityDraft((current) => ({ ...current, [name]: value }));
  };

  const handleAddAvailability = () => {
    if (!availabilityDraft.date || !availabilityDraft.startTime || !availabilityDraft.endTime) {
      setError('Add a date, start time, and end time for doctor availability.');
      return;
    }

    if (availabilityDraft.endTime <= availabilityDraft.startTime) {
      setError('Availability end time must be later than start time.');
      return;
    }

    setRegisterForm((current) => ({
      ...current,
      availability: [...(current.availability || []), availabilityDraft],
    }));
    setAvailabilityDraft(initialAvailabilityDraft);
    setError('');
  };

  const handleRemoveAvailability = (indexToRemove) => {
    setRegisterForm((current) => ({
      ...current,
      availability: (current.availability || []).filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const payload = {
        ...registerForm,
        yearsOfExperience: registerForm.yearsOfExperience === '' ? undefined : Number(registerForm.yearsOfExperience),
        consultationFee: registerForm.consultationFee === '' ? undefined : Number(registerForm.consultationFee),
      };

      const response = await registerUser(payload);
      onAuthSuccess(response);
      setSuccess(config.successLabel);
      navigate(location.state?.from?.pathname || getDefaultRoute(response.user?.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">PrimeHealth Access</p>
        <h1>{role === 'doctor' ? 'Professional onboarding for care teams.' : 'Simple access for every patient.'}</h1>
        <p className="hero-copy">
          {role === 'doctor'
            ? 'Doctor registration captures credentials, clinic details, and the information needed for approval.'
            : 'Patient registration stays focused on the essentials needed to personalize records and future care.'}
        </p>
        <div className="hero-points">
          <div className="hero-chip">Shared login for all roles</div>
          <div className="hero-chip">{role === 'doctor' ? 'Approval-aware onboarding' : 'Patient-ready profile setup'}</div>
          <div className="hero-chip">{role === 'doctor' ? 'Clinical identity details' : 'Health profile essentials'}</div>
        </div>
      </section>

      <section className="auth-panel glass">
        <div className="auth-switch">
          <Link to="/login" className="switch-link">Login</Link>
          <Link to="/register" className="switch-link active">Register</Link>
        </div>

        <div className="auth-panel-header">
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            {config.fields.slice(0, 2).map((field) => (
              <FormField key={field.name} field={field} value={registerForm[field.name]} onChange={handleChange} />
            ))}
          </div>

          <div className="form-row">
            {config.fields.slice(2, 4).map((field) => (
              <FormField key={field.name} field={field} value={registerForm[field.name]} onChange={handleChange} />
            ))}
          </div>

          {detailRows.map((row) => (
            <div className="form-row" key={row[0].name}>
              {row.map((field) => (
                <FormField key={field.name} field={field} value={registerForm[field.name]} onChange={handleChange} />
              ))}
              {row.length === 1 ? <div className="form-field form-field-spacer" aria-hidden="true"></div> : null}
            </div>
          ))}

          {role === 'doctor' ? (
            <section className="availability-builder">
              <div className="availability-builder-header">
                <div>
                  <h3>Add available slots</h3>
                  <p>Doctors usually set exact consultation windows that patients can book later.</p>
                </div>
              </div>

              <div className="availability-grid">
                <label className="form-field">
                  <span>Date</span>
                  <input
                    min={new Date().toISOString().slice(0, 10)}
                    name="date"
                    onChange={handleAvailabilityDraftChange}
                    type="date"
                    value={availabilityDraft.date}
                  />
                </label>

                <label className="form-field">
                  <span>Start time</span>
                  <input
                    name="startTime"
                    onChange={handleAvailabilityDraftChange}
                    type="time"
                    value={availabilityDraft.startTime}
                  />
                </label>

                <label className="form-field">
                  <span>End time</span>
                  <input
                    name="endTime"
                    onChange={handleAvailabilityDraftChange}
                    type="time"
                    value={availabilityDraft.endTime}
                  />
                </label>

                <label className="form-field">
                  <span>Mode</span>
                  <select name="mode" onChange={handleAvailabilityDraftChange} value={availabilityDraft.mode}>
                    <option value="physical">Physical</option>
                    <option value="online">Online</option>
                  </select>
                </label>
              </div>

              <button className="btn btn-secondary small" onClick={handleAddAvailability} type="button">
                Add slot
              </button>

              <div className="availability-list">
                {(registerForm.availability || []).length ? registerForm.availability.map((slot, index) => (
                  <div className="availability-chip" key={`${slot.date}-${slot.startTime}-${slot.endTime}-${index}`}>
                    <span>{slot.date} | {slot.startTime} - {slot.endTime} | {slot.mode}</span>
                    <button onClick={() => handleRemoveAvailability(index)} type="button">Remove</button>
                  </div>
                )) : (
                  <p className="auth-inline-note compact">Add at least one slot so patients can book you.</p>
                )}
              </div>
            </section>
          ) : null}

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <button className="btn btn-primary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating account...' : config.submitLabel}
          </button>
        </form>

        <div className="auth-footer-links">
          <Link to={config.secondaryLink.to}>{config.secondaryLink.label}</Link>
          <Link to="/login">Already have an account?</Link>
        </div>
      </section>
    </div>
  );
}

function LoginPage({ onAuthSuccess, getDefaultRoute }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginForm, setLoginForm] = useState(loginFormInitialState);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await loginUser(loginForm);
      onAuthSuccess(response);
      setSuccess('Login successful.');
      navigate(location.state?.from?.pathname || getDefaultRoute(response.user?.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">PrimeHealth Access</p>
        <h1>One secure login for every role.</h1>
        <p className="hero-copy">
          Patients, doctors, and admins all sign in from the same place. After authentication,
          the system routes each user to the experience that matches their role.
        </p>
        <div className="hero-points">
          <div className="hero-chip">Patient dashboard</div>
          <div className="hero-chip">Doctor dashboard</div>
          <div className="hero-chip">Admin dashboard</div>
        </div>
      </section>

      <section className="auth-panel glass">
        <div className="auth-switch">
          <span className="switch-link active">Login</span>
          <Link to="/register" className="switch-link">Register</Link>
        </div>

        <div className="auth-panel-header">
          <h2>Sign in to PrimeHealth</h2>
          <p>Use your shared account credentials to continue as a patient, doctor, or admin.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={loginForm.email}
              onChange={handleChange}
              placeholder="name@primehealth.com"
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={loginForm.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <button className="btn btn-primary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-inline-note">
          Need an account? <Link to="/register">Choose patient or doctor registration</Link>
        </p>
      </section>
    </div>
  );
}

export { LoginPage, RegistrationChoicePage, RegistrationPage };
