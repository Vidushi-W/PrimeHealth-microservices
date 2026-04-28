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

import { getStoredAuth, persistAuth, fetchPatientAppointments, fetchTelemedicineSessions } from './services/platformApi';
import { getUpcomingReminders } from './services/patientApi';

import doctorPortalBackground from './assets/Dortor_Portal_Background_Image.png';

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

function parseTime(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function notificationSeenKey(user) {
  const userId = String(user?.userId || user?.id || user?._id || user?.email || 'patient').trim();
  return `primehealth:patient_notifications_seen_at:${userId}`;
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
  const [patientHasUnreadNotifications, setPatientHasUnreadNotifications] = useState(false);

  useEffect(() => {
    if (role !== 'patient') {
      setPatientHasUnreadNotifications(false);
      return undefined;
    }

    let cancelled = false;
    const seenKey = notificationSeenKey(auth?.user);

    const readSeenAt = () => Number(localStorage.getItem(seenKey) || 0);
    const writeSeenAt = (value) => localStorage.setItem(seenKey, String(value || Date.now()));

    if (!readSeenAt()) {
      writeSeenAt(Date.now());
    }

    const computeLatestNotificationTimestamp = async () => {
      const [upcomingReminders, appointments, sessions] = await Promise.all([
        getUpcomingReminders(auth.token).catch(() => ({ reminders: [] })),
        fetchPatientAppointments(auth).catch(() => []),
        fetchTelemedicineSessions(auth).catch(() => [])
      ]);

      const reminderTimes = (upcomingReminders?.reminders || []).map((item) =>
        parseTime(item?.scheduledAt || item?.createdAt)
      );
      const appointmentTimes = (appointments || []).map((item) => parseTime(item?.appointmentDate || item?.createdAt));
      const telemedicineTimes = (sessions || [])
        .filter((session) =>
          Boolean(
            session?.metadata?.participants?.doctor?.joinedAt
            || session?.metadata?.doctorHasStarted
            || ['live', 'completed'].includes(String(session?.status || '').toLowerCase())
          )
        )
        .map((session) => parseTime(session?.updatedAt || session?.createdAt));

      return Math.max(0, ...reminderTimes, ...appointmentTimes, ...telemedicineTimes);
    };

    const refreshUnread = async () => {
      if (location.pathname === '/patient/notifications') {
        writeSeenAt(Date.now());
        if (!cancelled) setPatientHasUnreadNotifications(false);
        return;
      }

      const latestTimestamp = await computeLatestNotificationTimestamp().catch(() => 0);
      const seenAt = readSeenAt();
      if (!cancelled) {
        setPatientHasUnreadNotifications(latestTimestamp > seenAt);
      }
    };

    refreshUnread();
    const interval = window.setInterval(refreshUnread, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [auth, location.pathname, role]);

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
        { to: '/patient/notifications', label: 'Notifications', showDot: patientHasUnreadNotifications },
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
        <Route path="/patient/profile" element={<Navigate replace to="/profile" />} />
        <Route path="/medical-history" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><MedicalHistoryPage auth={auth} /></ProtectedRoute>} />
        <Route path="/risk-score" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><RiskScorePage auth={auth} /></ProtectedRoute>} />
        <Route path="/patient/risk-score" element={<Navigate replace to="/risk-score" />} />
        <Route path="/reminders" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><RemindersPage auth={auth} /></ProtectedRoute>} />
        <Route path="/patient/reminders" element={<Navigate replace to="/reminders" />} />
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
      shell: 'doctor-shell bg-brand-radial',
      sidebar: 'doctor-sidebar bg-slate-900/95 text-slate-100 border-slate-800',
      accent: 'from-brand-500 to-bondi',
      brand: 'text-brand-100',
      chip: 'bg-slate-800/70 border-slate-700',
      contentShell: 'doctor-portal-shell',
      contentMain: 'doctor-portal-main',
      backgroundImage: doctorPortalBackground
    },
    admin: {
      shell: 'bg-brand-radial',
      sidebar: 'bg-slate-900/95 text-slate-100 border-slate-800',
      accent: 'from-bondi to-cerulean',
      brand: 'text-brand-100',
      chip: 'bg-slate-800/70 border-slate-700',
      contentShell: '',
      contentMain: '',
      backgroundImage: ''
    }
  }[theme];

  if (theme !== 'doctor') {
    themeStyles.contentShell = '';
    themeStyles.contentMain = '';
    themeStyles.backgroundImage = '';
  }

  const getDoctorNavIcon = (label) => {
    const iconClassName = 'h-5 w-5';

    switch (label) {
      case 'Dashboard':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        );
      case 'Appointments':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
        );
      case 'Profile':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </svg>
        );
      case 'Earnings':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M14.8 9.6c-.3-1-1.2-1.6-2.8-1.6-1.7 0-2.8.8-2.8 2 0 1.2 1.1 1.7 2.7 2 1.6.3 2.7.8 2.7 2 0 1.2-1.1 2-2.8 2-1.5 0-2.5-.5-2.9-1.6M12 6.7v10.6" />
          </svg>
        );
      case 'Notifications':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden="true">
            <path d="M15 18H5l1.4-1.4A2 2 0 0 0 7 15.2V11a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 18h-4" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
        );
      default:
        return null;
    }
  };

  const sidebarLinkClass = ({ isActive }) =>
    theme === 'doctor'
      ? `doctor-nav-link group flex items-center gap-3 rounded-[1.4rem] border px-4 py-4 text-sm font-semibold transition ${isActive ? 'border-cyan-300/20 bg-cyan-400/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'border-transparent text-slate-200/92 hover:border-white/10 hover:bg-white/8 hover:text-white'}`
      : `group flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'border-brand-300/40 bg-brand-400/15 text-white' : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'}`;

  return (
    <div className={`min-h-screen ${themeStyles.shell}`}>
      <div className={`mx-auto grid min-h-screen w-full max-w-[1740px] gap-0 ${theme === 'doctor' ? 'lg:grid-cols-[300px_1fr]' : 'lg:grid-cols-[288px_1fr]'}`}>
        <aside className={`border-r p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto ${themeStyles.sidebar}`}>
          <div className={`flex h-full min-h-0 flex-col ${theme === 'doctor' ? 'gap-4' : 'gap-6'}`}>
            <div className={`${theme === 'doctor' ? 'doctor-brand-card rounded-[2rem] border border-white/10 bg-transparent px-6 py-5 text-white shadow-none' : 'rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white'}`}>
              <div className={`inline-flex rounded-full bg-gradient-to-r ${themeStyles.accent} px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white`}>
                {title}
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight">PrimeHealth</h2>
              <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
            </div>

            <nav className={`${theme === 'doctor' ? 'space-y-2' : 'space-y-2'}`}>
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={sidebarLinkClass}>
{theme === 'doctor' ? (
  <>
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-cyan-100 transition group-hover:bg-white/10">
      {getDoctorNavIcon(link.label)}
    </span>
    <span className="flex-1 text-base font-semibold">{link.label}</span>
  </>
) : (
  <>
    <span>{link.label}</span>
    <span
      className={
        link.showDot
          ? 'h-2 w-2 rounded-full bg-rose-400'
          : 'h-1.5 w-1.5 rounded-full bg-current opacity-0 transition group-hover:opacity-50'
      }
    />
  </>
)}
                </NavLink>
              ))}
            </nav>

            <div className={`mt-auto ${theme === 'doctor' ? 'doctor-user-card rounded-[2rem] border border-white/10 p-3.5' : `rounded-2xl border p-3.5 ${themeStyles.chip}`}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.25em] ${themeStyles.brand}`}>Signed in as</p>
              <p className="mt-1.5 text-sm font-semibold text-slate-100">{userLabel}</p>
              <button className={`${theme === 'doctor' ? 'doctor-logout-button mt-4 w-full' : 'button-secondary mt-4 w-full'}`} onClick={onLogout} type="button">Logout</button>
            </div>
          </div>
        </aside>

        <div className={`relative min-w-0 overflow-hidden ${themeStyles.contentShell || ''}`}>
          {themeStyles.backgroundImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{ backgroundImage: `url(${themeStyles.backgroundImage})`, backgroundPosition: '88% center' }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(243,250,255,0.68),rgba(232,244,252,0.82)_45%,rgba(244,251,255,0.88))]"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,116,144,0.18),transparent_30%),radial-gradient(circle_at_15%_18%,rgba(255,255,255,0.5),transparent_28%)]"
                aria-hidden="true"
              />
            </>
          ) : null}

          <main className={`relative z-10 min-h-screen px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 ${themeStyles.contentMain || ''}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
