import { Link, useLocation } from 'react-router-dom';

const serviceMeta = {
  '/telemedicine': {
    title: 'Telemedicine Module',
    apiPath: '/api/telemedicine',
    summary: 'Planned workspace for async consultations, session links, and call state orchestration.'
  },
  '/appointments': {
    title: 'Appointment Module',
    apiPath: '/api/appointments',
    summary: 'Planned workspace for slot availability, booking flows, and status changes.'
  },
  '/ai-symptom-checker': {
    title: 'AI Symptom Checker Module',
    apiPath: '/api/ai/symptom-checker',
    summary: 'Planned workspace for symptom intake, triage requests, and asynchronous recommendations.'
  },
  '/payments': {
    title: 'Payment Module',
    apiPath: '/api/payments',
    summary: 'Planned workspace for payment initiation, transaction history, and settlement events.'
  },
  '/doctor-patient-services': {
    title: 'Doctor and Patient Services Module',
    apiPath: '/api/doctors and /api/patients',
    summary: 'Planned workspace for profile lifecycle, verification, and user-specific service operations.'
  }
};

function ServicePlaceholderPage() {
  const location = useLocation();
  const meta = serviceMeta[location.pathname] || {
    title: 'Service Module',
    apiPath: 'N/A',
    summary: 'This module is ready to be implemented.'
  };

  return (
    <section className="placeholder-page reveal">
      <p className="eyebrow">Future Module</p>
      <h1>{meta.title}</h1>
      <p className="lead">{meta.summary}</p>
      <div className="placeholder-card">
        <h2>Starter Integration Notes</h2>
        <p>
          Use this page as the module root and connect asynchronous calls to <strong>{meta.apiPath}</strong>.
        </p>
        <ul>
          <li>Create a module-specific API client.</li>
          <li>Add route-level state management for loading/error/success states.</li>
          <li>Reuse platform shell styles and navigation.</li>
        </ul>
      </div>
      <Link className="service-link" to="/">
        Back to Platform Home
      </Link>
    </section>
  );
}

export default ServicePlaceholderPage;
