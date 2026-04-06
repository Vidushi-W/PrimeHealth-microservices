import React from 'react';
import { TrendingUp, Calendar, ArrowDownLeft, FileText, Download, PieChart } from 'lucide-react';
import { mockEarnings } from '../services/mockData';

const DoctorEarnings: React.FC = () => {
    return (
        <div className="doctor-earnings">
            <div className="earnings-hero glass-card">
                <div className="hero-content">
                    <div className="main-stat">
                        <p>Total Monthly Revenue</p>
                        <h1>LKR {mockEarnings.monthlyTotal.toLocaleString()}</h1>
                        <div className="badge success">
                            <TrendingUp size={14} /> +15.4% increase
                        </div>
                    </div>
                    <div className="sub-stats">
                        <div className="sub-stat">
                            <p>Daily Revenue</p>
                            <h4>LKR {mockEarnings.dailyTotal.toLocaleString()}</h4>
                        </div>
                        <div className="sub-stat">
                            <p>Pending Settlement</p>
                            <h4>LKR {mockEarnings.pendingSettlement.toLocaleString()}</h4>
                        </div>
                    </div>
                </div>
                <div className="hero-chart-placeholder">
                    <PieChart size={120} opacity={0.1} />
                </div>
            </div>

            <div className="earnings-grid">
                <div className="history-section glass-card">
                    <div className="section-header">
                        <h3>Recent Payouts</h3>
                        <button className="btn-text">View All Reports</button>
                    </div>
                    <div className="payout-list">
                        {mockEarnings.history.map((h, i) => (
                            <div key={i} className="payout-row">
                                <div className="date-box">
                                    <Calendar size={18} />
                                    <span>{h.date}</span>
                                </div>
                                <div className="amt-box">
                                    <p className="label">Consultations ({h.appointments})</p>
                                    <p className="amt">LKR {h.amount.toLocaleString()}</p>
                                </div>
                                <div className="status-box">
                                    <span className="status-pill processed">Processed</span>
                                </div>
                                <button className="download-btn"><Download size={18} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="invoice-section glass-card">
                    <h3>Generated Invoices</h3>
                    <p className="subtitle">Automated medical billing reports</p>
                    <div className="invoice-list">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="invoice-item">
                                <div className="file-icon"><FileText size={24} /></div>
                                <div className="file-info">
                                    <p className="file-name">Monthly_Report_Mar_2026.pdf</p>
                                    <p className="file-meta">Generated on 2026-03-31 • 1.2MB</p>
                                </div>
                                <div className="file-action"><ArrowDownLeft size={18} /></div>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary w-full py-4 mt-8">Generate Custom Report</button>
                </div>
            </div>

            <style>{`
                .doctor-earnings { display: flex; flex-direction: column; gap: 2.5rem; }
                
                .earnings-hero { 
                    padding: 3rem; 
                    background: var(--grad-primary); 
                    color: white; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(37,99,235,0.2);
                }
                .hero-content { position: relative; z-index: 2; }
                .main-stat p { font-size: 1.125rem; font-weight: 700; opacity: 0.9; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .main-stat h1 { font-size: 4rem; font-weight: 950; letter-spacing: -0.05em; margin-bottom: 1.5rem; }
                .badge.success { 
                    display: inline-flex; align-items: center; gap: 0.5rem; 
                    background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.3);
                    padding: 0.5rem 1rem; border-radius: 1rem; font-weight: 800; font-size: 0.875rem;
                }
                
                .sub-stats { display: flex; gap: 3rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); }
                .sub-stat p { font-size: 0.813rem; font-weight: 700; opacity: 0.7; margin-bottom: 0.5rem; text-transform: uppercase; }
                .sub-stat h4 { font-size: 1.5rem; font-weight: 900; }
                
                .hero-chart-placeholder { position: absolute; right: -2rem; bottom: -2rem; transform: rotate(-15deg); }

                .earnings-grid { display: grid; grid-template-columns: 1fr 380px; gap: 2.5rem; }
                
                .history-section { padding: 2.5rem; }
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                .section-header h3 { font-size: 1.5rem; font-weight: 900; }
                .btn-text { background: none; border: none; color: var(--primary); font-weight: 800; cursor: pointer; font-size: 0.938rem; }
                
                .payout-list { display: flex; flex-direction: column; gap: 1.25rem; }
                .payout-row { 
                    display: flex; align-items: center; justify-content: space-between; 
                    padding: 1.5rem 2rem; background: #f8fafc; border-radius: 1.25rem;
                    transition: 0.3s;
                }
                .payout-row:hover { transform: translateY(-3px); background: white; box-shadow: var(--shadow-md); border: 1px solid var(--primary-light); }
                
                .date-box { display: flex; align-items: center; gap: 1rem; font-weight: 800; color: var(--text-main); }
                .amt-box { text-align: center; }
                .amt-box .label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem; }
                .amt-box .amt { font-size: 1.25rem; font-weight: 900; color: var(--primary); }
                
                .status-pill { padding: 0.375rem 0.75rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; }
                .status-pill.processed { background: #dcfce7; color: #10b981; }
                
                .download-btn { width: 3rem; height: 3rem; border-radius: 1rem; border: 1px solid var(--border); background: white; color: var(--text-muted); cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
                .download-btn:hover { border-color: var(--primary); color: var(--primary); transform: scale(1.1); }

                .invoice-section { padding: 2.5rem; }
                .invoice-section h3 { font-size: 1.25rem; font-weight: 900; margin-bottom: 0.25rem; }
                .invoice-section .subtitle { color: var(--text-muted); font-size: 0.875rem; font-weight: 600; margin-bottom: 2.5rem; }
                
                .invoice-item { 
                    display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem; 
                    border-radius: 1.25rem; background: #f8fafc; margin-bottom: 1rem;
                    cursor: pointer; transition: 0.3s;
                }
                .invoice-item:hover { background: var(--primary-light); }
                .file-icon { color: var(--primary); }
                .file-name { font-weight: 800; font-size: 0.938rem; margin-bottom: 0.25rem; }
                .file-meta { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
                .file-action { margin-left: auto; color: var(--text-muted); }
            `}</style>
        </div>
    );
};

export default DoctorEarnings;
