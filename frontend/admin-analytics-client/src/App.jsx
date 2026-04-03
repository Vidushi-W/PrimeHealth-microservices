import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import ServicePlaceholderPage from './pages/ServicePlaceholderPage';
import AdminAnalyticsModule from './modules/admin/AdminAnalyticsModule';

function App() {
  return (
    <BrowserRouter>
      <div className="platform-shell">
        <header className="platform-nav reveal">
          <div className="brand-block">
            <p className="eyebrow">PrimeHealth</p>
            <h2>Platform Console</h2>
          </div>
          <nav>
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/admin-analytics">Admin Analytics</NavLink>
            <NavLink to="/telemedicine">Telemedicine</NavLink>
            <NavLink to="/appointments">Appointments</NavLink>
            <NavLink to="/ai-symptom-checker">AI Symptom Checker</NavLink>
            <NavLink to="/payments">Payments</NavLink>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin-analytics" element={<AdminAnalyticsModule />} />
          <Route path="/telemedicine" element={<ServicePlaceholderPage />} />
          <Route path="/appointments" element={<ServicePlaceholderPage />} />
          <Route path="/ai-symptom-checker" element={<ServicePlaceholderPage />} />
          <Route path="/payments" element={<ServicePlaceholderPage />} />
          <Route path="/doctor-patient-services" element={<ServicePlaceholderPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
