import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_DOCTOR } from '../config/apiBase';
import {
  fetchDoctorEarnings,
  fetchDoctorPatientReports,
  fetchDoctorReviews,
  fetchDoctorUpcomingAppointments,
  getDoctors
} from '../services/doctorService';
import StarRating from '../components/StarRating';
import {
  fetchDoctorAppointments,
  fetchDoctorPrescriptions,
  fetchTelemedicineSessions
} from '../services/platformApi';
import { resolveCurrentDoctor } from '../utils/currentDoctor';

function formatDate(value) {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString();
}

function resolvePatientDisplayName(item) {
  return item?.patientName || item?.patient?.name || item?.patient?.fullName || 'Unknown patient';
}

function getDoctorImageSrc(profilePicture) {
  if (!profilePicture) return 'https://placehold.co/120x120?text=Doctor';
  if (String(profilePicture).startsWith('http')) return profilePicture;
  const base = API_BASE_DOCTOR.replace(/\/+$/, '');
  const path = String(profilePicture).startsWith('/') ? profilePicture : `/${profilePicture}`;
  return `${base}${path}`;
}

export default function DoctorWorkspacePage({ auth }) {
  const [appointments, setAppointments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [patientReports, setPatientReports] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalRatings: 0, reviews: [] });
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    currentMonthEarnings: 0,
    completedPaidConsultations: 0,
    monthlyHistory: []
  });

  const doctorKeys = useMemo(
    () =>
      [
        auth?.user?.id,
        auth?.user?._id,
        auth?.user?.userId,
        auth?.user?.uniqueId,
        auth?.user?.email
      ]
        .filter(Boolean)
        .map((value) => String(value)),
    [auth?.user]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [doctorList, appointmentList, sessionList] = await Promise.all([
        getDoctors().catch(() => []),
        fetchDoctorAppointments(auth).catch(() => []),
        fetchTelemedicineSessions(auth.token).catch(() => [])
      ]);

      if (!mounted) return;

      const resolvedDoctor = resolveCurrentDoctor(Array.isArray(doctorList) ? doctorList : []).doctor;
      setDoctor(resolvedDoctor);
      setAppointments(Array.isArray(appointmentList) ? appointmentList : []);
      setSessions(Array.isArray(sessionList) ? sessionList : []);

      const doctorIdForPrescription =
        resolvedDoctor?._id || auth?.user?.id || auth?.user?._id || auth?.user?.userId;
      const prescriptionList = await fetchDoctorPrescriptions(auth.token, doctorIdForPrescription).catch(() => []);

      if (!mounted) return;
      setPrescriptions(Array.isArray(prescriptionList) ? prescriptionList : []);

      if (!doctorIdForPrescription) {
        return;
      }

      const [upcoming, reports, reviews, earningsSummary] = await Promise.all([
        fetchDoctorUpcomingAppointments(doctorIdForPrescription, 6).catch(() => []),
        fetchDoctorPatientReports(doctorIdForPrescription, 8).catch(() => []),
        fetchDoctorReviews(doctorIdForPrescription).catch(() => ({ averageRating: 0, totalRatings: 0, reviews: [] })),
        fetchDoctorEarnings(doctorIdForPrescription).catch(() => ({
          totalEarnings: 0,
          currentMonthEarnings: 0,
          completedPaidConsultations: 0,
          monthlyHistory: []
        }))
      ]);

      if (!mounted) return;
      setUpcomingAppointments(Array.isArray(upcoming) ? upcoming : []);
      setPatientReports(Array.isArray(reports) ? reports : []);
      setReviewSummary(reviews);
      setEarnings(earningsSummary);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth]);

  const doctorAppointments = useMemo(() => {
    const filtered = appointments.filter((item) => {
      const doctorId = String(item?.doctorId || item?.doctor?._id || item?.doctor?.id || '');
      return doctorKeys.includes(doctorId);
    });

    return filtered.length ? filtered : appointments;
  }, [appointments, doctorKeys]);

  const doctorSessions = useMemo(() => {
    const filtered = sessions.filter((item) => {
      const doctorId = String(item?.doctorId || item?.doctor?._id || item?.doctor?.id || '');
      return doctorKeys.includes(doctorId);
    });

    return filtered.length ? filtered : sessions;
  }, [sessions, doctorKeys]);

  const liveSessionCount = useMemo(
    () => doctorSessions.filter((item) => item?.status === 'live').length,
    [doctorSessions]
  );
  const visibleUpcomingAppointments = useMemo(() => {
    if (upcomingAppointments.length) {
      return upcomingAppointments;
    }

    const now = Date.now();
    return doctorAppointments
      .filter((item) => {
        const datePart = String(item?.appointmentDate || '').slice(0, 10);
        const timePart = String(item?.startTime || item?.appointmentTime || '00:00').slice(0, 5);
        const combinedAt = new Date(`${datePart}T${timePart}:00`).getTime();
        const appointmentAt = Number.isFinite(combinedAt) && combinedAt > 0
          ? combinedAt
          : new Date(item?.appointmentDate || 0).getTime();
        const status = String(item?.status || '').toUpperCase();
        return appointmentAt >= now && !['CANCELLED', 'COMPLETED'].includes(status);
      })
      .slice(0, 6)
      .map((item) => ({
        id: item.id || item._id,
        patientId: item.patientId,
        patientName: item.patientName,
        appointmentDate: item.appointmentDate,
        appointmentTime: item.startTime || item.appointmentTime,
        status: item.status,
        reason: item.reason || ''
      }));
  }, [doctorAppointments, upcomingAppointments]);
  const availabilityPath = doctor?._id || doctor?.id ? `/doctors/${doctor?._id || doctor?.id}` : '/doctors';

  return (
    <div className="space-y-7 animate-fade-up">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-soft">
        <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-600">Doctor workspace</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Welcome Dr. {doctor?.name || auth.user?.fullName || auth.user?.name || 'Doctor'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Manage profile, availability, appointments, patient reports, ratings, and revenue in one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="button-primary" to="/doctor/profile">Edit profile</Link>
              <Link className="button-secondary" to={availabilityPath}>Availability management</Link>
              <Link className="button-secondary" to="/doctor/earnings">Earnings</Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] bg-brand-50 p-6 text-slate-900 shadow-soft sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">Overall Rating</p>
              <div className="mt-2">
                <StarRating
                  value={reviewSummary.averageRating}
                  size="sm"
                  showValue
                  reviewCount={reviewSummary.totalRatings}
                />
              </div>
            </div>
            <DoctorMetric label="Appointments" value={String(doctorAppointments.length)} />
            <DoctorMetric label="Live sessions" value={String(liveSessionCount)} />
            <DoctorMetric label="Prescriptions" value={String(prescriptions.length)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Doctor profile summary</h2>
            <Link className="text-sm font-semibold text-brand-700" to="/doctor/profile">Edit profile</Link>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
            <img
              src={getDoctorImageSrc(doctor?.profilePicture)}
              alt="Doctor profile"
              className="h-16 w-16 rounded-full border-2 border-brand-100 object-cover"
            />
            <div>
              <p className="text-base font-semibold text-slate-900">Dr. {doctor?.name || '-'}</p>
              <p className="text-sm text-slate-600">{doctor?.specialization || 'General practice'}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p><strong>Name:</strong> {doctor?.name || '-'}</p>
            <p><strong>Email:</strong> {doctor?.email || '-'}</p>
            <p className="flex items-center gap-2">
              <ContactIcon />
              <span><strong>Phone:</strong> {doctor?.phoneNumber || '-'}</span>
            </p>
            <p><strong>Specialization:</strong> {doctor?.specialization || '-'}</p>
            <p className="flex items-center gap-2">
              <QualificationIcon />
              <span><strong>Qualifications:</strong> {doctor?.qualifications || '-'}</span>
            </p>
            <p><strong>Experience:</strong> {doctor?.experience || 0} years</p>
            <p className="flex items-center gap-2">
              <HospitalIcon />
              <span><strong>Hospital / Clinic:</strong> {doctor?.hospitalOrClinic || '-'}</span>
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Ratings and reviews</h2>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
              <StarRating
                value={reviewSummary.averageRating}
                size="sm"
                showValue
                reviewCount={reviewSummary.totalRatings}
              />
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {(reviewSummary.reviews || []).slice(0, 3).map((item) => (
              <article key={item._id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
                <p className="text-sm font-semibold text-slate-900">{resolvePatientDisplayName(item)}</p>
                <div className="mt-0.5">
                  <StarRating value={item.rating} size="sm" />
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.review || 'No comment provided.'}</p>
              </article>
            ))}
            {!reviewSummary.reviews?.length ? (
              <p className="text-sm text-slate-500">No ratings yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-soft">
          <h2 className="text-xl font-bold text-slate-900">Upcoming appointments</h2>
          <div className="mt-4 space-y-3">
            {visibleUpcomingAppointments.length ? visibleUpcomingAppointments.map((item) => (
              <article key={item.id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
                <p className="text-sm font-semibold text-slate-900">{resolvePatientDisplayName(item)}</p>
                <p className="text-xs text-slate-500">{formatDate(item.appointmentDate)} • {item.appointmentTime || 'TBD'}</p>
                <p className="text-xs text-slate-500">Status: {item.status || 'PENDING'}</p>
                {item.reason ? <p className="mt-1 text-sm text-slate-600">{item.reason}</p> : null}
              </article>
            )) : <p className="text-sm text-slate-500">No upcoming appointments found.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-soft">
          <h2 className="text-xl font-bold text-slate-900">Patient reports</h2>
          <div className="mt-4 space-y-3">
            {patientReports.length ? patientReports.map((item, index) => (
              <article key={`${item.reportId || index}`} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.patientName || item.patientId}</p>
                <p className="text-xs text-slate-500">{item.fileName || 'Report file'} • {item.reportType || 'General'}</p>
                <p className="text-xs text-slate-500">Uploaded: {formatDate(item.uploadedAt)}</p>
                {item.fileUrl ? (
                  <a className="mt-1 inline-block text-sm font-semibold text-brand-700" href={item.fileUrl} target="_blank" rel="noreferrer">View report</a>
                ) : null}
              </article>
            )) : <p className="text-sm text-slate-500">No patient reports found.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Earnings / Revenue</h2>
          <Link className="button-secondary" to="/doctor/earnings">Open earnings page</Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <DoctorMetric label="Total earnings" value={`LKR ${Number(earnings.totalEarnings || 0).toFixed(2)}`} />
          <DoctorMetric label="Current month" value={`LKR ${Number(earnings.currentMonthEarnings || 0).toFixed(2)}`} />
          <DoctorMetric label="Paid consultations" value={String(earnings.completedPaidConsultations || 0)} />
        </div>
      </section>
    </div>
  );
}

function DoctorMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function ContactIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-slate-500" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </span>
  );
}

function QualificationIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-slate-500" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1.5 2.69 3 6 3s6-1.5 6-3v-5" />
      </svg>
    </span>
  );
}

function HospitalIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-slate-500" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4 6 4v14" />
        <path d="M9 9h2" />
        <path d="M9 13h2" />
        <path d="M13 9h2" />
        <path d="M13 13h2" />
        <path d="M11 21v-4h2v4" />
      </svg>
    </span>
  );
}
