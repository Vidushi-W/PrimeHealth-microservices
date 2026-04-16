import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { normalizeAuthResponse, signIn, signUp } from '../services/platformApi';

const registerInitial = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'patient',
  specialization: ''
};

export default function AuthPage({ mode = 'login', onAuth }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', role: 'patient' });
  const [registerForm, setRegisterForm] = useState(registerInitial);

  const isLogin = mode === 'login';

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = await signIn(loginForm);
      const auth = normalizeAuthResponse(payload);

      if (!auth.token || !auth.user) {
        throw new Error('Invalid auth response');
      }

      onAuth(auth);
      toast.success('Welcome back to PrimeHealth');
      navigate(defaultRoute(auth.user.role), { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to sign in'));
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();

    if (registerForm.role === 'admin') {
      toast.error('Admin registration is disabled. Please contact a system administrator.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...registerForm,
        yearsOfExperience: registerForm.role === 'doctor' ? 2 : undefined
      };
      const response = await signUp(payload);
      let auth = normalizeAuthResponse(response);

      // Register endpoint may not return a token; perform a login with the same credentials.
      if (!auth.token || !auth.user) {
        const loginResponse = await signIn({
          email: registerForm.email,
          password: registerForm.password,
          role: registerForm.role
        });
        auth = normalizeAuthResponse(loginResponse);
      }

      if (!auth.token || !auth.user) {
        throw new Error('Registration succeeded but login token is missing');
      }

      onAuth(auth);
      toast.success('Account created successfully');
      navigate(defaultRoute(auth.user.role), { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to register'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[72vh] gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative overflow-hidden rounded-[2rem] border border-brand-100 bg-gradient-to-br from-white via-brand-50/50 to-white p-8 text-slate-900 shadow-soft lg:p-12">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-200/55 blur-3xl" />
        <div className="absolute -bottom-20 right-4 h-64 w-64 rounded-full bg-sea/20 blur-3xl" />

        <div className="relative space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-700">PrimeHealth</p>
          <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Intelligent care journeys for every patient.
          </h1>
          <p className="max-w-lg text-base leading-7 text-slate-600">
            Book appointments, attend secure telemedicine sessions, share reports, and receive digital prescriptions across one connected healthcare experience.
          </p>

          <div className="grid gap-3 pt-4 sm:grid-cols-2">
            <Feature label="Patients" text="Find specialists, book visits, and manage records" />
            <Feature label="Doctors" text="Control availability and deliver virtual care" />
            <Feature label="Admins" text="Verify providers and monitor platform operations" />
            <Feature label="AI Support" text="Optional symptom insights and smart triage" />
          </div>
        </div>
      </section>

      <section className="glass rounded-[2rem] p-6 sm:p-8">
        <div className="mb-6 flex gap-2 rounded-full bg-brand-50 p-1.5">
          <Link
            to="/login"
            className={`w-full rounded-full px-4 py-2 text-center text-sm font-semibold transition ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'}`}
          >
            Login
          </Link>
          <Link
            to="/register"
            className={`w-full rounded-full px-4 py-2 text-center text-sm font-semibold transition ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'}`}
          >
            Register
          </Link>
        </div>

        {isLogin ? (
          <form className="space-y-4" onSubmit={submitLogin}>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Sign in</h2>
            <p className="text-sm text-slate-500">Access your patient, doctor, or admin workspace.</p>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">Email</span>
              <input
                className="input"
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">Password</span>
              <input
                className="input"
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">Role</span>
              <select
                className="input"
                value={loginForm.role}
                onChange={(event) => setLoginForm((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <button className="button-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={submitRegister}>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Create account</h2>
            <p className="text-sm text-slate-500">Get started as a patient or doctor.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Full name</span>
                <input
                  className="input"
                  value={registerForm.fullName}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                  required
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Email</span>
                <input
                  className="input"
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Password</span>
                <input
                  className="input"
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Phone</span>
                <input
                  className="input"
                  value={registerForm.phone}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Role</span>
                <select
                  className="input"
                  value={registerForm.role}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Specialization</span>
                <input
                  className="input"
                  value={registerForm.specialization}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, specialization: event.target.value }))}
                  placeholder="Only needed for doctors"
                />
              </label>
            </div>

            <button className="button-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function Feature({ label, text }) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-700">{label}</p>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function defaultRoute(role) {
  if (role === 'doctor') return '/doctor/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/patient/dashboard';
}
