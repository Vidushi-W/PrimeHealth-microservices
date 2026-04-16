import { useState, useEffect } from 'react';
import SessionManager from './components/SessionManager';
import VideoConsultation from './components/VideoConsultation';
import ChatWindow from './components/ChatWindow';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5003';

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) throw new Error('Invalid token format');
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(atob(padded));
}

function createDemoToken(user) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: user.userId,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
  };

  const toBase64Url = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${toBase64Url(header)}.${toBase64Url(payload)}.demo-signature`;
}

function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || null);
  const [user, setUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [view, setView] = useState('sessions'); // sessions, consultation, profile

  useEffect(() => {
    if (authToken) {
      try {
        const decoded = decodeJwtPayload(authToken);
        setUser(decoded);
      } catch (err) {
        console.error('Invalid token');
        setAuthToken(null);
      }
    }
  }, [authToken]);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    setView('sessions');
  };

  if (!authToken) {
    return <LoginScreen onLogin={setAuthToken} />;
  }

  return (
    <div className="app-container">
      <Header user={user} onLogout={handleLogout} />
      
      <nav className="nav-tabs">
        <button 
          className={view === 'sessions' ? 'active' : ''} 
          onClick={() => setView('sessions')}
        >
          Sessions
        </button>
        {activeSession && (
          <button 
            className={view === 'consultation' ? 'active' : ''} 
            onClick={() => setView('consultation')}
          >
            Consultation
          </button>
        )}
        <button 
          className={view === 'profile' ? 'active' : ''} 
          onClick={() => setView('profile')}
        >
          Profile
        </button>
      </nav>

      <main className="main-content">
        {view === 'sessions' && (
          <SessionManager 
            user={user} 
            authToken={authToken}
            onSessionSelect={(session) => {
              setActiveSession(session);
              setView('consultation');
            }}
          />
        )}
        {view === 'consultation' && activeSession && (
          <ConsultationView 
            session={activeSession} 
            user={user} 
            authToken={authToken}
            onBack={() => setView('sessions')}
          />
        )}
        {view === 'profile' && (
          <ProfileView user={user} authToken={authToken} />
        )}
      </main>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="logo">PrimeHealth Telemedicine</h1>
        <div className="header-actions">
          <span className="user-name">{user?.name || 'User'}</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        const token = data?.token || data?.data?.token;
        if (!token) throw new Error('Login response did not include token');
        localStorage.setItem('authToken', token);
        onLogin(token);
        return;
      }

      if (email === 'patient@primehealth.com' && password === 'password123') {
        const token = createDemoToken({
          userId: 'demo-patient-1',
          role: 'patient',
          email,
          name: 'Demo Patient'
        });
        localStorage.setItem('authToken', token);
        onLogin(token);
        return;
      }

      if (email === 'doctor@primehealth.com' && password === 'password123') {
        const token = createDemoToken({
          userId: 'demo-doctor-1',
          role: 'doctor',
          email,
          name: 'Demo Doctor'
        });
        localStorage.setItem('authToken', token);
        onLogin(token);
        return;
      }

      throw new Error('Login failed');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>PrimeHealth Telemedicine</h2>
        <p>Online Medical Consultations</p>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="demo-info">
          Demo credentials: patient@primehealth.com / password123
        </p>
      </div>
    </div>
  );
}

function ConsultationView({ session, user, authToken, onBack }) {
  const [activeTab, setActiveTab] = useState('video');

  return (
    <div className="consultation-view">
      <button className="btn-back" onClick={onBack}>← Back to Sessions</button>
      
      <div className="consultation-header">
        <h2>Consultation Session</h2>
        <p className="session-time">
          {new Date(session.scheduledStartAt || session.scheduledAt || Date.now()).toLocaleString()}
        </p>
      </div>

      <div className="consultation-tabs">
        <button 
          className={activeTab === 'video' ? 'active' : ''} 
          onClick={() => setActiveTab('video')}
        >
          Video Call
        </button>
        <button 
          className={activeTab === 'chat' ? 'active' : ''} 
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
      </div>

      <div className="consultation-content">
        {activeTab === 'video' && (
          <VideoConsultation 
            sessionId={session.id || session._id} 
            authToken={authToken}
          />
        )}
        {activeTab === 'chat' && (
          <ChatWindow 
            sessionId={session.id || session._id} 
            authToken={authToken}
            userId={user?.userId || user?._id}
          />
        )}
      </div>
    </div>
  );
}

function ProfileView({ user, authToken }) {
  return (
    <div className="profile-view">
      <h2>My Profile</h2>
      <div className="profile-card">
        <div className="profile-field">
          <label>Name</label>
          <p>{user?.name}</p>
        </div>
        <div className="profile-field">
          <label>Email</label>
          <p>{user?.email}</p>
        </div>
        <div className="profile-field">
          <label>Role</label>
          <p>{user?.role === 'doctor' ? 'Healthcare Provider' : 'Patient'}</p>
        </div>
        {user?.role === 'doctor' && (
          <>
            <div className="profile-field">
              <label>Specialization</label>
              <p>{user?.specialization || 'N/A'}</p>
            </div>
            <div className="profile-field">
              <label>License Number</label>
              <p>{user?.licenseNumber || 'N/A'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
