import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { analyzePatientReport, deletePatientReport, getPatientHome, uploadPatientReport } from '../services/patientApi';
import './PatientInsightsPage.css';

const CARD_ICONS = ['\uD83D\uDCC5', '\uD83D\uDC68\u200D\u2695\uFE0F', '\uD83D\uDC8A'];
const initialReportForm = {
  reportType: '',
  reportDate: '',
  hospitalOrLabName: '',
  doctorName: '',
  notes: '',
};

function getAnalyzerTypeLabel(analyzerType) {
  if (analyzerType === 'text_report') {
    return 'Medical Report Analyzer';
  }

  if (analyzerType === 'image_scan') {
    return 'Experimental X-ray Insight';
  }

  return 'Analyzer not run yet';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [, fileContentBase64 = ''] = result.split(',');
      resolve(fileContentBase64);
    };
    reader.onerror = () => reject(new Error('Failed to read the selected file'));
    reader.readAsDataURL(file);
  });
}

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

function SectionHeader({ title, description, action, icon = '•' }) {
  return (
    <div className="section-header">
      <div>
        <p className="section-kicker">Care overview</p>
        <h2><span className="section-icon" aria-hidden="true">{icon}</span>{title}</h2>
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

function HistoryPreviewCard({ item }) {
  return (
    <article className="list-card" key={item.id}>
      <div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
      <div className="list-meta">
        <strong>{item.displayDate}</strong>
        <span>{item.status}</span>
      </div>
    </article>
  );
}

function ReportCard({ report, onAnalyze, onDelete, isAnalyzing, isDeleting }) {
  const findingLabel = report.analyzer?.findings?.[0] || '';
  const confidencePercent = typeof report.analyzer?.confidence === 'number'
    ? Math.round(report.analyzer.confidence * 100)
    : 0;
  const confidenceLabel = report.analyzer?.status === 'done'
    ? `${confidencePercent}% confidence`
    : report.analyzer?.status === 'processing'
      ? 'Analyzing...'
      : report.analyzer?.status === 'failed'
        ? 'Unavailable'
        : 'Awaiting analysis';
  const extractedValues = report.analyzer?.extractedValues && typeof report.analyzer.extractedValues === 'object'
    ? Object.entries(report.analyzer.extractedValues).filter(([, value]) => value)
    : [];
  const statusLabel = report.analyzer?.status === 'done'
    ? 'Analyzed'
    : report.analyzer?.status === 'processing'
      ? 'Processing'
      : report.analyzer?.status === 'failed'
        ? 'Failed'
        : 'Stored';

  return (
    <article className="list-card report-card" key={report.id}>
      <div className="list-card-main">
        <div className="list-card-heading">
          <div>
            <h3>{report.name}</h3>
            <p>{report.reportType} · {report.hospitalOrLabName}</p>
          </div>
          <span className={`status-badge ${report.analyzer?.status === 'done' ? 'good' : 'neutral'}`}>
            {statusLabel}
          </span>
        </div>
        <div className="appointment-details">
          <span>{report.reportDateLabel}</span>
          <span>{report.fileSizeLabel}</span>
          {report.doctorName ? <span>{report.doctorName}</span> : null}
        </div>
        <p className="report-summary"><strong>AI summary:</strong> {report.analyzer?.summary || findingLabel || 'Awaiting analysis'}</p>
        <p className="report-summary"><strong>{getAnalyzerTypeLabel(report.analyzer?.analyzerType)}</strong></p>
        {findingLabel ? <p className="report-summary"><strong>Possible finding:</strong> {findingLabel}</p> : null}
        <p className="report-summary"><strong>Confidence:</strong> {confidenceLabel}</p>
        {extractedValues.length ? (
          <p className="report-summary">
            <strong>Extracted values:</strong> {extractedValues.map(([key, value]) => `${key}: ${value}`).join(' | ')}
          </p>
        ) : null}
        <p className="report-summary report-disclaimer">{report.analyzer?.disclaimer || 'For informational use only — consult a doctor'}</p>
        {report.analyzer?.errorMessage ? (
          <p className="report-summary report-error"><strong>Analysis error:</strong> {report.analyzer.errorMessage}</p>
        ) : null}
      </div>
      <div className="list-meta">
        <strong>{report.uploadedAtLabel}</strong>
        <a href={report.fileUrl} rel="noreferrer" target="_blank">Open file</a>
        <button className="btn btn-secondary small" disabled={isAnalyzing || isDeleting} onClick={() => onAnalyze(report.id)} type="button">
          {isAnalyzing ? 'Analyzing...' : 'Run analyzer'}
        </button>
        <button className="btn btn-secondary small btn-delete" disabled={isAnalyzing || isDeleting} onClick={() => onDelete(report.id)} type="button">
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </article>
  );
}

function Dashboard({ auth, onProfileSync }) {
  const [homeData, setHomeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [analyzingReportId, setAnalyzingReportId] = useState('');
  const [deletingReportId, setDeletingReportId] = useState('');
  const [reportMessage, setReportMessage] = useState('');

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

  const refreshHome = async () => {
    const response = await getPatientHome(auth.token);
    setHomeData(response);
    onProfileSync(response.user);
  };

  const handleReportFieldChange = (event) => {
    const { name, value } = event.target;
    setReportForm((current) => ({ ...current, [name]: value }));
  };

  const handleReportFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const handleReportUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError('Choose a PDF or image file to upload.');
      return;
    }

    setIsUploadingReport(true);
    setError('');
    setReportMessage('');

    try {
      const fileContentBase64 = await fileToBase64(selectedFile);
      const response = await uploadPatientReport(auth.token, {
        ...reportForm,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        fileContentBase64,
      });

      await refreshHome();
      setReportForm(initialReportForm);
      setSelectedFile(null);
      setReportMessage(response.message || 'Report uploaded successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsUploadingReport(false);
    }
  };

  const handleAnalyzeReport = async (reportId) => {
    setAnalyzingReportId(reportId);
    setError('');
    setReportMessage('');

    try {
      const response = await analyzePatientReport(auth.token, reportId);
      await refreshHome();
      setReportMessage(response.message || 'Report analyzer completed.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAnalyzingReportId('');
    }
  };

  const handleDeleteReport = async (reportId) => {
    const confirmed = window.confirm('Delete this uploaded report? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setDeletingReportId(reportId);
    setError('');
    setReportMessage('');

    try {
      const response = await deletePatientReport(auth.token, reportId);
      await refreshHome();
      setReportMessage(response.message || 'Report deleted successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingReportId('');
    }
  };

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
            {homeData?.profile?.fullName ? <p className="text-muted">Currently viewing: {homeData.profile.fullName}&apos;s profile</p> : null}
          </div>

          <div className="welcome-actions">
            <Link className="btn btn-primary" to="/patient/appointments/book">
              Book appointment
            </Link>
            <Link className="btn btn-secondary" to={homeData?.quickActions?.profile?.route || '/profile'}>
              {homeData?.quickActions?.profile?.ctaLabel || 'Open profile'}
            </Link>
            <Link className="btn btn-secondary" to={homeData?.quickActions?.riskScore?.route || '/risk-score'}>
              {homeData?.quickActions?.riskScore?.ctaLabel || 'Calculate risk score'}
            </Link>
            <Link className="btn btn-secondary" to={homeData?.quickActions?.reminders?.route || '/reminders'}>
              {homeData?.quickActions?.reminders?.ctaLabel || 'Open reminders'}
            </Link>
            <Link className="btn btn-secondary" to={homeData?.quickActions?.symptomChecker?.route || '/symptom-checker'}>
              {homeData?.quickActions?.symptomChecker?.ctaLabel || 'Start symptom check'}
            </Link>
            <Link className="btn btn-secondary" to="/family-profiles">
              Family profiles
            </Link>
            <Link className="btn btn-secondary" to="/risk-score">
              Health risk analyzer
            </Link>
          </div>
        </section>

        <div className="dashboard-grid dashboard-grid-tight">
          {(homeData?.welcomeCard?.stats || []).map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        <section className="dashboard-section upload-records-card">
          <SectionHeader
            title="Upload Records"
            description="Add lab results, scans, and medical reports so they are available during your next consultation."
            icon="📁"
          />

          <form className="profile-form" onSubmit={handleReportUpload}>
            <div className="booking-filter-grid">
              <label className="form-field">
                <span>File</span>
                <input accept=".pdf,image/*" onChange={handleReportFileChange} type="file" />
              </label>
              <label className="form-field">
                <span>Report type</span>
                <input name="reportType" onChange={handleReportFieldChange} placeholder="Blood test, CT scan, lipid panel" value={reportForm.reportType} />
              </label>
              <label className="form-field">
                <span>Date</span>
                <input name="reportDate" onChange={handleReportFieldChange} type="date" value={reportForm.reportDate} />
              </label>
              <label className="form-field">
                <span>Hospital / lab name</span>
                <input name="hospitalOrLabName" onChange={handleReportFieldChange} placeholder="Lanka Hospital Lab" value={reportForm.hospitalOrLabName} />
              </label>
              <label className="form-field">
                <span>Doctor name</span>
                <input name="doctorName" onChange={handleReportFieldChange} placeholder="Optional" value={reportForm.doctorName} />
              </label>
              <label className="form-field">
                <span>Notes</span>
                <input name="notes" onChange={handleReportFieldChange} placeholder="Optional report notes" value={reportForm.notes} />
              </label>
            </div>

            <div className="booking-actions">
              <button className="btn btn-primary" disabled={isUploadingReport} type="submit">
                {isUploadingReport ? 'Uploading...' : 'Upload report'}
              </button>
              <p className="upload-records-note">Uploaded reports are attached to your care record and shared with the doctor when you book an appointment.</p>
            </div>
          </form>
        </section>

        <div className="dashboard-columns">
          <section className="dashboard-section">
            <SectionHeader
              title="Upcoming appointments"
              description="Your next booked consultations and current visit details."
              action={<Link className="btn btn-secondary small" to="/patient/appointments/book">Book appointment</Link>}
              icon="🗓️"
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
              icon="💊"
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
              icon="🧾"
            />

            <div className="list-stack">
              {homeData?.uploadedReports?.length ? homeData.uploadedReports.map((report) => (
                <ReportCard
                  isAnalyzing={analyzingReportId === report.id}
                  isDeleting={deletingReportId === report.id}
                  key={report.id}
                  onAnalyze={handleAnalyzeReport}
                  onDelete={handleDeleteReport}
                  report={report}
                />
              )) : <EmptyState label="No uploaded reports yet." />}
            </div>
          </section>

          <section className="dashboard-section">
            <SectionHeader
              title="Medical history"
              description="Your latest appointments, reports, prescriptions, and consultation updates."
              action={<Link className="btn btn-secondary small" to="/medical-history">Open timeline</Link>}
              icon="📚"
            />

            <div className="list-stack">
              {homeData?.recentHistory?.length ? homeData.recentHistory.map((item) => (
                <HistoryPreviewCard item={item} key={item.id} />
              )) : <EmptyState label="No medical history yet." />}
            </div>
          </section>

          <section className="dashboard-section">
            <SectionHeader
              title="Reminders"
              description="Things worth updating so your care flow stays ready."
              icon="⏰"
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
          <Link className="btn btn-primary" to={homeData?.quickActions?.symptomChecker?.route || '/symptom-checker'}>
            {homeData?.quickActions?.symptomChecker?.ctaLabel || 'Start symptom check'}
          </Link>
        </section>

        <div className="dashboard-grid dashboard-grid-tight">
          <div className="dashboard-card">
            <div>
              <h3>Health risk analyzer</h3>
              <p className="card-value">Track BMI and risk score trends</p>
              <p className="text-muted">Analyze your health factors and see risk changes on a timeline chart.</p>
              <Link className="btn btn-secondary small" to="/risk-score">Open analyzer</Link>
            </div>
          </div>

          <div className="dashboard-card">
            <div>
              <h3>Family profile management</h3>
              <p className="card-value">Manage multiple member profiles</p>
              <p className="text-muted">Add, edit, remove, and switch between dependent profiles under one account.</p>
              <Link className="btn btn-secondary small" to="/family-profiles">Open family profiles</Link>
            </div>
          </div>

          <div className="dashboard-card">
            <div>
              <h3>Quick symptom checker</h3>
              <p className="card-value">AI-assisted symptom review</p>
              <p className="text-muted">Get preliminary guidance and suggested specialties before booking.</p>
              <Link className="btn btn-secondary small" to="/symptom-checker">Start symptom check</Link>
            </div>
          </div>
        </div>

        {reportMessage ? <p className="form-message success compact-message">{reportMessage}</p> : null}
      </div>
    </div>
  );
}

export default Dashboard;
