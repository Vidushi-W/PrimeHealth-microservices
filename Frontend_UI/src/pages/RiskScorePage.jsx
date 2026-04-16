import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateRiskScore, getRiskScoreHistory } from '../services/patientApi';
import './Dashboard.css';

const initialForm = {
  age: '',
  gender: 'female',
  heightCm: '',
  weightKg: '',
  familyHistoryDiabetes: false,
  familyHistoryHypertension: false,
  familyHistoryHeartDisease: false,
  fastingBloodSugar: '',
  bloodPressureSystolic: '',
  bloodPressureDiastolic: '',
  cholesterol: '',
  smoker: false,
  exerciseFrequency: 'sometimes',
  sedentaryLifestyle: false,
};

function MetricBar({ label, value, max = 3 }) {
  const normalizedValue = Number(value) || 0;
  const width = Math.max(6, Math.min(100, (normalizedValue / max) * 100));

  return (
    <div className="metric-bar-card">
      <div className="metric-bar-header">
        <span>{label}</span>
        <strong>{normalizedValue}</strong>
      </div>
      <div className="metric-bar-track">
        <div className="metric-bar-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function TrendChart({ history }) {
  if (!history.length) {
    return <p className="list-empty">Complete multiple assessments to see your risk score trend over time.</p>;
  }

  if (history.length === 1) {
    return (
      <div className="list-card">
        <div>
          <h3>Risk trend</h3>
          <p>One assessment saved so far. Complete another one to view a trend line.</p>
        </div>
        <div className="list-meta">
          <strong>{history[0].createdAtLabel}</strong>
          <span>Score {history[0].score}</span>
        </div>
      </div>
    );
  }

  const chartHistory = history.slice().reverse();
  const width = 640;
  const height = 220;
  const padding = 28;
  const maxScore = Math.max(10, ...chartHistory.map((item) => item.score));
  const stepX = (width - (padding * 2)) / Math.max(1, chartHistory.length - 1);

  const points = chartHistory.map((item, index) => {
    const x = padding + (index * stepX);
    const y = height - padding - ((item.score / maxScore) * (height - (padding * 2)));
    return { ...item, x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="trend-chart-card">
      <div className="section-header">
        <div>
          <h3>Risk trend</h3>
          <p>Date on the x-axis and score on the y-axis for your saved assessments.</p>
        </div>
      </div>

      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Risk score trend chart">
        <line className="trend-axis" x1={padding} x2={padding} y1={padding} y2={height - padding} />
        <line className="trend-axis" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <polyline className="trend-line" fill="none" points={polyline} />
        {points.map((point) => (
          <g key={point.id}>
            <circle className="trend-point" cx={point.x} cy={point.y} r="5" />
            <text className="trend-score-label" x={point.x} y={point.y - 10}>{point.score}</text>
            <text className="trend-date-label" x={point.x} y={height - 10}>{point.createdAtLabel}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatRiskClass(level) {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'high') {
    return 'action-needed';
  }

  if (normalized === 'medium') {
    return 'neutral';
  }

  return 'good';
}

function RiskScorePage({ auth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState('');

  const bmiPreview = useMemo(() => {
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);

    if (!heightCm || !weightKg) {
      return '';
    }

    const heightM = heightCm / 100;
    return (weightKg / (heightM * heightM)).toFixed(1);
  }, [form.heightCm, form.weightKg]);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setIsHistoryLoading(true);

      try {
        const response = await getRiskScoreHistory(auth.token);
        if (active) {
          setHistory(response.history || []);
        }
      } catch (_requestError) {
        if (active) {
          setHistory([]);
        }
      } finally {
        if (active) {
          setIsHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [auth.token]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleClear = () => {
    setForm(initialForm);
    setResult(null);
    setError('');
  };

  const refreshHistory = async () => {
    const response = await getRiskScoreHistory(auth.token);
    setHistory(response.history || []);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await calculateRiskScore(auth.token, {
        patientId: auth.user?.id,
        age: form.age,
        gender: form.gender,
        heightCm: form.heightCm,
        weightKg: form.weightKg,
        familyHistoryDiabetes: form.familyHistoryDiabetes,
        familyHistoryHypertension: form.familyHistoryHypertension,
        familyHistoryHeartDisease: form.familyHistoryHeartDisease,
        fastingBloodSugar: form.fastingBloodSugar || null,
        bloodPressureSystolic: form.bloodPressureSystolic,
        bloodPressureDiastolic: form.bloodPressureDiastolic,
        cholesterol: form.cholesterol || null,
        smoker: form.smoker,
        exerciseFrequency: form.exerciseFrequency,
        sedentaryLifestyle: form.sedentaryLifestyle,
      });

      setResult(response.result || null);
      await refreshHistory();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToDoctors = () => {
    const specialization = result?.recommendedSpecialty || 'General Physician';
    navigate(`/patient/appointments/book?specialization=${encodeURIComponent(specialization)}`);
  };

  return (
    <div className="dashboard animate-fade-in">
      <section className="welcome-card glass">
        <div>
          <p className="eyebrow">Risk score</p>
          <h1>Estimate your health risk score.</h1>
          <p>Enter key health details to calculate a preliminary risk estimate, see contributing factors, and plan your next step.</p>
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Risk score details</h2>
            <p>Provide your health values, family history, and lifestyle factors for a simple rule-based estimate.</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="booking-filter-grid">
            <label className="form-field">
              <span>Age</span>
              <input min="1" name="age" onChange={handleChange} type="number" value={form.age} />
            </label>

            <label className="form-field">
              <span>Gender</span>
              <select name="gender" onChange={handleChange} value={form.gender}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="form-field">
              <span>Height (cm)</span>
              <input min="1" name="heightCm" onChange={handleChange} type="number" value={form.heightCm} />
            </label>

            <label className="form-field">
              <span>Weight (kg)</span>
              <input min="1" name="weightKg" onChange={handleChange} type="number" value={form.weightKg} />
            </label>

            <div className="booking-schedule-note">
              <span>BMI preview</span>
              <strong>{bmiPreview || 'Enter height and weight'}</strong>
            </div>

            <label className="form-field">
              <span>Fasting blood sugar</span>
              <input name="fastingBloodSugar" onChange={handleChange} placeholder="100" type="number" value={form.fastingBloodSugar} />
            </label>

            <label className="form-field">
              <span>Blood pressure systolic</span>
              <input name="bloodPressureSystolic" onChange={handleChange} placeholder="120" type="number" value={form.bloodPressureSystolic} />
            </label>

            <label className="form-field">
              <span>Blood pressure diastolic</span>
              <input name="bloodPressureDiastolic" onChange={handleChange} placeholder="80" type="number" value={form.bloodPressureDiastolic} />
            </label>

            <label className="form-field">
              <span>Cholesterol</span>
              <input name="cholesterol" onChange={handleChange} placeholder="Optional" type="number" value={form.cholesterol} />
            </label>

            <label className="form-field">
              <span>Exercise frequency</span>
              <select name="exerciseFrequency" onChange={handleChange} value={form.exerciseFrequency}>
                <option value="regularly">Regularly</option>
                <option value="sometimes">Sometimes</option>
                <option value="rarely">Rarely</option>
              </select>
            </label>
          </div>

          <div className="risk-checkbox-grid">
            <label className="checkbox-field">
              <input checked={form.familyHistoryDiabetes} name="familyHistoryDiabetes" onChange={handleChange} type="checkbox" />
              <span>Family history of diabetes</span>
            </label>
            <label className="checkbox-field">
              <input checked={form.familyHistoryHypertension} name="familyHistoryHypertension" onChange={handleChange} type="checkbox" />
              <span>Family history of hypertension</span>
            </label>
            <label className="checkbox-field">
              <input checked={form.familyHistoryHeartDisease} name="familyHistoryHeartDisease" onChange={handleChange} type="checkbox" />
              <span>Family history of heart disease</span>
            </label>
            <label className="checkbox-field">
              <input checked={form.smoker} name="smoker" onChange={handleChange} type="checkbox" />
              <span>Smoker</span>
            </label>
            <label className="checkbox-field">
              <input checked={form.sedentaryLifestyle} name="sedentaryLifestyle" onChange={handleChange} type="checkbox" />
              <span>Sedentary lifestyle</span>
            </label>
          </div>

          <div className="booking-actions">
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Calculating...' : 'Calculate Risk'}
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
              <h2>Risk estimate result</h2>
              <p>Use this preliminary result as a planning tool, not a diagnosis.</p>
            </div>
          </div>

          <div className="confirmation-grid">
            <div className="dashboard-card glass">
              <h3>BMI</h3>
              <p className="card-value">{result.bmi}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>BMI category</h3>
              <p className="card-value">{result.bmiCategory}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Total score</h3>
              <p className="card-value">{result.score}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Risk level</h3>
              <p className="card-value">{result.riskLevel}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Blood pressure</h3>
              <p className="card-value">{result.bloodPressureCategory}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Blood sugar</h3>
              <p className="card-value">{result.bloodSugarCategory}</p>
            </div>
            <div className="dashboard-card glass">
              <h3>Recommended specialty</h3>
              <p className="card-value">{result.recommendedSpecialty}</p>
            </div>
          </div>

          <div className="list-card">
            <div>
              <h3>Key factors affecting your score</h3>
              <div className="history-bullet-list">
                {result.explanation?.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className={`pill ${formatRiskClass(result.riskLevel)}`}>
              {result.riskLevel} risk
            </div>
          </div>

          <div className="dashboard-columns">
            <div className="dashboard-section">
              <div className="section-header">
                <div>
                  <h2>Lifestyle risk contribution</h2>
                  <p>How much smoking, low exercise, and sedentary habits affected the total score.</p>
                </div>
              </div>

              <div className="metric-bar-grid">
                <MetricBar label="Smoking" value={result.lifestyleBreakdown?.smoker} max={2} />
                <MetricBar label="Low exercise" value={result.lifestyleBreakdown?.exercise} max={1} />
                <MetricBar label="Sedentary habits" value={result.lifestyleBreakdown?.sedentary} max={1} />
                <MetricBar label="Lifestyle total" value={result.lifestyleContribution} max={4} />
              </div>
            </div>

            <div className="dashboard-section">
              <div className="section-header">
                <div>
                  <h2>Top risk factors</h2>
                  <p>The three strongest reasons this score moved upward.</p>
                </div>
              </div>

              <div className="history-bullet-list">
                {(result.topRiskFactors?.length ? result.topRiskFactors : ['No major risk factors identified']).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="list-card">
            <div>
              <h3>Advice</h3>
              <p>{result.advice}</p>
            </div>
          </div>

          <p className="report-summary report-disclaimer">{result.disclaimer}</p>

          <div className="booking-actions">
            <button className="btn btn-secondary" onClick={() => refreshHistory()} type="button">
              Save result
            </button>
            <button className="btn btn-secondary" onClick={goToDoctors} type="button">
              Find doctors
            </button>
            <button className="btn btn-primary" onClick={goToDoctors} type="button">
              Book appointment
            </button>
          </div>
        </section>
      ) : null}

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Previous assessments</h2>
            <p>Your recent risk score history appears here for quick review.</p>
          </div>
        </div>

        {isHistoryLoading ? <p className="list-empty">Loading previous assessments...</p> : null}

        {!isHistoryLoading ? (
          <>
            <TrendChart history={history} />

            <div className="list-stack">
              {history.length ? history.map((item) => (
                <article className="list-card" key={item.id}>
                  <div>
                    <h3>{item.riskLevel} risk estimate</h3>
                    <p>{item.explanation?.[0] || 'Risk assessment saved'}</p>
                  </div>
                  <div className="list-meta">
                    <strong>{item.createdAtLabel}</strong>
                    <span>Score {item.score}</span>
                    <span>BMI {item.bmi}</span>
                  </div>
                </article>
              )) : <p className="list-empty">No risk assessments saved yet.</p>}
            </div>
          </>
        ) : null}
      </section>

      {error ? <p className="form-message error">{error}</p> : null}
    </div>
  );
}

export default RiskScorePage;
