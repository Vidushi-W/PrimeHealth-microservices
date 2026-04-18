import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDoctorEarnings,
  fetchDoctorPatientReports,
  fetchDoctorReviews,
  fetchDoctorUpcomingAppointments,
  getDoctors
} from '../services/doctorService';
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
              <Link className="button-secondary" to="/doctors">Availability management</Link>
              <Link className="button-secondary" to="/doctor/earnings">Earnings</Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] bg-brand-50 p-6 text-slate-900 shadow-soft sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p><strong>Name:</strong> {doctor?.name || '-'}</p>
            <p><strong>Email:</strong> {doctor?.email || '-'}</p>
            <p><strong>Phone:</strong> {doctor?.phoneNumber || '-'}</p>
            <p><strong>Specialization:</strong> {doctor?.specialization || '-'}</p>
            <p><strong>Qualifications:</strong> {doctor?.qualifications || '-'}</p>
            <p><strong>Experience:</strong> {doctor?.experience || 0} years</p>
            <p><strong>Hospital / Clinic:</strong> {doctor?.hospitalOrClinic || '-'}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Ratings and reviews</h2>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {Number(reviewSummary.averageRating || 0).toFixed(1)} / 5 ({reviewSummary.totalRatings || 0})
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {(reviewSummary.reviews || []).slice(0, 3).map((item) => (
              <article key={item._id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3">
                <p className="text-sm font-semibold text-slate-900">{resolvePatientDisplayName(item)}</p>
                <p className="text-xs text-slate-500">Rating: {item.rating}/5</p>
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
            {upcomingAppointments.length ? upcomingAppointments.map((item) => (
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
