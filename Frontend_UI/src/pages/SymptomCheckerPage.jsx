import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkSymptoms } from '../services/patientApi';
import './Dashboard.css';

const initialForm = {
  symptoms: '',
  duration: '2-3 days',
  severity: 'moderate',
  temperature: '',
  sugarLevel: '',
  bloodPressure: '',
  notes: '',
};

function SymptomCheckerPage({ auth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [analysisSource, setAnalysisSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleClear = () => {
    setForm(initialForm);
    setResult(null);
    setAnalysisSource('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await checkSymptoms(auth.token, {
        patientId: auth.user?.id,
        symptoms: form.symptoms.split(',').map((item) => item.trim()).filter(Boolean),
        duration: form.duration,
        severity: form.severity,
        temperature: form.temperature || null,
        sugarLevel: form.sugarLevel || null,
        bloodPressure: form.bloodPressure || '',
        notes: form.notes || '',
      });

      setResult(response.result || null);
      setAnalysisSource(response.analysisSource || '');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToDoctors = () => {
    if (!result?.recommendedSpecialty) {
      navigate('/patient/appointments/book');
      return;
    }

    navigate(`/patient/appointments/book?specialization=${encodeURIComponent(result.recommendedSpecialty)}`);
  };

  return (
    <div className="dashboard patient-feature-compact animate-fade-in">
      <section className="welcome-card glass">
        <div>
          <p className="eyebrow">Symptom checker</p>
          <h1>Check symptoms and get a preliminary care direction.</h1>
          <p>Enter your current symptoms and a few optional health readings to receive a possible category, recommended specialty, and preliminary advice.</p>
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Symptom details</h2>
            <p>Use comma-separated symptoms such as fever, cough, fatigue.</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Symptoms</span>
            <input name="symptoms" onChange={handleChange} placeholder="fever, cough, fatigue" value={form.symptoms} />
          </label>

          <div className="booking-filter-grid">
            <label className="form-field">
              <span>Duration</span>
              <select name="duration" onChange={handleChange} value={form.duration}>
                <option value="1 day">1 day</option>
                <option value="2-3 days">2-3 days</option>
                <option value="1 week">1 week</option>
                <option value="more than 1 week">more than 1 week</option>
              </select>
            </label>

            <label className="form-field">
              <span>Severity</span>
              <select name="severity" onChange={handleChange} value={form.severity}>
                <option value="mild">mild</option>
                <option value="moderate">moderate</option>
                <option value="severe">severe</option>
              </select>
            </label>

            <label className="form-field">
              <span>Temperature</span>
              <input name="temperature" onChange={handleChange} placeholder="38.2" type="number" value={form.temperature} />
            </label>

            <label className="form-field">
              <span>Sugar level</span>
              <input name="sugarLevel" onChange={handleChange} placeholder="180" type="number" value={form.sugarLevel} />
            </label>

            <label className="form-field">
              <span>Blood pressure</span>
              <input name="bloodPressure" onChange={handleChange} placeholder="120/80" value={form.bloodPressure} />
            </label>
          </div>

          <label className="form-field">
            <span>Notes</span>
            <textarea className="symptom-textarea" name="notes" onChange={handleChange} placeholder="Optional context such as dry cough at night" value={form.notes} />
          </label>

          <div className="booking-actions">
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Checking...' : 'Check symptoms'}
            </button>
            <button className="btn btn-secondary" onClick={handleClear} type="button">
              Clear
            </button>
          </div>
        </form>
      </section>

      {result ? (
        <section className="dashboard-section glass">
          <div className="section-header">
            <div>
              <h2>Preliminary result</h2>
              <p>Use this as a symptom-based guide for your next step.</p>
            </div>
          </div>

          <div className="confirmation-grid">
            <div className="dashboard-card glass">
              <h3>Possible category</h3>
              <p className="card-value">{result.possibleCategory}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Possible illness pattern</h3>
              <p className="card-value">{result.possibleIllness || result.possibleCategory}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Recommended specialty</h3>
              <p className="card-value">{result.recommendedSpecialty}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Urgency</h3>
              <p className="card-value">{result.urgency}</p>
            </div>
          </div>

          <div className="list-card">
            <div>
              <h3>Preliminary advice</h3>
              <p>{result.advice}</p>
            </div>
          </div>

          {result.precautions?.length ? (
            <div className="list-card">
              <div>
                <h3>Suggested precautions</h3>
                <div className="chip-group">
                  {result.precautions.map((item) => (
                    <span className="pill neutral" key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {analysisSource ? (
            <p className="report-summary">
              <strong>Analysis source:</strong> {analysisSource === 'huggingface' ? 'Hugging Face assisted review' : 'Rule-based review'}
            </p>
          ) : null}

          <p className="report-summary report-disclaimer">{result.disclaimer}</p>

          <div className="booking-actions">
            <button className="btn btn-primary" onClick={goToDoctors} type="button">
              Find doctors
            </button>
            <button className="btn btn-secondary" onClick={goToDoctors} type="button">
              Book appointment with recommended specialty
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="form-message error">{error}</p> : null}
    </div>
  );
}

export default SymptomCheckerPage;
