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
        </div>
    );
};

export default AppShell;
