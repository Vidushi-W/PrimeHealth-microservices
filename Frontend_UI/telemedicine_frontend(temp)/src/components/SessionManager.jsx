import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5003';

export default function SessionManager({ user, authToken, onSessionSelect }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [filter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : undefined;
      
      const response = await axios.get(`${API_BASE_URL}/telemedicine/sessions`, {
        params,
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setSessions(response?.data?.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load sessions: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/telemedicine/sessions/${sessionId}/start`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const updatedSession = response?.data?.data;
      const updated = sessions.map((s) => (s.id === sessionId ? updatedSession : s));
      setSessions(updated);
      
      const session = updated.find((s) => s.id === sessionId);
      onSessionSelect(session);
    } catch (err) {
      setError('Failed to start session: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleJoinSession = (session) => {
    if (session.status === 'live' || session.status === 'scheduled' || session.status === 'completed') {
      onSessionSelect(session);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && sessions.length === 0) {
    return <div className="loading">Loading sessions...</div>;
  }

  return (
    <div className="sessions-container">
      <div className="sessions-header">
        <h2>My Consultations</h2>
        <div className="filter-controls">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'scheduled' ? 'active' : ''} 
            onClick={() => setFilter('scheduled')}
          >
            Scheduled
          </button>
          <button 
            className={filter === 'live' ? 'active' : ''} 
            onClick={() => setFilter('live')}
          >
            Active
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''} 
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No sessions found</p>
          <small>Sessions will appear here once scheduled</small>
        </div>
      ) : (
        sessions.map(session => (
          <div key={session.id} className="session-card">
            <div className="session-header">
              <div className="session-doctor">
                {user.role === 'patient' 
                  ? `Doctor ID: ${session.doctorId}`
                  : `Patient ID: ${session.patientId}`
                }
              </div>
              <span className={`session-status ${session.status}`}>
                {session.status}
              </span>
            </div>

            <div className="session-details">
              <div className="session-detail">
                <strong>Scheduled Time</strong>
                {formatTime(session.scheduledStartAt)}
              </div>
              <div className="session-detail">
                <strong>Duration</strong>
                {session.startedAt && session.endedAt ? 'Completed' : 'Not started'}
              </div>
              {session.appointmentId && (
                <div className="session-detail">
                  <strong>Appointment ID</strong>
                  {session.appointmentId}
                </div>
              )}
            </div>

            <div className="session-actions">
              {session.status === 'scheduled' && user.role === 'doctor' && (
                <button 
                  className="btn-primary" 
                  onClick={() => handleStartSession(session.id)}
                >
                  Start Consultation
                </button>
              )}
              {session.status === 'live' && (
                <button 
                  className="btn-primary" 
                  onClick={() => handleJoinSession(session)}
                >
                  Join Consultation
                </button>
              )}
              {session.status === 'completed' && (
                <button 
                  className="btn-secondary" 
                  onClick={() => handleJoinSession(session)}
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
