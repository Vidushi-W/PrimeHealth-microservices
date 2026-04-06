import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Info, CreditCard, ShieldCheck, CheckCircle, Zap, Star } from 'lucide-react';
import SlotSelector from '../components/SlotSelector';
import { mockSlots } from '../services/mockData';
import { appointmentService } from '../services/appointmentService';
import type { Doctor, DoctorSlot, Appointment } from '../models/types';

const BookingPage: React.FC = () => {
    const { doctorId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
    const [symptoms, setSymptoms] = useState('');
    const [loading, setLoading] = useState(false);
    const [appointment, setAppointment] = useState<Appointment | null>(null);

    const doctor = location.state?.doctor as Doctor;

    useEffect(() => {
        if (!doctor) navigate('/');
    }, [doctor, navigate]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleBook = async () => {
        setLoading(true);
        const app = await appointmentService.bookAppointment({
            doctorId: doctor.doctorId,
            doctorName: doctor.name,
            doctorSpecialty: doctor.specialty,
            appointmentDate: selectedSlot!.date,
            timeSlot: selectedSlot!.startTime,
            symptoms,
            consultationMode: 'In-Person',
            consultationFee: selectedSlot!.price,
        });
        setAppointment(app);
        setLoading(false);
        handleNext();
    };

    if (!doctor) return null;

    return (
        <div className="booking-page max-w-4xl mx-auto">
            <button onClick={() => navigate(-1)} className="back-btn">
                <ChevronLeft size={20} />
                Back to search
            </button>

            <div className="booking-grid">
                <div className="booking-main">
                    <div className="glass-card main-card">
                        <div className="step-indicator">
                            <div className="step-number">{step}</div>
                            <div>
                                <h2 className="step-title">
                                    {step === 1 && 'Select Preferred Time Slot'}
                                    {step === 2 && 'Patient Information'}
                                    {step === 3 && 'Order Summary & Payment'}
                                    {step === 4 && 'Booking Confirmed!'}
                                </h2>
                                <p className="step-subtitle">Step {step} of 4</p>
                            </div>
                        </div>

                        {step === 1 && (
                            <div className="step-content">
                                <div className="info-banner">
                                    <Info size={20} />
                                    <p>Dynamic pricing applies. Evening and weekend slots have a small surge fee.</p>
                                </div>
                                <SlotSelector
                                    slots={mockSlots.filter(s => s.doctorId === doctorId)}
                                    selectedSlotId={selectedSlot?.slotId}
                                    onSelect={setSelectedSlot}
                                />
                                <button
                                    disabled={!selectedSlot}
                                    onClick={handleNext}
                                    className="btn btn-primary w-full py-4 mt-8 justify-center"
                                >
                                    Confirm Slot
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="step-content">
                                <div className="form-group">
                                    <label>Reason for consultation</label>
                                    <textarea
                                        value={symptoms}
                                        onChange={(e) => setSymptoms(e.target.value)}
                                        placeholder="Briefly describe your current condition..."
                                    />
                                </div>
                                <div className="btn-group">
                                    <button onClick={handleBack} className="btn btn-outline">Back</button>
                                    <button onClick={handleNext} disabled={!symptoms} className="btn btn-primary flex-2">Review Booking</button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="step-content">
                                <div className="pricing-list">
                                    <div className="pricing-item">
                                        <span>Doctor Fee</span>
                                        <span>LKR {doctor.consultationFee.toLocaleString()}</span>
                                    </div>
                                    {selectedSlot?.pricingType === 'Peak' && (
                                        <div className="pricing-item peak-surge">
                                            <span className="flex items-center gap-2"><Zap size={16} /> Peak Hour Surge</span>
                                            <span>LKR {(selectedSlot.price - doctor.consultationFee).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="pricing-item total">
                                        <span>Total Amount</span>
                                        <span>LKR {selectedSlot?.price.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="payment-methods">
                                    <h4><CreditCard size={18} /> Payment Method</h4>
                                    <div className="method-grid">
                                        <button className="method-btn active">Visa / Master</button>
                                        <button className="method-btn">Genie / Koko</button>
                                    </div>
                                </div>

                                <div className="btn-group">
                                    <button onClick={handleBack} className="btn btn-outline">Back</button>
                                    <button
                                        onClick={handleBook}
                                        disabled={loading}
                                        className="btn btn-primary flex-2"
                                    >
                                        {loading ? 'Processing...' : 'Pay & Confirm'}
                                        <ShieldCheck size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 4 && appointment && (
                            <div className="success-view">
                                <div className="success-icon">
                                    <CheckCircle size={64} />
                                </div>
                                <div className="success-text">
                                    <h2>Success!</h2>
                                    <p>Your appointment with {doctor.name} is confirmed.</p>
                                </div>

                                <div className="token-grid">
                                    <div className="token-card primary">
                                        <p>Queue Token</p>
                                        <h3>#SH-0{Math.floor(Math.random() * 20) + 1}</h3>
                                    </div>
                                    <div className="token-card">
                                        <p>Scheduled for</p>
                                        <h3>{selectedSlot?.startTime}</h3>
                                    </div>
                                </div>

                                <div className="success-actions">
                                    <button onClick={() => navigate('/queue')} className="btn btn-primary">Track Live Queue</button>
                                    <button onClick={() => navigate('/history')} className="btn btn-outline">View Invoice</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="booking-sidebar">
                    <div className="glass-card doctor-summary">
                        <img src={doctor.photoUrl} alt={doctor.name} className="summary-img" />
                        <div className="summary-info">
                            <h3>{doctor.name}</h3>
                            <p className="specialty">{doctor.specialty}</p>

                            <div className="stats-list">
                                <div className="stat-item">
                                    <span className="stat-label">Rating</span>
                                    <span className="stat-value"><Star size={14} fill="currentColor" /> {doctor.rating}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Experience</span>
                                    <span className="stat-value">{doctor.experience} Yrs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 700;
          margin-bottom: 2.5rem;
          padding: 0.75rem 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 1rem;
        }
        .back-btn:hover { color: var(--primary); transform: translateX(-5px); }

        .booking-grid { display: grid; grid-template-columns: 1fr 340px; gap: 3rem; }
        .booking-main { min-width: 0; }
        
        .main-card { 
          padding: 3rem; 
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: var(--shadow-lg);
          border-radius: var(--radius-xl);
        }
        .step-indicator { display: flex; align-items: center; gap: 2rem; margin-bottom: 4rem; }
        .step-number {
          width: 4.5rem;
          height: 4.5rem;
          background: var(--grad-primary);
          color: white;
          border-radius: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 900;
          box-shadow: var(--shadow-premium);
          border: 4px solid rgba(255, 255, 255, 0.8);
        }
        .step-title { font-size: 2rem; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 0.5rem; }
        .step-subtitle { color: var(--text-muted); font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

        .info-banner {
          display: flex;
          gap: 1.25rem;
          background: rgba(37, 99, 235, 0.05);
          border: 1px solid rgba(37, 99, 235, 0.1);
          padding: 1.5rem;
          border-radius: 1.25rem;
          color: var(--primary);
          margin-bottom: 3rem;
          font-size: 1rem;
          line-height: 1.6;
          font-weight: 500;
        }

        .form-group label { display: block; font-weight: 800; margin-bottom: 1rem; color: var(--text-main); font-size: 1.125rem; }
        .form-group textarea {
          width: 100%;
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid var(--border);
          background: rgba(248, 250, 252, 0.5);
          min-height: 200px;
          font-family: inherit;
          font-size: 1.125rem;
          transition: all 0.3s;
        }
        .form-group textarea:focus { border-color: var(--primary); background: white; outline: none; box-shadow: 0 0 0 5px rgba(37,99,235,0.1); }

        .btn-group { display: flex; gap: 1.5rem; margin-top: 3.5rem; }
        .btn-outline { background: white; border: 1px solid var(--border); color: var(--text-main); flex: 1; font-weight: 700; }
        .btn-outline:hover { background: #f8fafc; border-color: var(--text-muted); transform: translateY(-2px); }
        .flex-2 { flex: 2; }

        .pricing-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 3rem; }
        .pricing-item { display: flex; justify-content: space-between; padding: 1.5rem; background: rgba(248, 250, 252, 0.8); border-radius: 1.25rem; font-weight: 700; font-size: 1.125rem; }
        .peak-surge { background: rgba(245, 158, 11, 0.05); color: #d97706; border: 1px dashed #f59e0b; }
        .total { background: var(--grad-primary); color: white; font-size: 1.5rem; font-weight: 900; box-shadow: var(--shadow-premium); }

        .payment-methods h4 { font-size: 1.25rem; font-weight: 800; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; color: var(--text-main); }
        .method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .method-btn {
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid var(--border);
          background: white;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--text-muted);
          font-size: 1.125rem;
        }
        .method-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); transform: translateY(-4px); }
        .method-btn.active { border-color: var(--primary); background: var(--primary-light); color: var(--primary); box-shadow: var(--shadow-sm); }

        .success-view { text-align: center; padding: 2rem 0; }
        .success-icon { 
          width: 6rem; height: 6rem; background: #ecfdf5; color: #10b981; 
          border-radius: 2.5rem; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 2.5rem;
          box-shadow: 0 15px 30px rgba(16, 185, 129, 0.2);
        }
        .success-text h2 { font-size: 3rem; font-weight: 900; margin-bottom: 0.75rem; letter-spacing: -0.05em; }
        .success-text p { color: var(--text-muted); font-size: 1.25rem; font-weight: 500; }
        
        .token-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 4rem 0; }
        .token-card { padding: 2rem; border-radius: var(--radius-xl); border: 1px solid var(--border); background: white; box-shadow: var(--shadow-md); }
        .token-card.primary { background: var(--grad-primary); border: none; color: white; box-shadow: var(--shadow-premium); }
        .token-card p { font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em; }
        .token-card h3 { font-size: 2.25rem; font-weight: 950; }

        .success-actions { display: flex; flex-direction: column; gap: 1.25rem; max-width: 360px; margin: 0 auto; }

        .doctor-summary { 
          padding: 2rem; 
          position: sticky; 
          top: 3rem; 
          border-radius: var(--radius-xl);
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .summary-img { width: 100%; aspect-ratio: 0.9; object-fit: cover; border-radius: 1.25rem; margin-bottom: 2rem; box-shadow: var(--shadow-md); }
        .summary-info h3 { font-size: 1.5rem; font-weight: 900; margin-bottom: 0.5rem; letter-spacing: -0.05em; }
        .specialty { color: var(--primary); font-weight: 800; font-size: 1rem; margin-bottom: 2rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .stats-list { display: flex; flex-direction: column; gap: 1.25rem; padding-top: 2rem; border-top: 1px solid rgba(226, 232, 240, 0.8); }
        .stat-item { display: flex; justify-content: space-between; align-items: center; }
        .stat-label { color: var(--text-muted); font-size: 1rem; font-weight: 700; }
        .stat-value { font-weight: 900; color: var(--text-main); font-size: 1.125rem; display: flex; align-items: center; gap: 0.5rem; }
        .stat-value svg { color: #f59e0b; }
      `}</style>
        </div>
    );
};

export default BookingPage;
