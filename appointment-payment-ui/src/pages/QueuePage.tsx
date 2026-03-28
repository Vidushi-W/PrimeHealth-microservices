import React, { useState, useEffect } from 'react';
import { Clock, Users, Bell, RefreshCw, Calendar, MapPin, UserCheck } from 'lucide-react';

const QueuePage: React.FC = () => {
    const [waitTime, setWaitTime] = useState(24);

    useEffect(() => {
        const timer = setInterval(() => {
            setWaitTime(prev => Math.max(0, prev - 1));
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="queue-container">
            <div className="queue-hero">
                <div className="hero-badge">
                    <Clock size={16} />
                    Live Room Tracking
                </div>
                <h2>Current Patient Token</h2>
                <div className="token-display">#SH-003</div>
                <div className="doctor-tag">
                    <div className="tag-item">
                        <UserCheck size={16} />
                        Dr. Sarah Wilson
                    </div>
                    <div className="tag-item">
                        <MapPin size={16} />
                        Room 402
                    </div>
                </div>

                <div className="hero-bg-icon">
                    <Clock size={200} />
                </div>
            </div>

            <div className="stats-row">
                <div className="stat-card position-card">
                    <p>Your Position</p>
                    <div className="value-box">
                        <span className="current">007</span>
                        <span className="total">/ 12</span>
                    </div>
                </div>
                <div className="stat-card wait-card">
                    <p>Est. Wait Time</p>
                    <div className="value-box">
                        <span className="current">~{waitTime}</span>
                        <span className="total">min</span>
                    </div>
                </div>
            </div>

            <div className="progress-section">
                <h3>
                    <Users size={20} />
                    Queue Progress
                </h3>
                <div className="progress-list">
                    {[
                        { token: '#SH-004', status: 'Called', color: 'called' },
                        { token: '#SH-005', status: 'In Prep', color: 'prep' },
                        { token: '#SH-006', status: 'Next', color: 'next' },
                        { token: '#SH-007', status: 'Waiting (You)', color: 'you', isYou: true },
                    ].map((p, i) => (
                        <div key={i} className={`progress-item ${p.isYou ? 'you-item' : ''}`}>
                            <span className="token-id">{p.token}</span>
                            <span className={`status-label ${p.color}`}>{p.status}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="reschedule-banner">
                <div className="banner-content">
                    <div className="bell-icon">
                        <Bell size={24} />
                    </div>
                    <div className="banner-text">
                        <h4>Need to reschedule?</h4>
                        <p>Dr. Sarah has an earlier slot available today at 11:30 AM due to a cancellation.</p>
                    </div>
                </div>
                <button className="reschedule-btn">
                    <RefreshCw size={20} />
                    Reschedule to Earlier Slot
                </button>
            </div>

            <div className="page-footer">
                <div className="footer-item">
                    <RefreshCw size={14} className="spin" />
                    Auto-refreshing in real-time
                </div>
                <div className="footer-item">
                    <Calendar size={14} />
                    Saturday, 28th March 2026
                </div>
            </div>

            <style>{`
                .queue-container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
                
                .queue-hero {
                    background: var(--grad-primary);
                    color: white;
                    padding: 4rem 2rem;
                    border-radius: var(--radius-xl);
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                    box-shadow: var(--shadow-premium);
                    border: 4px solid rgba(255, 255, 255, 0.2);
                }
                .hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.5rem 1rem;
                    border-radius: 2rem;
                    font-size: 0.813rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .queue-hero h2 { font-size: 1.5rem; font-weight: 500; opacity: 0.9; margin-bottom: 1rem; }
                .token-display { font-size: 6rem; font-weight: 950; letter-spacing: -0.05em; margin-bottom: 2rem; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.2)); }
                
                .doctor-tag { display: flex; justify-content: center; gap: 1.5rem; }
                .tag-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(255, 255, 255, 0.15);
                    padding: 0.75rem 1.25rem;
                    border-radius: 1rem;
                    font-weight: 700;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                
                .hero-bg-icon { position: absolute; top: -2rem; right: -2rem; opacity: 0.05; transform: rotate(-15deg); pointer-events: none; }

                .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                .stat-card {
                    padding: 2rem;
                    border-radius: var(--radius-xl);
                    background: white;
                    box-shadow: var(--shadow-md);
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid var(--border);
                }
                .stat-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); border-color: var(--primary); }
                .stat-card p { color: var(--text-muted); font-weight: 700; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .value-box { display: flex; align-items: baseline; justify-content: center; gap: 0.5rem; }
                .value-box .current { font-size: 3rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.025em; }
                .value-box .total { font-size: 1.25rem; font-weight: 700; color: var(--text-muted); opacity: 0.5; }
                
                .wait-card .current { color: var(--secondary); }

                .progress-section {
                    padding: 2.5rem;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-md);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                }
                .progress-section h3 { display: flex; align-items: center; gap: 0.75rem; font-size: 1.25rem; font-weight: 800; margin-bottom: 2rem; color: var(--text-main); }
                .progress-list { display: flex; flex-direction: column; gap: 1rem; }
                .progress-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    background: #f8fafc;
                    border-radius: 1.25rem;
                    border: 1px solid transparent;
                    transition: all 0.3s;
                }
                .you-item {
                    background: var(--primary-light);
                    border-color: var(--primary);
                    box-shadow: var(--shadow-sm);
                    transform: scale(1.02);
                }
                .token-id { font-family: 'JetBrains Mono', monospace; font-size: 1.125rem; font-weight: 800; }
                .status-label { font-weight: 800; font-size: 0.813rem; padding: 0.4rem 0.8rem; border-radius: 0.75rem; text-transform: uppercase; letter-spacing: 0.025em; }
                .status-label.called { background: #fee2e2; color: #dc2626; }
                .status-label.prep { background: #fef3c7; color: #d97706; }
                .status-label.next { background: #dcfce7; color: #059669; }
                .status-label.you { background: var(--primary); color: white; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }

                .reschedule-banner {
                    padding: 2.5rem;
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                    border: 1px solid #fde68a;
                    border-radius: var(--radius-xl);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 10px 20px rgba(245, 158, 11, 0.1);
                }
                .banner-content { display: flex; gap: 1.5rem; align-items: center; }
                .bell-icon { width: 3.5rem; height: 3.5rem; background: #fbbf24; color: white; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(251, 191, 36, 0.3); }
                .banner-text h4 { font-size: 1.25rem; font-weight: 800; color: #92400e; margin-bottom: 0.25rem; }
                .banner-text p { color: #b45309; font-weight: 600; font-size: 0.938rem; }
                
                .reschedule-btn {
                    background: #d97706;
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 1rem;
                    border: none;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 5px 15px rgba(217, 119, 6, 0.3);
                }
                .reschedule-btn:hover { background: #b45309; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(217, 119, 6, 0.4); }

                .page-footer { display: flex; justify-content: center; gap: 2.5rem; padding: 1rem 0; color: var(--text-muted); font-size: 0.875rem; font-weight: 600; }
                .footer-item { display: flex; align-items: center; gap: 0.5rem; opacity: 0.6; }
                .spin { animation: spin 4s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default QueuePage;
