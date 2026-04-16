import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import {
  fetchAdminAnalyticsSummary,
  fetchAdminAppointmentAnalytics,
  fetchAdminDoctors,
  fetchAdminPatients,
  fetchAdminTransactions,
  updateDoctorAccount,
  updatePatientAccount,
  verifyDoctorAccount
} from '../services/platformApi';

const healthChecks = ['http://localhost:5001/health'];

export default function AdminConsolePage({ auth }) {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [summary, setSummary] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [appointmentAnalytics, setAppointmentAnalytics] = useState({ byDay: [], byStatus: {} });
  const [healthyServices, setHealthyServices] = useState(0);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const location = useLocation();

  useEffect(() => {
    const nextTab = new URLSearchParams(location.search).get('tab');
    if (nextTab && ['dashboard', 'doctors', 'patients', 'appointments', 'finance'].includes(nextTab)) {
      setTab(nextTab);
    }
  }, [location.search]);

  const readError = (requestError, fallback) =>
    requestError?.response?.data?.message || requestError?.message || fallback;

  const checkHealth = useCallback(async () => {
    const results = await Promise.all(
      healthChecks.map(async (url) => {
        try {
          const response = await fetch(url);
          return response.ok;
        } catch (_error) {
          return false;
        }
      })
    );

    return results.filter(Boolean).length;
  }, []);

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);

      const [adminSummary, adminDoctors, adminPatients, analytics, txList, healthCount] = await Promise.all([
        fetchAdminAnalyticsSummary(auth.token),
        fetchAdminDoctors(auth.token),
        fetchAdminPatients(auth.token),
        fetchAdminAppointmentAnalytics(auth.token),
        fetchAdminTransactions(auth.token),
        checkHealth()
      ]);

      setSummary(adminSummary || null);
      setDoctors(Array.isArray(adminDoctors) ? adminDoctors : []);
      setPatients(Array.isArray(adminPatients) ? adminPatients : []);
      setAppointmentAnalytics(analytics || { byDay: [], byStatus: {} });
      setTransactions(Array.isArray(txList) ? txList : []);
      setHealthyServices(healthCount);
      setError('');
    } catch (requestError) {
      setError(readError(requestError, 'Unable to load admin data from Atlas-backed service'));
    } finally {
      setLoading(false);
    }
  }, [auth, checkHealth]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const filteredDoctors = useMemo(() => {
    const term = doctorSearch.trim().toLowerCase();
    if (!term) return doctors;

    return doctors.filter((doctor) => {
      const values = [doctor.uniqueId, doctor.name, doctor.email, doctor.specialty, doctor.status].filter(Boolean).map(String).map((value) => value.toLowerCase());
      return values.some((value) => value.includes(term));
    });
  }, [doctors, doctorSearch]);

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patients;

    return patients.filter((patient) => {
      const values = [patient.uniqueId, patient.name, patient.email, patient.status].filter(Boolean).map(String).map((value) => value.toLowerCase());
      return values.some((value) => value.includes(term));
    });
  }, [patients, patientSearch]);

  const todaysRevenue = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((item) => {
        const date = new Date(item.createdAt || item.updatedAt);
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const paymentSuccessRate = useMemo(() => {
    if (!transactions.length) return '0%';
    const successCount = transactions.filter((item) => ['SUCCESS', 'PAID', 'COMPLETED'].includes(String(item.status || '').toUpperCase())).length;
    return `${Math.round((successCount / transactions.length) * 100)}%`;
  }, [transactions]);

  const openAppointments = Number(appointmentAnalytics?.byStatus?.PENDING || 0) + Number(appointmentAnalytics?.byStatus?.CONFIRMED || 0);
  const totalDoctors = summary?.totalDoctors || doctors.length;
  const totalPatients = summary?.totalPatients || patients.length;
  const totalUsers = summary?.totalUsers || totalDoctors + totalPatients;

  const actionError = (requestError, fallback) => toast.error(readError(requestError, fallback));

  const handleVerifyDoctor = async (doctorId) => {
    try {
      setBusyId(`verify-${doctorId}`);
      await verifyDoctorAccount(auth.token, doctorId);
      toast.success('Doctor verified');
      await loadAdminData();
    } catch (requestError) {
      actionError(requestError, 'Failed to verify doctor');
    } finally {
      setBusyId('');
    }
  };

  const handleDeactivateDoctor = async (doctorId) => {
    try {
      setBusyId(`deactivate-${doctorId}`);
      await updateDoctorAccount(auth.token, doctorId, { status: 'deactivated' });
      toast.success('Doctor deactivated');
      await loadAdminData();
    } catch (requestError) {
      actionError(requestError, 'Failed to deactivate doctor');
    } finally {
      setBusyId('');
    }
  };

  const handlePatientStatus = async (patientId, status) => {
    try {
      setBusyId(`patient-${patientId}-${status}`);
      await updatePatientAccount(auth.token, patientId, { status });
      toast.success(`Patient marked as ${status}`);
      await loadAdminData();
    } catch (requestError) {
      actionError(requestError, 'Failed to update patient status');
    } finally {
      setBusyId('');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'doctors', label: 'Doctor Management' },
    { id: 'patients', label: 'Patient Management' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'finance', label: 'Finance' }
  ];

  return (
    <div className="space-y-7 animate-fade-up">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-soft">
        <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-600">Admin control center</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Platform governance and operational visibility.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              All data is loaded from the Atlas-backed admin analytics microservice. Search by unique ID, verify or deactivate doctors, and manage patient account status from live MongoDB records.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] bg-brand-50 p-6 text-slate-900 shadow-soft sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <Metric label="Users" value={String(totalUsers)} />
            <Metric label="Doctors pending" value={String(doctors.filter((doctor) => ['pending', 'inactive'].includes(String(doctor.status || '').toLowerCase())).length)} />
            <Metric label="Daily revenue" value={`LKR ${Number(todaysRevenue || 0).toLocaleString()}`} />
          </div>
        </div>
      </section>

      <section className="panel p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item.id ? 'bg-brand-500 text-white shadow-soft' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? <div className="panel p-4 text-sm text-slate-500">Loading Atlas-backed admin data...</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {tab === 'dashboard' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="panel p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">System overview</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DataCard label="Total doctors" value={String(totalDoctors)} />
              <DataCard label="Total patients" value={String(totalPatients)} />
              <DataCard label="Healthy services" value={`${healthyServices}/1`} />
              <DataCard label="Open appointments" value={String(openAppointments)} />
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Appointment status monitor</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {Object.entries(appointmentAnalytics?.byStatus || {}).map(([status, count]) => (
                <DataCard key={status} label={status} value={String(count)} />
              ))}
              {!Object.keys(appointmentAnalytics?.byStatus || {}).length ? (
                <div className="rounded-2xl border border-dashed border-brand-100 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">No appointment status data available.</div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'doctors' ? (
        <section className="panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Doctor Management</h2>
              <p className="mt-1 text-sm text-slate-500">Search by unique ID, name, email, or specialty. Verify, activate, or deactivate doctor accounts.</p>
            </div>
            <input className="input max-w-sm" placeholder="Search doctors by unique ID" value={doctorSearch} onChange={(event) => setDoctorSearch(event.target.value)} />
          </div>

          <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white/70">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-100 text-sm">
                <thead className="bg-brand-50/70 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Unique ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Specialty</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50 bg-white">
                  {filteredDoctors.map((doctor) => {
                    const doctorId = doctor._id || doctor.id;
                    const status = String(doctor.status || '').toLowerCase();
                    return (
                      <tr key={doctorId} className="hover:bg-brand-50/30">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{doctor.uniqueId || doctorId}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{doctor.name || doctor.fullName || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600">{doctor.email || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600">{doctor.specialty || doctor.specialization || 'N/A'}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{doctor.status || 'active'}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {status !== 'verified' ? (
                              <ActionIconButton
                                type="button"
                                tone="success"
                                label="Verify doctor"
                                title="Verify doctor"
                                onClick={() => handleVerifyDoctor(doctorId)}
                                disabled={busyId === `verify-${doctorId}`}
                              >
                                <CheckIcon />
                              </ActionIconButton>
                            ) : null}
                            {status === 'deactivated' ? (
                              <ActionIconButton
                                type="button"
                                tone="primary"
                                label="Activate doctor"
                                title="Activate doctor"
                                onClick={() => updateDoctorAccount(auth.token, doctorId, { status: 'active' }).then(loadAdminData)}
                                disabled={busyId === `activate-${doctorId}`}
                              >
                                <RefreshIcon />
                              </ActionIconButton>
                            ) : (
                              <ActionIconButton
                                type="button"
                                tone="warning"
                                label="Deactivate doctor"
                                title="Deactivate doctor"
                                onClick={() => handleDeactivateDoctor(doctorId)}
                                disabled={busyId === `deactivate-${doctorId}`}
                              >
                                <PowerIcon />
                              </ActionIconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredDoctors.length ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>No doctors matched the search term.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'patients' ? (
        <section className="panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Patient Management</h2>
              <p className="mt-1 text-sm text-slate-500">Search by unique ID, name, or email and activate or deactivate patient records.</p>
            </div>
            <input className="input max-w-sm" placeholder="Search patients by unique ID" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} />
          </div>

          <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white/70">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-100 text-sm">
                <thead className="bg-brand-50/70 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Unique ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50 bg-white">
                  {filteredPatients.map((patient) => {
                    const patientId = patient._id || patient.id;
                    const isDeactivated = String(patient.status || '').toLowerCase() === 'deactivated';
                    return (
                      <tr key={patientId} className="hover:bg-brand-50/30">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{patient.uniqueId || patientId}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{patient.name || patient.fullName || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600">{patient.email || 'N/A'}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{patient.status || 'active'}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {isDeactivated ? (
                              <ActionIconButton
                                type="button"
                                tone="primary"
                                label="Activate patient"
                                title="Activate patient"
                                onClick={() => handlePatientStatus(patientId, 'active')}
                                disabled={busyId === `patient-${patientId}-active`}
                              >
                                <RefreshIcon />
                              </ActionIconButton>
                            ) : (
                              <ActionIconButton
                                type="button"
                                tone="warning"
                                label="Deactivate patient"
                                title="Deactivate patient"
                                onClick={() => handlePatientStatus(patientId, 'deactivated')}
                                disabled={busyId === `patient-${patientId}-deactivated`}
                              >
                                <PowerIcon />
                              </ActionIconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredPatients.length ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>No patients matched the search term.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'appointments' ? (
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="panel p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Appointments per day</h2>
            <div className="mt-4 space-y-2">
              {(appointmentAnalytics?.byDay || []).slice(-14).map((item) => (
                <div key={item.date} className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2 text-sm">
                  <span>{item.date}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {!appointmentAnalytics?.byDay?.length ? <div className="text-sm text-slate-500">No daily appointment analytics yet.</div> : null}
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Appointment status summary</h2>
            <div className="mt-4 space-y-2">
              {Object.entries(appointmentAnalytics?.byStatus || {}).map(([status, count]) => (
                <div key={status} className="rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{status}</span>
                    <strong>{count}</strong>
                  </div>
                </div>
              ))}
              {!Object.keys(appointmentAnalytics?.byStatus || {}).length ? <div className="text-sm text-slate-500">No appointment status data found.</div> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'finance' ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Financial tracking</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DataCard label="Revenue total" value={`LKR ${Number(summary?.revenue?.total || 0).toLocaleString()}`} />
              <DataCard label="Revenue currency" value={summary?.revenue?.currency || 'LKR'} />
              <DataCard label="Payment success" value={paymentSuccessRate} />
              <DataCard label="Transactions" value={String(transactions.length)} />
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Latest transactions</h2>
            <div className="mt-4 space-y-2">
              {transactions.slice(0, 12).map((item, index) => (
                <div key={item._id || index} className="rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{item.patientId || item.patientEmail || 'Unknown payer'}</span>
                    <strong>LKR {Number(item.amount || 0).toLocaleString()}</strong>
                  </div>
                  <p className="mt-1 text-slate-500">{item.status || 'recorded'} · {new Date(item.createdAt || Date.now()).toLocaleString()}</p>
                </div>
              ))}
              {!transactions.length ? <div className="text-sm text-slate-500">No transactions available.</div> : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function DataCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
    </article>
  );
}

function ActionIconButton({ children, tone, label, ...props }) {
  const toneClasses = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    primary: 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
  }[tone];

  return (
    <button
      {...props}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses}`}
    >
      {children}
    </button>
  );
}

function IconShell({ children }) {
  return <span className="flex h-4 w-4 items-center justify-center">{children}</span>;
}

function CheckIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </IconShell>
  );
}

function PowerIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v10" />
        <path d="M18.36 5.64a9 9 0 1 1-12.72 0" />
      </svg>
    </IconShell>
  );
}

function RefreshIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11a8.1 8.1 0 0 0-14.8-3M4 5v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 14.8 3M20 19v-4h-4" />
      </svg>
    </IconShell>
  );
}
