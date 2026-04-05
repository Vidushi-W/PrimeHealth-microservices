import { useMemo, useState } from 'react';

const statusOptions = ['active', 'inactive', 'pending', 'verified', 'suspended', 'deactivated'];

const defaultData = {
  health: null,
  meta: null,
  summary: null,
  appointments: null,
  users: [],
  doctors: [],
  audits: [],
  transactions: []
};

function fmtCurrency(value) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function Info({ message, type }) {
  return message ? <div className={`info ${type || ''}`} role="alert" aria-live="polite">{message}</div> : null;
}

function Card({ title, value }) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DataTable({ columns, rows }) {
  if (!rows?.length) return <p className="empty">No records found.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c.title}>{c.title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row._id || idx}>
              {columns.map((c) => (
                <td key={c.title}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState({
    baseUrl: 'http://localhost:5001',
    email: '',
    password: '',
    role: 'admin',
    name: '',
    specialty: '',
    token: '',
    tokenRole: ''
  });
  const [data, setData] = useState(defaultData);
  const [ui, setUi] = useState({ authMsg: '', authType: '', msg: '', msgType: '', loading: false, view: 'overview', authMode: 'login' });

  const [statusForm, setStatusForm] = useState({ role: '', id: '', status: '' });
  const [deactivateForm, setDeactivateForm] = useState({ role: '', id: '' });
  const [verifyDoctorId, setVerifyDoctorId] = useState('');

  const isLoggedIn = Boolean(auth.token);
  const isAdminSession = isLoggedIn && auth.tokenRole === 'admin';

  const request = async (path, options = {}, needsAuth = true, tokenOverride = '') => {
    const headers = { ...(options.headers || {}) };
    const activeToken = tokenOverride || auth.token;
    if (needsAuth && activeToken) headers.Authorization = `Bearer ${activeToken}`;

    const normalizedBaseUrl = auth.baseUrl.trim().replace(/\/+$/, '');
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Avoid duplicate /api segment when users enter base URL ending with /api.
    if (normalizedBaseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      normalizedPath = normalizedPath.slice(4);
    }

    const res = await fetch(`${normalizedBaseUrl}${normalizedPath}`, { ...options, headers });
    const raw = await res.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = { message: raw || 'Unknown response' };
    }

    if (!res.ok) {
      const err = new Error(payload?.message || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }

    return payload;
  };

  const setGlobal = (message, msgType = '') => setUi((u) => ({ ...u, msg: message, msgType }));

  const refreshAll = async (tokenOverride = '') => {
    try {
      setUi((u) => ({ ...u, loading: true }));
      setGlobal('Refreshing data...');

      const [health, meta, summary, appointments, usersRes, doctors, auditsRes, transactions] = await Promise.all([
        request('/health', {}, false),
        request('/api/admin/meta', {}, false),
        request('/api/admin/analytics/summary', {}, true, tokenOverride),
        request('/api/admin/analytics/appointments', {}, true, tokenOverride),
        request('/api/admin/users?page=1&limit=20&sortBy=createdAt&sortOrder=desc', {}, true, tokenOverride),
        request('/api/admin/users/doctors', {}, true, tokenOverride),
        request('/api/admin/audit-logs?page=1&limit=20', {}, true, tokenOverride),
        request('/api/admin/finance/transactions', {}, true, tokenOverride)
      ]);

      setData({
        health,
        meta,
        summary,
        appointments,
        users: usersRes?.users || [],
        doctors: doctors || [],
        audits: auditsRes?.logs || [],
        transactions: transactions || []
      });

      setGlobal('Data refreshed.', 'success');
    } catch (err) {
      setGlobal(`${err.message} (status: ${err.status || 'n/a'})`, 'error');
    } finally {
      setUi((u) => ({ ...u, loading: false }));
    }
  };

  const onLogin = async (e) => {
    e.preventDefault();
    try {
      setUi((u) => ({ ...u, authMsg: 'Authenticating...', authType: '' }));
      const payload = await request(
        '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: auth.role,
            email: auth.email.trim(),
            password: auth.password
          })
        },
        false
      );

      if (!payload?.token) throw new Error('Login succeeded but token missing.');

      setAuth((a) => ({ ...a, token: payload.token, tokenRole: payload.role || auth.role }));
      setUi((u) => ({ ...u, authMsg: '', authType: '' }));

      if ((payload.role || auth.role) === 'admin') {
        await refreshAll(payload.token);
      } else {
        setUi((u) => ({
          ...u,
          authMsg: `${payload.role || auth.role} login successful. Admin dashboard is only available for admin role.`,
          authType: 'success'
        }));
      }
    } catch (err) {
      if (err.status === 401) {
        setUi((u) => ({
          ...u,
          authMsg: 'Invalid credentials (401). Please check your email and password.',
          authType: 'error'
        }));
        return;
      }

      setUi((u) => ({ ...u, authMsg: `${err.message} (status: ${err.status || 'n/a'})`, authType: 'error' }));
    }
  };

  const onRegister = async (e) => {
    e.preventDefault();
    try {
      setUi((u) => ({ ...u, authMsg: 'Creating account...', authType: '' }));

      const body = {
        role: auth.role,
        email: auth.email.trim(),
        password: auth.password
      };

      if (auth.role === 'doctor' || auth.role === 'patient') {
        body.name = auth.name.trim();
      }

      if (auth.role === 'doctor') {
        body.specialty = auth.specialty.trim();
      }

      const payload = await request(
        '/api/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        },
        false
      );

      setUi((u) => ({
        ...u,
        authMsg: payload?.message || 'Registration completed. You can login now.',
        authType: 'success',
        authMode: 'login'
      }));
    } catch (err) {
      setUi((u) => ({ ...u, authMsg: `${err.message} (status: ${err.status || 'n/a'})`, authType: 'error' }));
    }
  };

  const updateStatus = async (e) => {
    e.preventDefault();
    try {
      await request(`/api/admin/users/${statusForm.role}/${statusForm.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusForm.status })
      });
      await refreshAll();
      setGlobal(`Status updated to ${statusForm.status}.`, 'success');
    } catch (err) {
      setGlobal(`${err.message} (status: ${err.status || 'n/a'})`, 'error');
    }
  };

  const deactivate = async (e) => {
    e.preventDefault();
    try {
      await request(`/api/admin/users/${deactivateForm.role}/${deactivateForm.id}/deactivate`, { method: 'PATCH' });
      await refreshAll();
      setGlobal('User deactivated.', 'success');
    } catch (err) {
      setGlobal(`${err.message} (status: ${err.status || 'n/a'})`, 'error');
    }
  };

  const verifyDoctor = async (e) => {
    e.preventDefault();
    try {
      await request(`/api/admin/users/doctors/${verifyDoctorId}/verify`, { method: 'PATCH' });
      await refreshAll();
      setGlobal('Doctor verified.', 'success');
    } catch (err) {
      setGlobal(`${err.message} (status: ${err.status || 'n/a'})`, 'error');
    }
  };

  const serviceState = useMemo(() => {
    if (!data.health) return 'Not connected yet';
    return `${data.health.status || 'unknown'} | DB: ${data.health.database || 'unknown'} | Config: ${data.health.config || 'unknown'}`;
  }, [data.health]);

  return (
    <main className="app-shell">
      <div className="background-layer" aria-hidden="true" />

      {!isLoggedIn && (
        <section className="auth-card">
          <h1>PrimeHealth Auth + Admin Console</h1>
          <p>Centralized registration/login through the base admin microservice.</p>

          <div className="topbar-actions" role="group" aria-label="Authentication mode">
            <button 
              type="button" 
              className={ui.authMode === 'login' ? 'auth-tab active' : 'auth-tab'} 
              onClick={() => setUi((u) => ({ ...u, authMode: 'login', authMsg: '' }))}
              aria-current={ui.authMode === 'login' ? 'page' : 'false'}
            >
              Login
            </button>
            <button 
              type="button" 
              className={ui.authMode === 'register' ? 'auth-tab active' : 'auth-tab'} 
              onClick={() => setUi((u) => ({ ...u, authMode: 'register', authMsg: '' }))}
              aria-current={ui.authMode === 'register' ? 'page' : 'false'}
            >
              Register
            </button>
          </div>

          <form onSubmit={ui.authMode === 'login' ? onLogin : onRegister}>
            <label htmlFor="base-url">Admin Service URL</label>
            <input id="base-url" value={auth.baseUrl} onChange={(e) => setAuth((a) => ({ ...a, baseUrl: e.target.value }))} required />

            <label htmlFor="auth-role">Role <span aria-label="required">*</span></label>
            <select id="auth-role" value={auth.role} onChange={(e) => setAuth((a) => ({ ...a, role: e.target.value }))} aria-required="true">
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>

            {(auth.role === 'doctor' || auth.role === 'patient') && ui.authMode === 'register' && (
              <>
                <label htmlFor="auth-name">Full Name <span aria-label="required">*</span></label>
                <input id="auth-name" value={auth.name} onChange={(e) => setAuth((a) => ({ ...a, name: e.target.value }))} required aria-required="true" />
              </>
            )}

            {auth.role === 'doctor' && ui.authMode === 'register' && (
              <>
                <label htmlFor="auth-specialty">Specialty</label>
                <input id="auth-specialty" value={auth.specialty} onChange={(e) => setAuth((a) => ({ ...a, specialty: e.target.value }))} />
              </>
            )}

            <label htmlFor="auth-email">Email <span aria-label="required">*</span></label>
            <input id="auth-email" type="email" value={auth.email} onChange={(e) => setAuth((a) => ({ ...a, email: e.target.value }))} required aria-required="true" />
            <label htmlFor="auth-password">Password <span aria-label="required">*</span></label>
            <input id="auth-password" type="password" value={auth.password} onChange={(e) => setAuth((a) => ({ ...a, password: e.target.value }))} required aria-required="true" />
            <button type="submit" disabled={ui.loading} aria-busy={ui.loading}>
              {ui.loading ? (ui.authMode === 'login' ? 'Signing in...' : 'Creating account...') : (ui.authMode === 'login' ? 'Login' : 'Register')}
            </button>
          </form>
          <Info message={ui.authMsg} type={ui.authType} />
        </section>
      )}

      {isLoggedIn && !isAdminSession && (
        <section className="auth-card">
          <h2>Authenticated Session</h2>
          <p>Logged in as <strong>{auth.tokenRole}</strong>. Admin dashboard access is restricted to admin role.</p>
          <button
            className="danger"
            aria-label="Log out from your session"
            onClick={() => {
              setAuth((a) => ({ ...a, token: '', tokenRole: '', password: '' }));
              setUi((u) => ({ ...u, authMsg: '', authType: '' }));
            }}
          >
            Logout
          </button>
        </section>
      )}

      {isAdminSession && (
        <section className="dashboard">
          <header className="topbar">
            <div>
              <h2>Admin Analytics Workspace</h2>
              <p className="service-state" aria-label="Service status">{serviceState}</p>
            </div>
            <div className="topbar-actions" role="group" aria-label="Dashboard actions">
              <button 
                onClick={refreshAll} 
                disabled={ui.loading}
                aria-busy={ui.loading}
                aria-label="Refresh dashboard data"
              >
                {ui.loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                className="danger"
                aria-label="Log out from admin dashboard"
                onClick={() => {
                  setAuth((a) => ({ ...a, token: '', tokenRole: '', password: '' }));
                  setData(defaultData);
                  setGlobal('Logged out.');
                }}
              >
                Logout
              </button>
            </div>
          </header>

          <div className="layout">
            <nav className="sidebar" aria-label="Dashboard sections">
              {['overview', 'analytics', 'users', 'doctor', 'audit', 'finance'].map((v) => (
                <button 
                  key={v} 
                  className={`nav-btn ${ui.view === v ? 'active' : ''}`} 
                  onClick={() => setUi((u) => ({ ...u, view: v }))}
                  aria-current={ui.view === v ? 'page' : 'false'}
                  aria-label={`View ${v} section`}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </nav>

            <section className="panel-area">
              <Info message={ui.msg} type={ui.msgType} />

              {ui.view === 'overview' && (
                <>
                  <section className="card-grid">
                    <Card title="Total Users" value={data.summary?.totalUsers ?? '-'} />
                    <Card title="Doctors" value={data.summary?.totalDoctors ?? '-'} />
                    <Card title="Patients" value={data.summary?.totalPatients ?? '-'} />
                    <Card title="Revenue" value={fmtCurrency(data.summary?.revenue?.total)} />
                  </section>
                  <section className="content-card">
                    <h3>Service Snapshot</h3>
                    <div className="chips">
                      <span className="chip">Version: {data.meta?.version || '-'}</span>
                      <span className="chip">Status: {data.health?.status || 'unknown'}</span>
                      <span className="chip">Database: {data.health?.database || 'unknown'}</span>
                    </div>
                    <p>{data.health?.message || 'Service running normally.'}</p>
                  </section>
                </>
              )}

              {ui.view === 'analytics' && (
                <section className="two-col">
                  <article className="content-card">
                    <h3>Appointments by Status</h3>
                    <div className="chips">
                      {Object.entries(data.appointments?.byStatus || {}).map(([k, v]) => (
                        <span className="chip" key={k}>{k}: {v}</span>
                      ))}
                      {!Object.keys(data.appointments?.byStatus || {}).length && <span className="chip">No data</span>}
                    </div>
                  </article>
                  <article className="content-card">
                    <h3>Appointments by Day</h3>
                    <DataTable columns={[{ title: 'Date', key: 'date' }, { title: 'Count', key: 'count' }]} rows={data.appointments?.byDay || []} />
                  </article>
                </section>
              )}

              {ui.view === 'users' && (
                <section className="two-col">
                  <article className="content-card">
                    <h3>User Actions</h3>
                    <form className="mini-form" onSubmit={updateStatus}>
                      <fieldset>
                        <legend className="form-legend">Update User Status</legend>
                        <label htmlFor="status-role">Role <span aria-label="required">*</span></label>
                        <select id="status-role" value={statusForm.role} onChange={(e) => setStatusForm((s) => ({ ...s, role: e.target.value }))} required aria-required="true">
                          <option value="">Select role</option>
                          <option value="admin">Admin</option>
                          <option value="doctor">Doctor</option>
                          <option value="patient">Patient</option>
                        </select>
                        <label htmlFor="status-id">User ID <span aria-label="required">*</span></label>
                        <input id="status-id" placeholder="Enter user ID" value={statusForm.id} onChange={(e) => setStatusForm((s) => ({ ...s, id: e.target.value }))} required aria-required="true" />
                        <label htmlFor="status-new">New Status <span aria-label="required">*</span></label>
                        <select id="status-new" value={statusForm.status} onChange={(e) => setStatusForm((s) => ({ ...s, status: e.target.value }))} required aria-required="true">
                          <option value="">Select status</option>
                          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </fieldset>
                      <button type="submit">Update Status</button>
                    </form>

                    <form className="mini-form" onSubmit={deactivate}>
                      <fieldset>
                        <legend className="form-legend">Deactivate User</legend>
                        <label htmlFor="deactivate-role">Role <span aria-label="required">*</span></label>
                        <select id="deactivate-role" value={deactivateForm.role} onChange={(e) => setDeactivateForm((s) => ({ ...s, role: e.target.value }))} required aria-required="true">
                          <option value="">Select role</option>
                          <option value="admin">Admin</option>
                          <option value="doctor">Doctor</option>
                          <option value="patient">Patient</option>
                        </select>
                        <label htmlFor="deactivate-id">User ID <span aria-label="required">*</span></label>
                        <input id="deactivate-id" placeholder="Enter user ID" value={deactivateForm.id} onChange={(e) => setDeactivateForm((s) => ({ ...s, id: e.target.value }))} required aria-required="true" />
                      </fieldset>
                      <button type="submit" className="danger">Deactivate User</button>
                    </form>
                  </article>

                  <article className="content-card">
                    <h3>Users</h3>
                    <DataTable
                      columns={[
                        { title: 'Role', key: 'roleType' },
                        { title: 'Email', key: 'email' },
                        { title: 'Name', key: 'name' },
                        { title: 'Status', key: 'status' }
                      ]}
                      rows={data.users}
                    />
                  </article>
                </section>
              )}

              {ui.view === 'doctor' && (
                <section className="two-col">
                  <article className="content-card">
                    <h3>Doctor Verification</h3>
                    <form className="mini-form" onSubmit={verifyDoctor}>
                      <label htmlFor="verify-doctor-id">Doctor ID <span aria-label="required">*</span></label>
                      <input id="verify-doctor-id" placeholder="Enter doctor ID" value={verifyDoctorId} onChange={(e) => setVerifyDoctorId(e.target.value)} required aria-required="true" />
                      <button type="submit">Verify Doctor</button>
                    </form>
                  </article>
                  <article className="content-card">
                    <h3>Doctors</h3>
                    <DataTable
                      columns={[
                        { title: 'Name', key: 'name' },
                        { title: 'Email', key: 'email' },
                        { title: 'Specialty', key: 'specialty' },
                        { title: 'Status', key: 'status' }
                      ]}
                      rows={data.doctors}
                    />
                  </article>
                </section>
              )}

              {ui.view === 'audit' && (
                <section className="content-card">
                  <h3>Audit Logs</h3>
                  <DataTable
                    columns={[
                      { title: 'Action', key: 'action' },
                      { title: 'Actor', key: 'actorEmail' },
                      { title: 'Target', render: (r) => `${r.targetType || '-'} / ${r.targetEmail || '-'}` },
                      { title: 'Time', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '-' }
                    ]}
                    rows={data.audits}
                  />
                </section>
              )}

              {ui.view === 'finance' && (
                <section className="content-card">
                  <h3>Transactions</h3>
                  <DataTable
                    columns={[
                      { title: 'Amount', render: (r) => fmtCurrency(r.amount) },
                      { title: 'Status', key: 'status' },
                      { title: 'Method', key: 'method' },
                      { title: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '-' }
                    ]}
                    rows={data.transactions}
                  />
                </section>
              )}
            </section>
          </div>
        </section>
      )}
    </main>
  );
}
