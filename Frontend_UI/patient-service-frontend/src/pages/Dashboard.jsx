import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getPatientHome } from '../lib/api';
import './Dashboard.css';

function EmptyState({ label }) {
  return <p className="list-empty">{label}</p>;
}

function Dashboard({ auth, onProfileSync }) {
  const [homeData, setHomeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setIsLoading(true);
      setError('');

      try {
        const response = await getPatientHome(auth.token);
        if (!active) {
          return;
        }

        setHomeData(response);
        onProfileSync(response.user);
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

    loadHome();

    return () => {
      active = false;
    };
  }, [auth.token, onProfileSync]);

  if (isLoading) {
    return <div className="dashboard-state glass">Loading your patient dashboard...</div>;
  }

  if (error && !homeData) {
    return <div className="dashboard-state glass error">{error}</div>;
  }

  return (
    <div className="dashboard animate-fade-in">
      <section className="welcome-card glass">
        <div>
          <p className="eyebrow">Patient dashboard</p>
          <h1>{homeData?.welcomeCard?.title || 'Welcome back'}</h1>
          <p>{homeData?.welcomeCard?.subtitle}</p>
        </div>

        <div className="welcome-actions">
          <Link className="btn btn-primary" to={homeData?.quickActions?.profile?.route || '/patient/profile'}>
            {homeData?.quickActions?.profile?.ctaLabel || 'Open profile'}
          </Link>
          <a className="btn btn-secondary" href={homeData?.quickActions?.symptomChecker?.route || '/symptom-checker'}>
            {homeData?.quickActions?.symptomChecker?.ctaLabel || 'Start symptom check'}
          </a>
        </div>
      </section>

      <div className="dashboard-grid dashboard-grid-tight">
        {(homeData?.welcomeCard?.stats || []).map((stat) => (
          <div className="dashboard-card glass" key={stat.label}>
            <h3>{stat.label}</h3>
            <p className="card-value">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-columns">
        <section className="dashboard-section glass">
          <div className="section-header">
            <div>
              <h2>Upcoming appointments</h2>
              <p>Your next booked consultations and visit status.</p>
            </div>
          </div>

          <div className="list-stack">
            {homeData?.upcomingAppointments?.length ? homeData.upcomingAppointments.map((appointment) => (
              <article className="list-card" key={appointment.id}>
                <div>
                  <h3>{appointment.title}</h3>
                  <p>{appointment.clinician}</p>
                </div>
                <div className="list-meta">
                  <strong>{appointment.dateLabel}</strong>
                  <span>{appointment.location}</span>
                </div>
              </article>
            )) : <EmptyState label="No upcoming appointments yet." />}
          </div>
        </section>

        <section className="dashboard-section glass">
          <div className="section-header">
            <div>
              <h2>Recent prescriptions</h2>
              <p>The latest medicines and treatment notes issued to you.</p>
            </div>
          </div>

          <div className="list-stack">
            {homeData?.recentPrescriptions?.length ? homeData.recentPrescriptions.map((prescription) => (
              <article className="list-card" key={prescription.id}>
                <div>
                  <h3>{prescription.diagnosis}</h3>
                  <p>{prescription.doctorId}</p>
                </div>
                <div className="list-meta">
                  <strong>{prescription.createdAtLabel}</strong>
                  <span>{prescription.medicineCount} medicines</span>
                </div>
              </article>
            )) : <EmptyState label="No prescriptions yet." />}
          </div>
        </section>
      </div>

      <div className="dashboard-columns">
        <section className="dashboard-section glass">
          <div className="section-header">
            <div>
              <h2>Uploaded reports</h2>
              <p>Lab reports, scans, and clinical files you have added.</p>
            </div>
          </div>

          <div className="list-stack">
            {homeData?.uploadedReports?.length ? homeData.uploadedReports.map((report) => (
              <article className="list-card" key={report.id}>
                <div>
                  <h3>{report.name}</h3>
                  <p>{report.type}</p>
                </div>
                <div className="list-meta">
                  <strong>{report.uploadedAtLabel}</strong>
                  <span>{report.status}</span>
                </div>
              </article>
            )) : <EmptyState label="No uploaded reports yet." />}
          </div>
        </section>

        <section className="dashboard-section glass">
          <div className="section-header">
            <div>
              <h2>Reminders</h2>
              <p>Things worth updating so your care flow stays ready.</p>
            </div>
          </div>

          <div className="list-stack">
            {homeData?.reminders?.length ? homeData.reminders.map((reminder) => (
              <article className="list-card" key={reminder.id}>
                <div>
                  <h3>{reminder.title}</h3>
                  <p>{reminder.detail}</p>
                </div>
                <div className={`pill ${reminder.status}`}>
                  {reminder.status === 'good' ? 'Ready' : 'Action needed'}
                </div>
              </article>
            )) : <EmptyState label="No reminders right now." />}
          </div>
        </section>
      </div>

      <section className="dashboard-section glass symptom-entry">
        <div>
          <p className="eyebrow">Quick symptom checker</p>
          <h2>{homeData?.quickActions?.symptomChecker?.title || 'Start a quick symptom check'}</h2>
          <p>{homeData?.quickActions?.symptomChecker?.description}</p>
        </div>
        <a className="btn btn-primary" href={homeData?.quickActions?.symptomChecker?.route || '/symptom-checker'}>
          {homeData?.quickActions?.symptomChecker?.ctaLabel || 'Start symptom check'}
        </a>
      </section>
    </div>
  );
}

export default Dashboard;
