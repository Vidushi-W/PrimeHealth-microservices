import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Wallet, Settings, LogOut, Activity } from 'lucide-react';

const DoctorSidebar: React.FC = () => {
    return (
        <nav className="sidebar doctor-sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <Activity size={28} />
                    <h1>SmartHealth <span className="badge">MD</span></h1>
                </div>

                <div className="nav-group">
                    <NavLink to="/doctor" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                        <LayoutDashboard size={20} />
                        <span>Overview</span>
                    </NavLink>
                    <NavLink to="/doctor/appointments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Users size={20} />
                        <span>Patients</span>
                    </NavLink>
                    <NavLink to="/doctor/earnings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Wallet size={20} />
                        <span>Earnings</span>
                    </NavLink>
                    <NavLink to="/doctor/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </NavLink>
                </div>
            </div>

            <div className="sidebar-footer">
                <button className="logout-btn">
                    <LogOut size={20} />
                    <span>Switch to Patient</span>
                </button>
            </div>

            <style>{`
                .doctor-sidebar .badge {
                    font-size: 0.75rem;
                    background: #ef4444;
                    color: white;
                    padding: 0.1rem 0.4rem;
                    border-radius: 0.5rem;
                    margin-left: 0.5rem;
                    vertical-align: middle;
                }
                .doctor-sidebar .nav-item.active {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
                }
            `}</style>
        </nav>
    );
};

export default DoctorSidebar;
