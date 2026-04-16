import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import { LoginPage, RegistrationChoicePage, RegistrationPage } from './pages/AuthPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import FamilyProfilesPage from './pages/FamilyProfilesPage';
import MedicalHistoryPage from './pages/MedicalHistoryPage';
import ProfilePage from './pages/ProfilePage';
import RemindersPage from './pages/RemindersPage';
import RiskScorePage from './pages/RiskScorePage';
import RoleDashboard from './pages/RoleDashboard';
import SymptomCheckerPage from './pages/SymptomCheckerPage';
import './index.css';

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

function AppShell() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('primeHealthAuth');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (auth) {
      localStorage.setItem('primeHealthAuth', JSON.stringify(auth));
      return;
    }

    localStorage.removeItem('primeHealthAuth');
  }, [auth]);

  const handleAuthSuccess = ({ token, user }) => {
    setAuth({ token, user });
  };

  const handleProfileSync = useCallback((user) => {
    setAuth((current) => (current ? { ...current, user } : current));
  }, []);

  const handleLogout = () => {
    setAuth(null);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <nav className="navbar glass">
        <div className="navbar-brand">
          <span className="logo-dot"></span>
          PrimeHealth Connect
        </div>

        <div className="navbar-links">
          {auth?.token ? (
            <>
              <NavLink to={getDefaultRoute(auth.user?.role)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
              {auth.user?.role === 'patient' ? <NavLink to="/patient/family-profiles" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Family Profiles</NavLink> : null}
              {auth.user?.role === 'patient' ? <NavLink to="/patient/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>My Profile</NavLink> : null}
              {auth.user?.role === 'patient' ? <NavLink to="/patient/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Medical History</NavLink> : null}
              {auth.user?.role === 'patient' ? <NavLink to="/patient/reminders" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Reminders</NavLink> : null}
              {auth.user?.role === 'patient' ? <NavLink to="/patient/risk-score" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Risk Score</NavLink> : null}
              <span className="nav-user">
                <span className="nav-user-label">Signed in as</span>
                <strong>{auth.user?.fullName || auth.user?.email}</strong>
              </span>
              <button className="btn btn-secondary" onClick={handleLogout} type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary small">Register</Link>
            </>
          )}
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<Navigate replace to={auth?.token ? getDefaultRoute(auth.user?.role) : '/login'} />}
          />
          <Route
            path="/patient/dashboard"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <Dashboard auth={auth} onProfileSync={handleProfileSync} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/patient/family-profiles"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <FamilyProfilesPage auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/patient/profile"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <ProfilePage auth={auth} onProfileSync={handleProfileSync} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/patient/history"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <MedicalHistoryPage auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/patient/reminders"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <RemindersPage auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/patient/risk-score"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <RiskScorePage auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/patient/appointments/book"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <BookAppointmentPage auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/symptom-checker"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['patient']}>
                <SymptomCheckerPage auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/doctor/dashboard"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['doctor']}>
                <RoleDashboard auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/dashboard"
            element={(
              <ProtectedRoute auth={auth} allowedRoles={['admin']}>
                <RoleDashboard auth={auth} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/login"
            element={auth?.token ? <Navigate replace to={getDefaultRoute(auth.user?.role)} /> : <LoginPage onAuthSuccess={handleAuthSuccess} getDefaultRoute={getDefaultRoute} />}
          />
          <Route
            path="/register"
            element={auth?.token ? <Navigate replace to={getDefaultRoute(auth.user?.role)} /> : <RegistrationChoicePage />}
          />
          <Route
            path="/register/patient"
            element={auth?.token ? <Navigate replace to={getDefaultRoute(auth.user?.role)} /> : <RegistrationPage role="patient" onAuthSuccess={handleAuthSuccess} getDefaultRoute={getDefaultRoute} />}
          />
          <Route
            path="/register/doctor"
            element={auth?.token ? <Navigate replace to={getDefaultRoute(auth.user?.role)} /> : <RegistrationPage role="doctor" onAuthSuccess={handleAuthSuccess} getDefaultRoute={getDefaultRoute} />}
          />
          <Route path="*" element={<div className="not-found animate-fade-in">404 - Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
