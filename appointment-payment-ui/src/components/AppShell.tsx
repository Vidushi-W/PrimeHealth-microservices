import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, CreditCard, Clock, Activity, LogOut } from 'lucide-react';
import '../styles/globals.css';

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
        }
    >
        {icon}
        <span>{label}</span>
    </NavLink>
);

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="layout">
            <nav className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <Activity size={28} />
                        <h1>SmartHealth</h1>
                    </div>

                    <div className="nav-group">
                        <NavItem to="/" icon={<Calendar size={20} />} label="Appointments" />
                        <NavItem to="/history" icon={<CreditCard size={20} />} label="Payments" />
                        <NavItem to="/queue" icon={<Clock size={20} />} label="Live Queue" />
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="logout-btn">
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </nav>

            <main className="content">
                <header className="content-header">
                    <div className="header-text">
                        <h2>Hello, Alex</h2>
                        <p>Manage your health appointments effectively.</p>
                    </div>
                    <div className="user-avatar">
                        AM
                    </div>
                </header>

                <div className="page-container">
                    {children}
                </div>
            </main>

            <style>{`
        .layout { display: flex; min-h: 100vh; background: var(--background); }
        .sidebar {
          width: 280px;
          height: 100vh;
          position: fixed;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem 1.75rem;
          z-index: 100;
        }
        .logo { 
          display: flex; 
          align-items: center; 
          gap: 1rem; 
          color: var(--primary); 
          margin-bottom: 3.5rem;
        }
        .logo h1 { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.05em; background: var(--grad-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-group { display: flex; flex-direction: column; gap: 0.75rem; }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: 1rem;
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 700;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-item:hover { background: rgba(37, 99, 235, 0.05); color: var(--primary); transform: translateX(4px); }
        .nav-item.active { 
          background: var(--grad-primary); 
          color: white; 
          box-shadow: var(--shadow-premium);
        }
        
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: 1rem;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s;
        }
        .logout-btn:hover { background: #fee2e2; color: #dc2626; transform: translateY(-2px); }

        .content { margin-left: 280px; flex: 1; min-height: 100vh; padding: 3rem 4rem; }
        .content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rem; }
        .header-text h2 { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 0.5rem; }
        .header-text p { color: var(--text-muted); font-size: 1.125rem; font-weight: 500; }
        
        .user-avatar {
          width: 3.5rem;
          height: 3.5rem;
          background: var(--grad-primary);
          color: white;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.25rem;
          box-shadow: var(--shadow-premium);
        }
        
        .page-container { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
};

export default AppShell;
