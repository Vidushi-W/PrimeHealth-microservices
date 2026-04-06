import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import LandingPage from './pages/LandingPage';
import BookingPage from './pages/BookingPage';
import QueuePage from './pages/QueuePage';
import HistoryPage from './pages/HistoryPage';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/book/:doctorId" element={<BookingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/queue" element={<QueuePage />} />
        </Routes>
      </AppShell>
    </Router>
  );
};

export default App;
