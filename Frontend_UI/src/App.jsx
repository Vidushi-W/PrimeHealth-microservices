import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navigation from './components/Navigation';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import PatientDashboardPage from './pages/PatientDashboardPage';
import AppointmentHubPage from './pages/AppointmentHubPage';
import DoctorWorkspacePage from './pages/DoctorWorkspacePage';
import AdminConsolePage from './pages/AdminConsolePage';
import DoctorListPage from './pages/DoctorListPage';
import DoctorDetailsPage from './pages/DoctorDetailsPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import DoctorEarningsPage from './pages/DoctorEarningsPage';
import DoctorAppointmentsPage from './pages/DoctorAppointmentsPage';
import DoctorNotificationsPage from './pages/DoctorNotificationsPage';
import TelemedicinePage from './pages/TelemedicinePage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import ProfilePage from './pages/ProfilePage';
import RiskScorePage from './pages/RiskScorePage';
import RemindersPage from './pages/RemindersPage';
import SymptomCheckerPage from './pages/SymptomCheckerPage';
import FamilyProfilesPage from './pages/FamilyProfilesPage';
import PatientInsightsPage from './pages/PatientInsightsPage';
import MedicalHistoryPage from './pages/MedicalHistoryPage';
import PatientNotificationsPage from './pages/PatientNotificationsPage';
import { getStoredAuth, persistAuth } from './services/platformApi';

function getDefaultRoute(role) {
  switch (role) {
    case 'doctor':
      return '/doctor/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'patient':
    default:
      return '/patient/dashboard';
  }
}

function ProtectedRoute({ auth, allowedRoles, children }) {
  const location = useLocation();

  if (!auth?.token) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(auth.user?.role)) {
    return <Navigate replace to={getDefaultRoute(auth.user?.role)} />;
  }

  return children;
}

function syncAuthStorage(auth) {
  persistAuth(auth);
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [auth, setAuth] = useState(() => getStoredAuth());

  useEffect(() => {
    syncAuthStorage(auth);
  }, [auth]);

  useEffect(() => {
    if (!location.hash) return;

    const targetId = decodeURIComponent(location.hash.replace('#', ''));
    if (!targetId) return;

    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    window.requestAnimationFrame(() => {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.hash, location.pathname]);

  const handleAuthSuccess = (response) => {
    const token = response?.token || response?.data?.token || response?.accessToken || '';
    const user = response?.user || response?.data?.user || response?.profile || response || {};

    if (!token) {
      toast.error('Login succeeded, but no token was returned.');
      return;
    }

    setAuth({ token, user });
  };

  const handleProfileSync = useCallback((user) => {
    setAuth((current) => (current ? { ...current, user } : current));
  }, []);

  const handleLogout = () => {
    setAuth(null);
    navigate('/login');
  };

  const role = auth?.user?.role;

  if (!auth?.token) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage mode="login" onAuth={handleAuthSuccess} />} />
          <Route path="/login" element={<AuthPage mode="login" onAuth={handleAuthSuccess} />} />
          <Route path="/register" element={<AuthPage mode="register" onAuth={handleAuthSuccess} />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </div>
    );
  }

  if (role === 'admin') {
    return (
      <PortalShell
        theme="admin"
        title="Admin Console"
        subtitle="Govern platform operations"
        userLabel={auth.user?.fullName || auth.user?.name || auth.user?.email || 'Administrator'}
        onLogout={handleLogout}
        links={[
          { to: '/admin/dashboard', label: 'Dashboard' },
          { to: '/admin/dashboard?tab=doctors', label: 'Doctors' },
          { to: '/admin/dashboard?tab=patients', label: 'Patients' },
          { to: '/admin/dashboard?tab=appointments', label: 'Appointments' },
          { to: '/admin/dashboard?tab=finance', label: 'Finance' }
        ]}
      >
        <Routes>
          <Route path="/" element={<Navigate replace to="/admin/dashboard" />} />
          <Route path="/login" element={<Navigate replace to="/admin/dashboard" />} />
          <Route path="/register" element={<Navigate replace to="/admin/dashboard" />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute auth={auth} allowedRoles={['admin']}><AdminConsolePage auth={auth} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate replace to="/admin/dashboard" />} />
        </Routes>
      </PortalShell>
    );
  }

  if (role === 'doctor') {
    return (
      <PortalShell
        theme="doctor"
        title="Doctor Portal"
        subtitle="Clinical workspace"
        userLabel={auth.user?.fullName || auth.user?.name || auth.user?.email || 'Doctor'}
        onLogout={handleLogout}
        links={[
          { to: '/doctor/dashboard', label: 'Dashboard' },
          { to: '/doctor/appointments', label: 'Appointments' },
          { to: '/doctor/profile', label: 'Profile' },
          { to: '/doctor/earnings', label: 'Earnings' },
          { to: '/doctor/notifications', label: 'Notifications' }
        ]}
      >
        <Routes>
          <Route path="/" element={<Navigate replace to="/doctor/dashboard" />} />
          <Route path="/login" element={<Navigate replace to="/doctor/dashboard" />} />
          <Route path="/register" element={<Navigate replace to="/doctor/dashboard" />} />
          <Route path="/doctor/dashboard" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorWorkspacePage auth={auth} role="doctor" /></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorAppointmentsPage auth={auth} /></ProtectedRoute>} />
          <Route path="/doctor/profile" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorProfilePage auth={auth} /></ProtectedRoute>} />
          <Route path="/doctor/earnings" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorEarningsPage auth={auth} /></ProtectedRoute>} />
          <Route path="/doctor/notifications" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorNotificationsPage auth={auth} /></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorListPage auth={auth} /></ProtectedRoute>} />
          <Route path="/doctors/:doctorId" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorDetailsPage auth={auth} /></ProtectedRoute>} />
          <Route path="/telemedicine" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><TelemedicinePage auth={auth} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate replace to="/doctor/dashboard" />} />
        </Routes>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      theme="patient"
      title="Patient Portal"
      subtitle="Personal care workspace"
      userLabel={auth.user?.fullName || auth.user?.name || auth.user?.email || 'PrimeHealth user'}
      onLogout={handleLogout}
      links={[
        { to: '/patient/dashboard', label: 'Dashboard' },
        { to: '/doctors', label: 'Find a Doctor' },
        { to: '/appointments', label: 'Appointments' },
        { to: '/patient/notifications', label: 'Notifications' },
        { to: '/profile', label: 'Profile' },
        { to: '/family-profiles', label: 'Family Profile' }
      ]}
    >
      <Routes>
        <Route path="/" element={<Navigate replace to="/patient/dashboard" />} />
        <Route path="/login" element={<Navigate replace to="/patient/dashboard" />} />
        <Route path="/register" element={<Navigate replace to="/patient/dashboard" />} />
        <Route path="/patient/dashboard" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><PatientInsightsPage auth={auth} onProfileSync={handleProfileSync} /></ProtectedRoute>} />
        <Route path="/patient/appointments/book" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><BookAppointmentPage auth={auth} /></ProtectedRoute>} />
        <Route path="/patient/notifications" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><PatientNotificationsPage auth={auth} /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><AppointmentHubPage auth={auth} /></ProtectedRoute>} />
        <Route path="/doctors" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><DoctorListPage auth={auth} /></ProtectedRoute>} />
        <Route path="/doctors/:doctorId" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><DoctorDetailsPage auth={auth} /></ProtectedRoute>} />
        <Route path="/telemedicine" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><TelemedicinePage auth={auth} /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><ProfilePage auth={auth} onProfileSync={handleProfileSync} /></ProtectedRoute>} />
        <Route path="/medical-history" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><MedicalHistoryPage auth={auth} /></ProtectedRoute>} />
        <Route path="/risk-score" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><RiskScorePage auth={auth} /></ProtectedRoute>} />
        <Route path="/reminders" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><RemindersPage auth={auth} /></ProtectedRoute>} />
        <Route path="/symptom-checker" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><SymptomCheckerPage auth={auth} /></ProtectedRoute>} />
        <Route path="/family-profiles" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><FamilyProfilesPage auth={auth} /></ProtectedRoute>} />
        <Route path="/health-risk-analyzer" element={<Navigate replace to="/risk-score" />} />
        <Route path="*" element={<div className="animate-fade-up rounded-3xl border border-brand-100 bg-white p-10 text-slate-600 shadow-soft">404 - Page Not Found</div>} />
      </Routes>
    </PortalShell>
  );
}

