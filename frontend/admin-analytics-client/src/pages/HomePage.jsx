import { Link } from 'react-router-dom';

const services = [
  {
    key: 'admin-analytics',
    name: 'Admin Analytics',
    route: '/admin-analytics',
    status: 'Live',
    description: 'Manage users, monitor analytics, review transactions, and inspect audit logs.'
  },
  {
    key: 'telemedicine',
    name: 'Telemedicine',
    route: '/telemedicine',
    status: 'Planned',
    description: 'Session scheduling, call links, and consultation lifecycle for remote care.'
  },
  {
    key: 'appointments',
    name: 'Appointments',
    route: '/appointments',
    status: 'Planned',
    description: 'Patient-doctor slot booking, reschedules, and appointment timeline management.'
  },
  {
    key: 'ai-symptom-checker',
    name: 'AI Symptom Checker',
    route: '/ai-symptom-checker',
    status: 'Planned',
    description: 'Asynchronous symptom triage workflow and recommendation orchestration.'
  },
  {
    key: 'payments',
    name: 'Payments',
    route: '/payments',
    status: 'Planned',
    description: 'Payment flows, transaction states, and finance event integration.'
  },
  {
    key: 'doctor-patient',
    name: 'Doctor and Patient Services',
    route: '/doctor-patient-services',
    status: 'Planned',
    description: 'Profiles, verification states, and domain operations for care participants.'
  }
];

function HomePage() {
  return (
    <section className="platform-home reveal">
      <p className="eyebrow">PrimeHealth Platform</p>
      <h1>Microservices Web Client</h1>
      <p className="lead">
        A single React website designed for incremental module development across all PrimeHealth services.
      </p>

      <div className="service-grid">
        {services.map((service) => (
          <article className="service-card" key={service.key}>
            <div className="service-head">
              <h2>{service.name}</h2>
              <span className={`status-pill ${service.status.toLowerCase()}`}>{service.status}</span>
            </div>
            <p>{service.description}</p>
            <Link to={service.route} className="service-link">
              Open Module
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
