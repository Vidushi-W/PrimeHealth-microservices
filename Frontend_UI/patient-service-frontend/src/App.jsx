import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="navbar glass">
          <div className="navbar-brand">
            <span className="logo-dot"></span>
            PrimeHealth Connect
          </div>
          <div className="navbar-links">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/profile" className="nav-link">Profile</Link>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<div className="not-found animate-fade-in">404 - Page Not Found</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
