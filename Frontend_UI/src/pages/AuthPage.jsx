import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { normalizeAuthResponse, signIn, signUp } from '../services/platformApi';
import { Card, Button, Input, Select, Alert } from '../components/SharedUI';
import authMarketingBg from '../assets/images/auth-marketing-bg.png';

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
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(registerInitial);
  const [errors, setErrors] = useState({});

  const isLogin = mode === 'login';

  const getApiErrorMessage = (error, fallback) => {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      fallback
    );
  };

  const defaultRoute = (role) => {
    switch (role) {
      case 'doctor':
        return '/doctor/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'patient':
      default:
        return '/patient/dashboard';
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setErrors({});
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
      const errorMsg = getApiErrorMessage(error, 'Unable to sign in');
      toast.error(errorMsg);
      setErrors({ form: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setErrors({});

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
      const errorMsg = getApiErrorMessage(error, 'Unable to register');
      toast.error(errorMsg);
      setErrors({ form: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4.75rem)] bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7fb_48%,#eef4f8_100%)] pb-8 pt-20 sm:pt-24">
      <div className="mx-auto grid min-h-[calc(100dvh-7rem)] max-w-7xl grid-cols-1 items-stretch gap-6 px-5 md:px-8 lg:grid-cols-2 lg:gap-8 lg:px-10">
        {/* Left side - Marketing container */}
        <div className="hidden h-full lg:block">
          <div className="relative h-full min-h-[520px] overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-900 shadow-[0_30px_60px_-24px_rgba(12,56,86,0.36)]">
            <img
              src={authMarketingBg}
              alt="Medical professionals in a modern clinic"
              className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-900/60 via-sea/28 to-brand-700/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/72 via-brand-900/10 to-transparent" />

            <div className="relative z-10 flex h-full items-start p-8">
              <div className="flex h-full max-w-xl flex-col text-white [text-shadow:0_3px_14px_rgba(2,6,23,0.55)]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-100/95">
                    Welcome to the future of healthcare
                  </p>
                  <h1 className="mt-6 font-serif text-[2.05rem] font-bold leading-tight tracking-tight text-white">
                    Healthcare that works for you.
                  </h1>
                </div>
                <p className="mt-auto max-w-lg text-base leading-relaxed text-white/90">
                  Secure, modern care for patients and doctors in one place.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <Card
          className="h-full border-slate-200/80 bg-white/95 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.32)] lg:min-h-[520px]"
          hoverable={false}
        >
          {/* Tab switcher */}
          <div className="mb-7 flex gap-2 rounded-xl bg-slate-100/90 p-1">
            <Link
              to="/login"
              className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                isLogin
                  ? 'bg-white text-sea shadow-sm ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                !isLogin
                  ? 'bg-white text-sea shadow-sm ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign up
            </Link>
          </div>

          {errors.form && (
            <Alert type="error" message={errors.form} className="mb-6" />
          )}

          {isLogin ? (
            <form onSubmit={submitLogin} className="space-y-5">
              <div>
                <h2 className="mb-1 font-serif text-3xl font-bold text-slate-900">Welcome back</h2>
                <p className="text-slate-600">Sign in to your PrimeHealth account</p>
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                error={errors.email}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Your password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                error={errors.password}
                required
              />

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-sea font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="space-y-5">
              <div>
                <h2 className="mb-1 font-serif text-3xl font-bold text-slate-900">Create account</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                  error={errors.fullName}
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  error={errors.email}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Create a strong password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  error={errors.password}
                  required
                />

                <Input
                  label="Phone Number"
                  placeholder="+1 (555) 000-0000"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                />

                <Select
                  label="I'm registering as"
                  options={[
                    { value: 'patient', label: 'Patient' },
                    { value: 'doctor', label: 'Doctor' }
                  ]}
                  value={registerForm.role}
                  onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                  error={errors.role}
                />
              </div>

              {registerForm.role === 'doctor' && (
                <Input
                  label="Medical Specialization"
                  placeholder="e.g., Cardiology, General Medicine"
                  value={registerForm.specialization}
                  onChange={(e) => setRegisterForm({ ...registerForm, specialization: e.target.value })}
                />
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="text-sea font-semibold hover:underline">
                  Sign in
                </Link>
              </p>

              <p className="text-center text-gray-500 text-xs">
                By registering, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
