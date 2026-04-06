import React from 'react';
import { Clock, Zap } from 'lucide-react';
import type { DoctorSlot } from '../models/types';

interface SlotSelectorProps {
    slots: DoctorSlot[];
    selectedSlotId?: string;
    onSelect: (slot: DoctorSlot) => void;
}

const SlotSelector: React.FC<SlotSelectorProps> = ({ slots, selectedSlotId, onSelect }) => {
    return (
        <div className="slot-grid">
            {slots.map(slot => (
                <button
                    key={slot.slotId}
                    onClick={() => onSelect(slot)}
                    disabled={!slot.isAvailable}
                    className={`slot-btn ${selectedSlotId === slot.slotId ? 'active' : ''} ${!slot.isAvailable ? 'disabled' : ''}`}
                >
                    <div className="slot-time">
                        <Clock size={16} />
                        <span>{slot.startTime}</span>
                    </div>

                    <div className="slot-price">
                        LKR {slot.price.toLocaleString()}
                    </div>

                    {slot.pricingType === 'Peak' && (
                        <div className="peak-badge">
                            <Zap size={10} fill="currentColor" />
                            Peak
                        </div>
                    )}
                </button>
            ))}
            <style>{`
        .slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
        }
        .slot-btn {
          position: relative;
          padding: 1.5rem 1rem;
          border-radius: 1.25rem;
          border: 1px solid var(--border);
          background: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          box-shadow: var(--shadow-sm);
        }
        .slot-btn:hover:not(.disabled) {
          border-color: var(--primary);
          background: white;
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }
        .slot-btn.active {
          border-color: transparent;
          background: var(--grad-primary);
          color: white;
          box-shadow: var(--shadow-premium);
        }
        .slot-btn.disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background: #f1f5f9;
          box-shadow: none;
        }
        .slot-time {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.025em;
        }
        .slot-price {
          font-size: 0.875rem;
          opacity: 0.7;
          font-weight: 600;
        }
        .slot-btn.active .slot-price { opacity: 0.9; }
        
        .peak-badge {
          position: absolute;
          top: -0.625rem;
          right: -0.625rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 0.3rem 0.6rem;
          border-radius: 0.75rem;
          font-size: 0.625rem;
          font-weight: 900;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          box-shadow: 0 4px 6px rgba(180, 83, 9, 0.2);
          border: 1px solid rgba(255,255,255,0.2);
        }
      `}</style>
        </div>
    );
};

export default SlotSelector;
