import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatientTimeline } from '../services/patientApi';
import './Dashboard.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'report', label: 'Reports' },
  { id: 'consultation', label: 'Consultations' },
];

const TYPE_META = {
  appointment: { icon: 'AP', label: 'Appointment booked' },
  prescription: { icon: 'RX', label: 'Prescription issued' },
  report: { icon: 'RP', label: 'Report uploaded' },
  report_analysis: { icon: 'AI', label: 'Report analyzed' },
  consultation: { icon: 'VC', label: 'Consultation completed' },
};

function matchesFilter(item, activeFilter) {
  if (activeFilter === 'all') {
    return true;
  }

  if (activeFilter === 'report') {
    return item.type === 'report' || item.type === 'report_analysis';
  }

  return item.type === activeFilter;
}

function matchesSearch(item, query) {
  if (!query) {
    return true;
  }

  const searchable = [
    item.title,
    item.description,
    item.status,
    item.doctorOrHospital,
    TYPE_META[item.type]?.label,
  ].join(' ').toLowerCase();

  return searchable.includes(query.toLowerCase());
}

function HistoryAction({ action }) {
  if (!action?.href) {
    return null;
  }

  if (action.actionType === 'link') {
    return (
      <a className="btn btn-secondary small" href={action.href} rel="noreferrer" target="_blank">
        {action.label}
      </a>
    );
  }

  return (
    <Link className="btn btn-secondary small" to={action.href}>
      {action.label}
    </Link>
  );
}

function MedicalHistoryPage({ auth }) {
  const [timeline, setTimeline] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadTimeline() {
      setIsLoading(true);
      setError('');

      try {
        const response = await getPatientTimeline(auth.token);
        if (!active) {
          return;
        }

        setTimeline(response.timeline || []);
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadTimeline();

    return () => {
      active = false;
    };
  }, [auth.token]);

  const filteredTimeline = useMemo(
    () => timeline.filter((item) => matchesFilter(item, activeFilter) && matchesSearch(item, search)),
    [activeFilter, search, timeline],
  );

  return (
    <div className="dashboard animate-fade-in">
      <section className="welcome-card glass">
        <div>
          <p className="eyebrow">Medical history</p>
          <h1>Medical History</h1>
          <p>Your appointments, reports, prescriptions, and consultations in one timeline.</p>
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="history-toolbar">
          <label className="form-field history-search">
            <span>Search timeline</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search appointments, doctors, reports, or prescriptions"
              value={search}
            />
          </label>

          <div className="history-filter-row">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                className={`btn ${activeFilter === filter.id ? 'btn-primary' : 'btn-secondary'} small`}
                onClick={() => setActiveFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Timeline</h2>
            <p>Newest events appear first so you can quickly review your recent care activity.</p>
          </div>
        </div>

        {isLoading ? <p className="list-empty">Loading medical history...</p> : null}
        {error ? <p className="form-message error">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="history-timeline">
            {filteredTimeline.length ? filteredTimeline.map((item) => {
              const meta = TYPE_META[item.type] || { icon: 'PH', label: 'Medical event' };

              return (
                <article className="history-card" key={item.id}>
                  <div className="history-card-icon" aria-hidden="true">{meta.icon}</div>

                  <div className="history-card-main">
                    <div className="history-card-top">
                      <div>
                        <p className="section-kicker">{meta.label}</p>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                      <span className={`status-badge ${String(item.status || '').toLowerCase().includes('complete') || String(item.status || '').toLowerCase().includes('issue') || String(item.status || '').toLowerCase().includes('analyzed') ? 'good' : 'neutral'}`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="history-card-meta">
                      <span>{item.displayDate}</span>
                      {item.doctorOrHospital ? <span>{item.doctorOrHospital}</span> : null}
                    </div>
                  </div>

                  <div className="history-card-actions">
                    <HistoryAction action={item.action} />
                  </div>
                </article>
              );
            }) : <p className="list-empty">No medical history matches the current search or filter.</p>}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default MedicalHistoryPage;
