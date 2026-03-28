import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

interface SymptomInputFormProps {
    onSearch: (symptoms: string) => void;
}

const SymptomInputForm: React.FC<SymptomInputFormProps> = ({ onSearch }) => {
    const [symptoms, setSymptoms] = useState('');

    return (
        <div className="symptom-search-container">
            <div className="search-header">
                <div className="ai-icon">
                    <Sparkles size={24} />
                </div>
                <div className="header-text">
                    <h3>Find the Right Specialist</h3>
                    <p>Describe your symptoms in natural language, and our AI will recommend the best doctors for you.</p>
                </div>
            </div>

            <div className="input-wrapper">
                <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g. I have a persistent headache and sensitivity to light for 3 days..."
                />
                <button
                    onClick={() => onSearch(symptoms)}
                    disabled={!symptoms}
                    className="search-btn"
                >
                    <Search size={24} />
                </button>
            </div>

            <div className="tag-cloud">
                {['Fever', 'Skin Rash', 'Heart Palpitations', 'Back Pain', 'Cough', 'Fatigue'].map(tag => (
                    <button
                        key={tag}
                        onClick={() => {
                            setSymptoms(prev => prev ? `${prev}, ${tag}` : tag);
                        }}
                        className="symptom-tag"
                    >
                        + {tag}
                    </button>
                ))}
            </div>

            <style>{`
                .symptom-search-container {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: var(--radius-xl);
                    padding: 3rem;
                    margin-bottom: 4rem;
                    box-shadow: var(--shadow-lg);
                }
                
                .search-header { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 3rem; }
                .ai-icon { width: 4rem; height: 4rem; background: var(--grad-primary); color: white; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-premium); }
                .header-text h3 { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 0.5rem; }
                .header-text p { color: var(--text-muted); font-size: 1.125rem; font-weight: 500; }
                
                .input-wrapper { position: relative; margin-bottom: 2rem; }
                .input-wrapper textarea {
                    width: 100%;
                    padding: 2rem;
                    padding-right: 5rem;
                    border-radius: 1.5rem;
                    border: 1px solid var(--border);
                    background: rgba(248, 250, 252, 0.5);
                    font-size: 1.125rem;
                    font-family: inherit;
                    min-height: 140px;
                    resize: none;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .input-wrapper textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    background: white;
                    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.08), 0 10px 30px rgba(0,0,0,0.05);
                    transform: scale(1.01);
                }
                
                .search-btn {
                    position: absolute;
                    bottom: 1.5rem;
                    right: 1.5rem;
                    width: 3.5rem;
                    height: 3.5rem;
                    background: var(--grad-primary);
                    color: white;
                    border: none;
                    border-radius: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: var(--shadow-premium);
                }
                .search-btn:hover:not(:disabled) { transform: translateY(-3px) scale(1.05); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.4); }
                .search-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                
                .tag-cloud { display: flex; flex-wrap: wrap; gap: 1rem; }
                .symptom-tag {
                    background: white;
                    border: 1px solid var(--border);
                    padding: 0.6rem 1.25rem;
                    border-radius: 1rem;
                    font-size: 0.938rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .symptom-tag:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                    background: var(--primary-light);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default SymptomInputForm;
