import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import LandingPage from './pages/LandingPage';
import BookingPage from './pages/BookingPage';
import QueuePage from './pages/QueuePage';
import HistoryPage from './pages/HistoryPage';
import DoctorSidebar from './components/DoctorSidebar';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorEarnings from './pages/DoctorEarnings';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Patient Routes */}
        <Route path="/*" element={
          <AppShell>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/book/:doctorId" element={<BookingPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/queue" element={<QueuePage />} />
            </Routes>
          </AppShell>
        } />

        {/* Doctor Routes */}
        <Route path="/doctor/*" element={
          <div className="layout doctor-layout">
            <DoctorSidebar />
            <main className="content">
              <header className="content-header">
                <div className="header-text">
                  <h2>Welcome back, Dr. Sarah</h2>
                  <p>You have 5 appointments scheduled for today.</p>
                </div>
                <div className="user-avatar md">SW</div>
              </header>
              <div className="page-container">
                <Routes>
                  <Route path="/" element={<DoctorDashboard />} />
                  <Route path="/earnings" element={<DoctorEarnings />} />
                  <Route path="/appointments" element={<DoctorDashboard />} /> {/* Reuse for now */}
                </Routes>
              </div>
            </main>
          </div>
        } />
      </Routes>

      <style>{`
        .doctor-layout .content-header h2 { color: #1e293b; }
        .doctor-layout .user-avatar.md { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
      `}</style>
    </Router>
  );
};

export default App;
