import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthPage from './pages/AuthPage';
import PatientDashboardPage from './pages/PatientDashboardPage';
import AppointmentHubPage from './pages/AppointmentHubPage';
import DoctorWorkspacePage from './pages/DoctorWorkspacePage';
import AdminConsolePage from './pages/AdminConsolePage';
import DoctorListPage from './pages/DoctorListPage';
import DoctorDetailsPage from './pages/DoctorDetailsPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import TelemedicinePage from './pages/TelemedicinePage';
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
  const navigate = useNavigate();
  const [auth, setAuth] = useState(() => getStoredAuth());

  useEffect(() => {
    syncAuthStorage(auth);
  }, [auth]);

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
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100/40">
        <Routes>
          <Route path="/" element={<Navigate replace to="/login" />} />
          <Route path="/login" element={<AuthPage mode="login" onAuth={handleAuthSuccess} />} />
          <Route path="/register" element={<AuthPage mode="register" onAuth={handleAuthSuccess} />} />
          <Route path="*" element={<Navigate replace to="/login" />} />
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
          { to: '/doctor/profile', label: 'Profile' },
          { to: '/doctors', label: 'Directory' },
          { to: '/telemedicine', label: 'Telemedicine' }
        ]}
      >
        <Routes>
          <Route path="/" element={<Navigate replace to="/doctor/dashboard" />} />
          <Route path="/login" element={<Navigate replace to="/doctor/dashboard" />} />
          <Route path="/register" element={<Navigate replace to="/doctor/dashboard" />} />
          <Route path="/doctor/dashboard" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorWorkspacePage auth={auth} role="doctor" /></ProtectedRoute>} />
          <Route path="/doctor/profile" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorProfilePage /></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorListPage /></ProtectedRoute>} />
          <Route path="/doctors/:doctorId" element={<ProtectedRoute auth={auth} allowedRoles={['doctor']}><DoctorDetailsPage /></ProtectedRoute>} />
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
        { to: '/appointments', label: 'Appointments' },
        { to: '/doctors', label: 'Doctors' },
        { to: '/telemedicine', label: 'Telemedicine' }
      ]}
    >
      <Routes>
        <Route path="/" element={<Navigate replace to="/patient/dashboard" />} />
        <Route path="/login" element={<Navigate replace to="/patient/dashboard" />} />
        <Route path="/register" element={<Navigate replace to="/patient/dashboard" />} />
        <Route path="/patient/dashboard" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><PatientDashboardPage auth={auth} onProfileSync={handleProfileSync} /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><AppointmentHubPage auth={auth} /></ProtectedRoute>} />
        <Route path="/doctors" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><DoctorListPage /></ProtectedRoute>} />
        <Route path="/doctors/:doctorId" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><DoctorDetailsPage /></ProtectedRoute>} />
        <Route path="/telemedicine" element={<ProtectedRoute auth={auth} allowedRoles={['patient']}><TelemedicinePage auth={auth} /></ProtectedRoute>} />
        <Route path="*" element={<div className="animate-fade-up rounded-3xl border border-brand-100 bg-white p-10 text-slate-600 shadow-soft">404 - Page Not Found</div>} />
      </Routes>
    </PortalShell>
  );
}

function PortalShell({ theme, title, subtitle, userLabel, onLogout, links, children }) {
  const themeStyles = {
    patient: {
      shell: 'bg-gradient-to-br from-brand-50 via-white to-brand-100/45',
      sidebar: 'bg-white text-slate-900 border-brand-100',
      accent: 'from-brand-500 to-brand-700',
      brand: 'text-brand-900',
      chip: 'bg-brand-50 border-brand-200'
    },
    doctor: {
      shell: 'bg-gradient-to-br from-brand-100/50 via-white to-brand-200/45',
      sidebar: 'bg-white text-slate-900 border-brand-100',
      accent: 'from-brand-600 to-bondi',
      brand: 'text-bondi',
      chip: 'bg-brand-50 border-brand-200'
    },
    admin: {
      shell: 'bg-gradient-to-br from-brand-100/60 via-white to-brand-300/45',
      sidebar: 'bg-white text-slate-900 border-brand-100',
      accent: 'from-bondi to-cerulean',
      brand: 'text-cerulean',
      chip: 'bg-brand-50 border-brand-200'
    }
  }[theme];

  const sidebarLinkClass = ({ isActive }) =>
    `flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isActive ? 'border-brand-200 bg-brand-50 text-slate-900 shadow-soft' : 'border-transparent text-slate-600 hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700'}`;

  return (
    <div className={`min-h-screen ${themeStyles.shell}`}>
      <div className="mx-auto grid min-h-screen w-full max-w-[1700px] gap-0 lg:grid-cols-[280px_1fr]">
        <aside className={`border-r p-5 lg:sticky lg:top-0 lg:h-screen ${themeStyles.sidebar}`}>
          <div className="flex h-full flex-col gap-6">
            <div className="rounded-[1.75rem] bg-gradient-to-br from-brand-700 via-brand-600 to-sea p-5 text-white shadow-soft">
              <div className={`inline-flex rounded-full bg-gradient-to-r ${themeStyles.accent} px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-white`}>
                {title}
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight">PrimeHealth</h2>
              <p className="mt-2 text-sm text-white/85">{subtitle}</p>
            </div>

            <nav className="space-y-2">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={sidebarLinkClass}>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className={`mt-auto rounded-[1.5rem] border p-4 ${themeStyles.chip}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.25em] ${themeStyles.brand}`}>Signed in as</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{userLabel}</p>
              <button className="button-secondary mt-4 w-full" onClick={onLogout} type="button">Logout</button>
            </div>
          </div>
        </aside>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
