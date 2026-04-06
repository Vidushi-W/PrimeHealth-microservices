import React from 'react';
import { Users, Clock, Wallet, CheckCircle, ArrowUpRight, Play, Check } from 'lucide-react';
import { mockTodayAppointments, mockEarnings } from '../services/mockData';

const DoctorDashboard: React.FC = () => {
    return (
        <div className="doctor-dashboard">
            <div className="dashboard-header-stats">
                <div className="glass-card stat-item">
                    <div className="icon-wrap users">
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <p>Total Patients</p>
                        <h3>24</h3>
                        <span className="trend pos">+12% from yesterday</span>
                    </div>
                </div>
                <div className="glass-card stat-item">
                    <div className="icon-wrap time">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <p>Avg. Consultation</p>
                        <h3>18m</h3>
                        <span className="trend pos">Optimized performance</span>
                    </div>
                </div>
                <div className="glass-card stat-item">
                    <div className="icon-wrap wallet">
                        <Wallet size={24} />
                    </div>
                    <div className="stat-info">
                        <p>Today's Earnings</p>
                        <h3>LKR {mockEarnings.dailyTotal.toLocaleString()}</h3>
                        <span className="trend pos">+8% vs last Monday</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="main-content">
                    <div className="glass-card queue-manager">
                        <div className="card-header">
                            <h3>Live Queue Manager</h3>
                            <div className="room-badge">Room 402 • Active</div>
                        </div>

                        <div className="active-patient">
                            <div className="patient-main">
                                <span className="label">Currently in Consultation</span>
                                <h2>Alex Johnson <span className="token">#SH-003</span></h2>
                                <p>Symptom: Severe chest pain and shortness of breath</p>
                            </div>
                            <button className="btn btn-primary complete-btn">
                                <CheckCircle size={20} />
                                Complete & Next
                            </button>
                        </div>

                        <div className="upcoming-list">
                            <h4>Next in Queue</h4>
                            {mockTodayAppointments.filter(a => a.status === 'Waiting').map((a, i) => (
                                <div key={i} className="patient-row">
                                    <div className="p-info">
                                        <span className="p-time">{a.time}</span>
                                        <span className="p-name">{a.patientName}</span>
                                    </div>
                                    <div className="p-actions">
                                        <button className="action-btn call"><Play size={14} /> Call Now</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="side-content">
                    <div className="glass-card schedule-summary">
                        <h3>Today's Schedule</h3>
                        <div className="schedule-list">
                            {mockTodayAppointments.slice(0, 5).map((a, i) => (
                                <div key={i} className={`schedule-item ${a.status.toLowerCase().replace(' ', '-')}`}>
                                    <div className="time-col">{a.time}</div>
                                    <div className="detail-col">
                                        <p className="name">{a.patientName}</p>
                                        <p className="type">{a.type}</p>
                                    </div>
                                    <div className="status-col">
                                        {a.status === 'Completed' ? <Check size={16} /> : <div className="dot" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="view-all">View Full Schedule <ArrowUpRight size={16} /></button>
                    </div>
                </div>
            </div>

            <style>{`
                .doctor-dashboard { display: flex; flex-direction: column; gap: 2.5rem; }
                .dashboard-header-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
                
                .stat-item { display: flex; align-items: center; gap: 1.5rem; padding: 2rem; }
                .icon-wrap { width: 4rem; height: 4rem; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; color: white; }
                .icon-wrap.users { background: #10b981; }
                .icon-wrap.time { background: #3b82f6; }
                .icon-wrap.wallet { background: #f59e0b; }
                
                .stat-info p { color: var(--text-muted); font-weight: 700; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .stat-info h3 { font-size: 1.75rem; font-weight: 950; margin: 0.25rem 0; }
                .trend { font-size: 0.75rem; font-weight: 700; }
                .trend.pos { color: #059669; }

                .dashboard-grid { display: grid; grid-template-columns: 1fr 340px; gap: 2.5rem; }
                
                .queue-manager { padding: 2.5rem; }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                .card-header h3 { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.025em; }
                .room-badge { background: #fee2e2; color: #dc2626; padding: 0.4rem 0.8rem; border-radius: 0.75rem; font-size: 0.813rem; font-weight: 800; }

                .active-patient { 
                    background: var(--grad-primary); 
                    color: white; 
                    padding: 2.5rem; 
                    border-radius: 1.5rem; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    margin-bottom: 3rem;
                    box-shadow: 0 15px 35px rgba(37,99,235,0.25);
                }
                .patient-main .label { font-size: 0.875rem; font-weight: 700; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
                .patient-main h2 { font-size: 2.5rem; font-weight: 950; margin: 0.5rem 0; }
                .token { font-size: 1.25rem; opacity: 0.9; margin-left: 1rem; font-family: monospace; }
                .complete-btn { background: white !important; color: var(--primary) !important; font-weight: 900; padding: 1.25rem 2rem; border-radius: 1rem; }
                
                .upcoming-list h4 { font-size: 1.125rem; font-weight: 800; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; }
                .patient-row { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; background: #f8fafc; border-radius: 1rem; margin-bottom: 1rem; transition: 0.3s; }
                .patient-row:hover { transform: translateX(5px); background: white; box-shadow: var(--shadow-sm); }
                .p-time { font-weight: 800; color: var(--primary); margin-right: 1.5rem; width: 80px; display: inline-block; }
                .p-name { font-weight: 700; color: var(--text-main); }
                .action-btn { background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.75rem; font-size: 0.813rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }

                .schedule-list { display: flex; flex-direction: column; gap: 1rem; }
                .schedule-item { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; border-radius: 1rem; background: rgba(248, 250, 252, 0.5); }
                .schedule-item.completed { opacity: 0.6; }
                .schedule-item.in-consultation { background: var(--primary-light); border: 1px solid var(--primary); }
                .time-col { font-weight: 800; font-size: 0.813rem; color: var(--text-muted); min-width: 65px; }
                .detail-col { flex: 1; }
                .detail-col .name { font-weight: 800; font-size: 0.938rem; margin-bottom: 0.25rem; }
                .detail-col .type { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
                .status-col svg { color: #10b981; }
                .status-col .dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
                .view-all { width: 100%; margin-top: 2rem; padding: 1rem; border-radius: 1rem; border: 1px dashed var(--border); background: none; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text-muted); cursor: pointer; }
                .view-all:hover { border-color: var(--primary); color: var(--primary); }
            `}</style>
        </div>
    );
};

export default DoctorDashboard;