function PortalShell({ theme, title, subtitle, userLabel, onLogout, links, children }) {
  const themeStyles = {
    patient: {
      shell: 'bg-brand-radial',
      sidebar: 'bg-slate-900/95 text-slate-100 border-slate-800',
      accent: 'from-brand-400 to-brand-600',
      brand: 'text-brand-100',
      chip: 'bg-slate-800/70 border-slate-700'
    },
    doctor: {
      shell: 'bg-brand-radial',
      sidebar: 'bg-slate-900/95 text-slate-100 border-slate-800',
      accent: 'from-brand-500 to-bondi',
      brand: 'text-brand-100',
      chip: 'bg-slate-800/70 border-slate-700'
    },
    admin: {
      shell: 'bg-brand-radial',
      sidebar: 'bg-slate-900/95 text-slate-100 border-slate-800',
      accent: 'from-bondi to-cerulean',
      brand: 'text-brand-100',
      chip: 'bg-slate-800/70 border-slate-700'
    }
  }[theme];

  const sidebarLinkClass = ({ isActive }) =>
    `group flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'border-brand-300/40 bg-brand-400/15 text-white' : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'}`;

  return (
    <div className={`min-h-screen ${themeStyles.shell}`}>
      <div className="mx-auto grid min-h-screen w-full max-w-[1740px] gap-0 lg:grid-cols-[288px_1fr]">
        <aside className={`border-r p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto ${themeStyles.sidebar}`}>
          <div className="flex h-full min-h-0 flex-col gap-6">
            <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
              <div className={`inline-flex rounded-full bg-gradient-to-r ${themeStyles.accent} px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white`}>
                {title}
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight">PrimeHealth</h2>
              <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
            </div>

            <nav className="space-y-2">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={sidebarLinkClass}>
                  <span>{link.label}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-0 transition group-hover:opacity-50" />
                </NavLink>
              ))}
            </nav>

            <div className={`mt-auto rounded-2xl border p-3.5 ${themeStyles.chip}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.25em] ${themeStyles.brand}`}>Signed in as</p>
              <p className="mt-1.5 text-sm font-semibold text-slate-100">{userLabel}</p>
              <button className="button-secondary mt-4 w-full" onClick={onLogout} type="button">Logout</button>
            </div>
          </div>
        </aside>

        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
