import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getPatientHome } from '../lib/api';
import './Dashboard.css';

const CARD_ICONS = ['BG', 'ICE', 'MAIL'];

function EmptyState({ label, ctaLabel, ctaTo }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">+</div>
      <div>
        <p className="empty-state-title">{label}</p>
        <p className="empty-state-copy">This section will update here as soon as new information becomes available.</p>
      </div>
      {ctaLabel && ctaTo ? <Link className="btn btn-secondary small" to={ctaTo}>{ctaLabel}</Link> : null}
    </div>
  );
}

function StatCard({ stat, index }) {
  return (
    <div className="dashboard-card stat-card" key={stat.label}>
      <div className="stat-icon" aria-hidden="true">{CARD_ICONS[index] || 'PH'}</div>
      <div>
        <h3>{stat.label}</h3>
        <p className="card-value">{stat.value}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="section-header">
      <div>
        <p className="section-kicker">Care overview</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function AppointmentCard({ appointment }) {
  const statusTone = appointment.status?.toLowerCase().includes('confirm') ? 'good' : 'neutral';

  return (
    <article className="list-card appointment-card" key={appointment.id}>
      <div className="list-card-main">
        <div className="list-card-heading">
          <div>
            <h3>{appointment.title}</h3>
            <p>{appointment.clinician}</p>
          </div>
          {appointment.status ? <span className={`status-badge ${statusTone}`}>{appointment.status}</span> : null}
        </div>
        <div className="appointment-details">
          <span>{appointment.dateLabel}</span>
          <span>{appointment.timeSlot || appointment.location}</span>
          <span>{appointment.mode ? `${appointment.mode} consultation` : appointment.location}</span>
        </div>
      </div>
      <div className="list-meta">
        <strong>{appointment.paymentStatus || 'Ready'}</strong>
        <span>{appointment.location}</span>
      </div>
    </article>
  );
}

function DetailCard({ item }) {
  return (
    <article className="list-card" key={item.id}>
      <div>
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
      </div>
      <div className="list-meta">
        <strong>{item.metaPrimary}</strong>
        {item.metaSecondary ? <span>{item.metaSecondary}</span> : null}
      </div>
    </article>
  );
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
    <div className="dashboard-shell animate-fade-in">
      <div className="dashboard dashboard-patient">
        <section className="welcome-card">
          <div className="welcome-copy">
            <p className="eyebrow">Patient dashboard</p>
            <h1>{homeData?.welcomeCard?.title || 'Welcome back'}</h1>
            <p>{homeData?.welcomeCard?.subtitle}</p>
          </div>

          <div className="welcome-actions">
            <Link className="btn btn-primary" to="/patient/appointments/book">
              Book appointment
            </Link>
            <Link className="btn btn-secondary" to={homeData?.quickActions?.profile?.route || '/patient/profile'}>
              {homeData?.quickActions?.profile?.ctaLabel || 'Open profile'}
            </Link>
            <a className="btn btn-secondary" href={homeData?.quickActions?.symptomChecker?.route || '/symptom-checker'}>
              {homeData?.quickActions?.symptomChecker?.ctaLabel || 'Start symptom check'}
            </a>
          </div>
        </section>

        <div className="dashboard-grid dashboard-grid-tight">
          {(homeData?.welcomeCard?.stats || []).map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        <div className="dashboard-columns">
          <section className="dashboard-section">
            <SectionHeader
              title="Upcoming appointments"
              description="Your next booked consultations and current visit details."
              action={<Link className="btn btn-secondary small" to="/patient/appointments/book">Book appointment</Link>}
            />

            <div className="list-stack">
              {homeData?.upcomingAppointments?.length ? homeData.upcomingAppointments.map((appointment) => (
                <AppointmentCard appointment={appointment} key={appointment.id} />
              )) : <EmptyState label="No upcoming appointments yet." ctaLabel="Book appointment" ctaTo="/patient/appointments/book" />}
            </div>
          </section>

          <section className="dashboard-section">
            <SectionHeader
              title="Recent prescriptions"
              description="The latest medicines and treatment notes issued to you."
            />

            <div className="list-stack">
              {homeData?.recentPrescriptions?.length ? homeData.recentPrescriptions.map((prescription) => (
                <DetailCard
                  key={prescription.id}
                  item={{
                    id: prescription.id,
                    title: prescription.diagnosis,
                    subtitle: prescription.doctorId,
                    metaPrimary: prescription.createdAtLabel,
                    metaSecondary: `${prescription.medicineCount} medicines`,
                  }}
                />
              )) : <EmptyState label="No prescriptions yet." />}
            </div>
          </section>
        </div>

        <div className="dashboard-columns">
          <section className="dashboard-section">
            <SectionHeader
              title="Uploaded reports"
              description="Lab reports, scans, and clinical files you have added."
            />

            <div className="list-stack">
              {homeData?.uploadedReports?.length ? homeData.uploadedReports.map((report) => (
                <DetailCard
                  key={report.id}
                  item={{
                    id: report.id,
                    title: report.name,
                    subtitle: report.type,
                    metaPrimary: report.uploadedAtLabel,
                    metaSecondary: report.status,
                  }}
                />
              )) : <EmptyState label="No uploaded reports yet." />}
            </div>
          </section>

          <section className="dashboard-section">
            <SectionHeader
              title="Reminders"
              description="Things worth updating so your care flow stays ready."
            />

            <div className="list-stack">
              {homeData?.reminders?.length ? homeData.reminders.map((reminder) => (
                <article className="list-card reminder-card" key={reminder.id}>
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

        <section className="dashboard-section symptom-entry">
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
    </div>
  );
}

export default Dashboard;
