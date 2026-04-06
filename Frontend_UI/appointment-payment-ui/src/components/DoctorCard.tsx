import { Star, MapPin, Video, ChevronRight, ShieldCheck, Briefcase } from 'lucide-react';
import type { Doctor } from '../models/types';

interface DoctorCardProps {
    doctor: Doctor;
    onSelect: (doctor: Doctor) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onSelect }) => {
    return (
        <div className="doctor-card" onClick={() => onSelect(doctor)}>
            <div className="card-top">
                <div className="img-wrapper">
                    <img src={doctor.photoUrl} alt={doctor.name} />
                    <div className="rating-badge">
                        <Star size={12} fill="currentColor" />
                        {doctor.rating}
                    </div>
                </div>
                <div className="doctor-main-info">
                    <div className="name-row">
                        <h3>{doctor.name}</h3>
                        <div className="verification-badge">
                            <ShieldCheck size={14} />
                            Verified
                        </div>
                    </div>
                    <p className="specialty-label">{doctor.specialty}</p>

                    <div className="doctor-meta">
                        <div className="meta-pill">
                            <Briefcase size={14} />
                            {doctor.experience} Years
                        </div>
                        <div className="meta-pill">
                            {doctor.consultationMode.includes('Video') ? <Video size={14} /> : <MapPin size={14} />}
                            {doctor.consultationMode.join(' & ')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-footer">
                <div className="fee-box">
                    <span>Consultation Fee</span>
                    <p>LKR {doctor.consultationFee.toLocaleString()}</p>
                </div>
                <button className="book-btn">
                    Book Now
                    <ChevronRight size={18} />
                </button>
            </div>

            <style>{`
                .doctor-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: var(--radius-xl);
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: var(--shadow-md);
                    position: relative;
                }
                .doctor-card:hover {
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--primary);
                }
                
                .card-top { display: flex; gap: 2rem; }
                .img-wrapper { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
                .img-wrapper img { width: 100%; height: 100%; object-fit: cover; border-radius: 1.5rem; box-shadow: var(--shadow-sm); }
                .rating-badge {
                    position: absolute;
                    bottom: -0.5rem;
                    right: -0.5rem;
                    background: #f59e0b;
                    color: white;
                    padding: 0.25rem 0.6rem;
                    border-radius: 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 900;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);
                    border: 2px solid white;
                }
                
                .doctor-main-info { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
                .name-row { display: flex; align-items: center; justify-content: space-between; }
                .name-row h3 { font-size: 1.5rem; font-weight: 950; letter-spacing: -0.025em; color: var(--text-main); }
                .verification-badge { display: flex; align-items: center; gap: 0.352rem; color: var(--secondary); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(16, 185, 129, 0.1); padding: 0.352rem 0.75rem; border-radius: 2rem; }
                
                .specialty-label { font-size: 1rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; }
                
                .doctor-meta { display: flex; gap: 1rem; }
                .meta-pill { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: var(--text-muted); background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 1rem; }
                
                .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1.5rem; border-top: 1px solid rgba(226, 232, 240, 0.8); }
                .fee-box span { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
                .fee-box p { font-size: 1.5rem; font-weight: 950; color: var(--secondary); letter-spacing: -0.025em; }
                
                .book-btn { background: var(--grad-primary); color: white; padding: 1rem 2rem; border-radius: 1.25rem; border: none; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; transition: all 0.3s; box-shadow: var(--shadow-premium); cursor: pointer; }
                .book-btn:hover { transform: scale(1.05); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.4); }
            `}</style>
        </div>
    );
};

export default DoctorCard;
