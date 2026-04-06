import React from 'react';
import { FileText, Download, CheckCircle, ExternalLink, Calendar } from 'lucide-react';

const HistoryPage: React.FC = () => {
    const transactions = [
        {
            id: 'TXN-8821',
            doctor: 'Dr. Sarah Wilson',
            date: '2026-03-28',
            amount: 'LKR 3,000',
            status: 'Paid',
            specialty: 'Cardiology'
        },
        {
            id: 'TXN-7742',
            doctor: 'Dr. James Miller',
            date: '2026-03-15',
            amount: 'LKR 1,800',
            status: 'Paid',
            specialty: 'Dermatology'
        },
        {
            id: 'TXN-6610',
            doctor: 'Dr. Emily Chen',
            date: '2026-02-20',
            amount: 'LKR 2,000',
            status: 'Paid',
            specialty: 'Pediatrics'
        }
    ];

    return (
        <div className="history-page">
            <div className="history-header">
                <div>
                    <h2>Payment History & Invoices</h2>
                    <p>Track all your medical consultations and download official receipts.</p>
                </div>
                <button className="btn btn-outline-white">
                    <Download size={20} />
                    Export All
                </button>
            </div>

            <div className="transaction-list">
                {transactions.map((t, i) => (
                    <div key={i} className="transaction-card">
                        <div className="card-left">
                            <div className="icon-box">
                                <FileText size={32} />
                            </div>
                            <div className="info-box">
                                <div className="doctor-info">
                                    <h3>{t.doctor}</h3>
                                    <span className="spec-badge">{t.specialty}</span>
                                </div>
                                <div className="meta-box">
                                    <div className="meta-item">
                                        <Calendar size={16} />
                                        <span>{t.date}</span>
                                    </div>
                                    <div className="meta-item">
                                        <CheckCircle size={16} />
                                        <span>{t.id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-right">
                            <div className="amount-box">
                                <p>Amount Paid</p>
                                <h3>{t.amount}</h3>
                            </div>
                            <div className="action-box">
                                <button className="icon-btn" title="View Details">
                                    <ExternalLink size={20} />
                                </button>
                                <button className="icon-btn primary-btn" title="Download Invoice">
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="summary-card">
                <div className="summary-info">
                    <h3>Total Consultation Expense</h3>
                    <p>Total for fiscal year 2026</p>
                </div>
                <div className="summary-value">
                    <h2>LKR 6,800</h2>
                    <span>3 SUCCESSFUL TRANSACTIONS</span>
                </div>
            </div>

            <style>{`
                .history-page { max-width: 1000px; margin: 0 auto; }
                .history-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3.5rem; }
                .history-header h2 { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 0.5rem; }
                .history-header p { color: var(--text-muted); font-size: 1.125rem; font-weight: 500; }
                .btn-outline-white { background: white; border: 1px solid var(--border); padding: 1rem 1.5rem; border-radius: 1rem; font-weight: 700; display: flex; align-items: center; gap: 0.75rem; transition: all 0.3s; }
                .btn-outline-white:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); }

                .transaction-list { display: flex; flex-direction: column; gap: 1.5rem; }
                .transaction-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-md);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .transaction-card:hover { transform: scale(1.02); box-shadow: var(--shadow-lg); border-color: var(--primary); }

                .card-left { display: flex; align-items: center; gap: 2rem; }
                .icon-box {
                    width: 4.5rem;
                    height: 4.5rem;
                    background: var(--primary-light);
                    color: var(--primary);
                    border-radius: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-sm);
                }
                .transaction-card:hover .icon-box { background: var(--grad-primary); color: white; }

                .info-box { display: flex; flex-direction: column; gap: 0.75rem; }
                .doctor-info { display: flex; align-items: center; gap: 1rem; }
                .doctor-info h3 { font-size: 1.375rem; font-weight: 800; letter-spacing: -0.025em; }
                .spec-badge {
                    background: rgba(37, 99, 235, 0.05);
                    color: var(--primary);
                    padding: 0.375rem 0.75rem;
                    border-radius: 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .meta-box { display: flex; gap: 1.5rem; }
                .meta-item { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.938rem; font-weight: 600; }
                .meta-item svg { opacity: 0.6; }

                .card-right { display: flex; align-items: center; gap: 3rem; }
                .amount-box { text-align: right; }
                .amount-box p { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem; }
                .amount-box h3 { font-size: 1.75rem; font-weight: 900; color: var(--secondary); letter-spacing: -0.025em; }

                .action-box { display: flex; gap: 0.75rem; }
                .icon-btn {
                    width: 3.5rem;
                    height: 3.5rem;
                    border-radius: 1.25rem;
                    border: 1px solid var(--border);
                    background: white;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .icon-btn:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-3px); }
                .icon-btn.primary-btn { background: var(--grad-primary); color: white; border: none; box-shadow: var(--shadow-premium); }
                .icon-btn.primary-btn:hover { transform: translateY(-3px) scale(1.1); }

                .summary-card {
                    margin-top: 4rem;
                    padding: 3rem;
                    background: var(--grad-primary);
                    color: white;
                    border-radius: var(--radius-xl);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: var(--shadow-premium);
                    position: relative;
                    overflow: hidden;
                }
                .summary-card::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 300px;
                    height: 300px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 50%;
                }
                .summary-info h3 { font-size: 1.75rem; font-weight: 900; margin-bottom: 0.5rem; letter-spacing: -0.025em; }
                .summary-info p { opacity: 0.8; font-size: 1.125rem; font-weight: 500; }
                .summary-value { text-align: right; }
                .summary-value h2 { font-size: 3.5rem; font-weight: 950; letter-spacing: -0.05em; margin-bottom: 0.25rem; }
                .summary-value span { font-size: 0.875rem; font-weight: 800; opacity: 0.9; letter-spacing: 0.1em; }
            `}</style>
        </div>
    );
};

export default HistoryPage;
