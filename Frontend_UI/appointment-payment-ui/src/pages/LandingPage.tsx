import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, UserCheck, Search, Sparkles } from 'lucide-react';
import SymptomInputForm from '../components/SymptomInputForm';
import DoctorCard from '../components/DoctorCard';
import { appointmentService } from '../services/appointmentService';
import type { Doctor } from '../models/types';

const LandingPage: React.FC = () => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        appointmentService.getDoctors().then(setDoctors);
    }, []);

    const handleSymptomSearch = async (symptoms: string) => {
        setLoading(true);
        const recommended = await appointmentService.recommendDoctors({ symptoms });
        setDoctors(recommended);
        setLoading(false);
    };

    const handleBook = (doctor: Doctor) => {
        navigate(`/book/${doctor.doctorId}`, { state: { doctor } });
    };

    return (
        <div className="landing-page-container">
            <section className="hero-section">
                <div className="hero-content">
                    <div className="platform-label">
                        <Activity size={18} />
                        Next-Gen Health Ecosystem
                    </div>
                    <h1 className="hero-title">
                        Healthcare that <span className="gradient-text">moves</span> with you.
                    </h1>
                    <p className="hero-subtitle">
                        Experience the gold standard of telemedicine. Secure appointments, AI-driven diagnostics, and instant digital payments in one unified interface.
                    </p>
                    <div className="hero-actions">
                        <button
                            onClick={() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-hero-primary"
                        >
                            Book Your Appointment
                        </button>
                        <button
                            onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-hero-outline"
                        >
                            Explore Platform
                        </button>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="glow-sphere"></div>
                    <div className="hero-icon-wrapper">
                        <Activity size={240} />
                    </div>
                </div>
            </section>

            <section id="features-section" className="features-section">
                {[
                    { icon: <ShieldCheck size={28} />, title: 'Secure Gateway', desc: 'Enterprise-grade encryption for all payments.', color: 'emerald' },
                    { icon: <UserCheck size={28} />, title: 'Elite Specialists', desc: 'Hand-picked certified medical professionals.', color: 'blue' },
                    { icon: <Sparkles size={28} />, title: 'AI Matching', desc: 'Symptom-based intelligent doctor routing.', color: 'amber' },
                    { icon: <Search size={28} />, title: 'Real-time Queue', desc: 'Live tracking of your token and wait times.', color: 'purple' },
                ].map((f, i) => (
                    <div key={i} className="feature-card">
                        <div className={`feature-icon ${f.color}`}>
                            {f.icon}
                        </div>
                        <h4>{f.title}</h4>
                        <p>{f.desc}</p>
                    </div>
                ))}
            </section>

            <div id="search-section" className="search-header-main">
                <div className="header-badge">Step 1</div>
                <h3>Find Your Specialist</h3>
                <p>Use our AI engine or browse by department.</p>
            </div>

            <SymptomInputForm onSearch={handleSymptomSearch} />

            {loading ? (
                <div className="loader-view">
                    <div className="premium-loader"></div>
                    <p>AI Engine is analyzing your symptoms...</p>
                </div>
            ) : (
                <div className="doctor-grid-main">
                    {doctors.map(doctor => (
                        <DoctorCard
                            key={doctor.doctorId}
                            doctor={doctor}
                            onSelect={handleBook}
                        />
                    ))}
                </div>
            )}

            <style>{`
                .landing-page-container { max-width: 1200px; margin: 0 auto; padding-bottom: 6rem; }
                
                /* Hero Section */
                .hero-section {
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 4rem;
                    align-items: center;
                    padding: 6rem 4rem;
                    background: rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(20px);
                    border-radius: 3rem;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: var(--shadow-lg);
                    margin-bottom: 5rem;
                    position: relative;
                    overflow: hidden;
                }
                .platform-label { display: flex; align-items: center; gap: 0.75rem; color: var(--primary); font-weight: 800; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 2rem; }
                .hero-title { font-size: 4.5rem; font-weight: 950; letter-spacing: -0.05em; line-height: 1; margin-bottom: 2rem; }
                .gradient-text { background: var(--grad-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .hero-subtitle { font-size: 1.25rem; color: var(--text-muted); font-weight: 500; line-height: 1.6; margin-bottom: 3.5rem; max-width: 90%; }
                
                .hero-actions { display: flex; gap: 1.5rem; }
                .btn-hero-primary { background: var(--grad-primary); color: white; padding: 1.25rem 2.5rem; border-radius: 1.5rem; border: none; font-weight: 800; font-size: 1.125rem; cursor: pointer; transition: all 0.3s; box-shadow: var(--shadow-premium); }
                .btn-hero-primary:hover { transform: translateY(-5px) scale(1.05); box-shadow: 0 15px 30px rgba(37, 99, 235, 0.4); }
                .btn-hero-outline { background: white; color: var(--text-main); padding: 1.25rem 2.5rem; border-radius: 1.5rem; border: 1px solid var(--border); font-weight: 800; font-size: 1.125rem; cursor: pointer; transition: all 0.3s; }
                .btn-hero-outline:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-5px); }

                .hero-visual { position: relative; display: flex; justify-content: center; align-items: center; }
                .glow-sphere { position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%); border-radius: 50%; filter: blur(40px); animation: pulse 8s infinite alternate; }
                .hero-icon-wrapper { position: relative; color: var(--primary); opacity: 0.1; transform: rotate(-10deg); }

                /* Features */
                .features-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; margin-bottom: 6rem; }
                .feature-card { padding: 2.5rem; background: white; border-radius: 2rem; border: 1px solid var(--border); transition: all 0.3s; }
                .feature-card:hover { border-color: var(--primary); transform: translateY(-10px); box-shadow: var(--shadow-lg); }
                .feature-icon { width: 4rem; height: 4rem; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
                .feature-icon.emerald { background: #ecfdf5; color: #10b981; }
                .feature-icon.blue { background: #eff6ff; color: #3b82f6; }
                .feature-icon.amber { background: #fffbeb; color: #f59e0b; }
                .feature-icon.purple { background: #faf5ff; color: #8b5cf6; }
                .feature-card h4 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.75rem; }
                .feature-card p { color: var(--text-muted); font-size: 0.938rem; line-height: 1.5; font-weight: 500; }

                /* Search Header */
                .search-header-main { margin-bottom: 3rem; }
                .header-badge { display: inline-block; background: var(--primary-light); color: var(--primary); padding: 0.352rem 1rem; border-radius: 2rem; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
                .search-header-main h3 { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 0.5rem; }
                .search-header-main p { font-size: 1.25rem; color: var(--text-muted); font-weight: 500; }

                /* Doctor Grid */
                .doctor-grid-main { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; }

                .loader-view { text-align: center; padding: 6rem 0; }
                .premium-loader { width: 4rem; height: 4rem; border: 4px solid var(--primary-light); border-top-color: var(--primary); border-radius: 50%; margin: 0 auto 2rem; animation: spin 1s linear infinite; }
                
                @keyframes pulse { from { transform: scale(1); opacity: 0.5; } to { transform: scale(1.2); opacity: 0.8; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default LandingPage;
