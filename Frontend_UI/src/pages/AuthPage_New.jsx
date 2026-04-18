import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { normalizeAuthResponse, signIn, signUp } from '../services/platformApi';
import Navigation from '../components/Navigation';
import { Card, Button, Input, Select, Alert } from '../components/SharedUI';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Navigation />

      <div className="pt-20 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto px-6 md:px-8 lg:px-12 min-h-screen items-center">
        {/* Left side - Brand message */}
        <div className="hidden lg:flex flex-col justify-center items-start gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-200 mb-6">
              <span className="w-2 h-2 bg-sea rounded-full" />
              <span className="text-sm font-medium text-brand-700">Secure & Trusted</span>
            </div>

            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Healthcare that works for you.
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Whether you're a patient seeking quality care or a doctor managing your practice, PrimeHealth connects you to better healthcare experiences.
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-4 w-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Instant Booking</p>
                <p className="text-gray-600 text-sm">Book appointments in seconds</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-2xl">✓</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Video Consultations</p>
                <p className="text-gray-600 text-sm">Secure telemedicine from home</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 text-2xl">✓</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Safe & Encrypted</p>
                <p className="text-gray-600 text-sm">Bank-level security for your data</p>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-semibold mb-4">Trusted by</p>
            <div className="flex gap-3 flex-wrap">
              <div className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold">
                250K+ Users
              </div>
              <div className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold">
                HIPAA Compliant
              </div>
              <div className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold">
                ISO 27001
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <Card className="shadow-hover border-gray-300">
          {/* Tab switcher */}
          <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-lg">
            <Link
              to="/login"
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-center transition-all duration-300 ${
                isLogin
                  ? 'bg-white text-sea shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-center transition-all duration-300 ${
                !isLogin
                  ? 'bg-white text-sea shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Register
            </Link>
          </div>

          {errors.form && (
            <Alert type="error" message={errors.form} className="mb-6" />
          )}

          {isLogin ? (
            <form onSubmit={submitLogin} className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to your PrimeHealth account</p>
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
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <p className="text-center text-gray-600 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-sea font-semibold hover:underline">
                  Create one
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
                <p className="text-gray-600">Join thousands of users on PrimeHealth</p>
              </div>

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
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              <p className="text-center text-gray-600 text-sm">
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
