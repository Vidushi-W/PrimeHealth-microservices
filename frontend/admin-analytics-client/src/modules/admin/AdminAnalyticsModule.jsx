import { useEffect, useMemo, useState } from 'react';
import '../../App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const defaultLogin = {
  email: 'admin@primehealth.com',
  password: 'password123'
};

const defaultUserQuery = {
  role: 'all',
  status: '',
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

const defaultAuditQuery = {
  targetType: '',
  action: ''
};

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return json;
}

function MetricCard({ title, value, caption }) {
  return (
    <article className="metric-card reveal">
      <p className="metric-title">{title}</p>
      <h3>{value}</h3>
      {caption ? <p className="metric-caption">{caption}</p> : null}
    </article>
  );
}

function AdminAnalyticsModule() {
  const [token, setToken] = useState('');
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [loginError, setLoginError] = useState('');
  const [globalError, setGlobalError] = useState('');

  const [summary, setSummary] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersMeta, setUsersMeta] = useState(null);

  const [usersQuery, setUsersQuery] = useState(defaultUserQuery);
  const [auditQuery, setAuditQuery] = useState(defaultAuditQuery);

  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [doctorDocumentForm, setDoctorDocumentForm] = useState({
    doctorId: '',
    type: 'medical_license',
    url: '',
    notes: ''
  });

  const [verificationForm, setVerificationForm] = useState({
    doctorId: '',
    documentId: '',
    rejectNotes: ''
  });

  const [actionInfo, setActionInfo] = useState('');

  const statusByCount = useMemo(() => {
    if (!appointments?.byStatus) return [];
    return Object.entries(appointments.byStatus);
  }, [appointments]);

  const byDayPreview = useMemo(() => {
    if (!appointments?.byDay) return [];
    return appointments.byDay.slice(-7);
  }, [appointments]);

  async function login(e) {
    e.preventDefault();
    setLoginError('');
    setGlobalError('');

    try {
      const data = await request('/api/admin/login', {
        method: 'POST',
        body: loginForm
      });
      setToken(data.token);
    } catch (error) {
      setLoginError(error.message);
    }
  }

  async function loadDashboard(authToken) {
    setIsLoadingDashboard(true);
    setGlobalError('');
    try {
      const [summaryData, appointmentsData, transactionsData] = await Promise.all([
        request('/api/admin/analytics/summary', { token: authToken }),
        request('/api/admin/analytics/appointments', { token: authToken }),
        request('/api/admin/finance/transactions', { token: authToken })
      ]);

      setSummary(summaryData);
      setAppointments(appointmentsData);
      setTransactions(transactionsData || []);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setIsLoadingDashboard(false);
    }
  }

  async function searchUsers() {
    if (!token) return;
    setIsLoadingUsers(true);
    setGlobalError('');

    try {
      const params = new URLSearchParams();
      if (usersQuery.role && usersQuery.role !== 'all') params.set('role', usersQuery.role);
      if (usersQuery.status) params.set('status', usersQuery.status);
      if (usersQuery.search) params.set('search', usersQuery.search);
      params.set('sortBy', usersQuery.sortBy);
      params.set('sortOrder', usersQuery.sortOrder);

      const data = await request(`/api/admin/users?${params.toString()}`, { token });
      setUsers(data.users || []);
      setUsersMeta(data.pagination || null);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function loadAuditLogs() {
    if (!token) return;
    setIsLoadingAudit(true);
    setGlobalError('');

    try {
      const params = new URLSearchParams();
      if (auditQuery.targetType) params.set('targetType', auditQuery.targetType);
      if (auditQuery.action) params.set('action', auditQuery.action);
      params.set('page', '1');
      params.set('limit', '25');

      const data = await request(`/api/admin/audit-logs?${params.toString()}`, { token });
      setAuditLogs(data.logs || []);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setIsLoadingAudit(false);
    }
  }

  async function uploadDoctorDocument(e) {
    e.preventDefault();
    setActionInfo('');
    setGlobalError('');

    try {
      await request(`/api/admin/users/doctors/${doctorDocumentForm.doctorId}/documents`, {
        token,
        method: 'POST',
        body: {
          type: doctorDocumentForm.type,
          url: doctorDocumentForm.url,
          notes: doctorDocumentForm.notes
        }
      });
      setActionInfo('Doctor document uploaded successfully.');
      setDoctorDocumentForm((prev) => ({ ...prev, url: '', notes: '' }));
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  async function verifyDoctorDocument() {
    setActionInfo('');
    setGlobalError('');

    try {
      await request(
        `/api/admin/users/doctors/${verificationForm.doctorId}/documents/${verificationForm.documentId}/verify`,
        {
          token,
          method: 'PATCH'
        }
      );
      setActionInfo('Document verified and doctor status updated.');
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  async function rejectDoctorDocument() {
    setActionInfo('');
    setGlobalError('');

    try {
      await request(
        `/api/admin/users/doctors/${verificationForm.doctorId}/documents/${verificationForm.documentId}/reject`,
        {
          token,
          method: 'PATCH',
          body: { notes: verificationForm.rejectNotes }
        }
      );
      setActionInfo('Document rejected with reviewer notes.');
    } catch (error) {
      setGlobalError(error.message);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadDashboard(token);
    searchUsers();
    loadAuditLogs();
  }, [token]);

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-panel reveal">
          <p className="eyebrow">PrimeHealth Admin Console</p>
          <h1>Asynchronous Web Client</h1>
          <p className="lead">
            Login to manage users, track platform operations, and monitor analytics in real time.
          </p>

          <form className="login-form" onSubmit={login}>
            <label>
              Admin Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </label>

            <button type="submit">Sign In</button>
          </form>

          {loginError ? <p className="error-text">{loginError}</p> : null}
          <p className="hint">API: {API_BASE_URL}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <header className="top-bar reveal">
        <div>
          <p className="eyebrow">PrimeHealth</p>
          <h1>Admin Analytics Console</h1>
        </div>
        <div className="top-actions">
          <button onClick={() => loadDashboard(token)} disabled={isLoadingDashboard}>
            {isLoadingDashboard ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
          <button
            className="ghost"
            onClick={() => {
              setToken('');
              setSummary(null);
              setUsers([]);
              setTransactions([]);
              setAuditLogs([]);
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {globalError ? <p className="error-text full">{globalError}</p> : null}
      {actionInfo ? <p className="ok-text full">{actionInfo}</p> : null}

      <section className="metrics-grid">
        <MetricCard title="Total Users" value={summary?.totalUsers ?? '-'} />
        <MetricCard title="Doctors" value={summary?.totalDoctors ?? '-'} />
        <MetricCard title="Patients" value={summary?.totalPatients ?? '-'} />
        <MetricCard
          title="Revenue"
          value={summary?.revenue?.total ?? '-'}
          caption={summary?.revenue?.currency || 'LKR'}
        />
      </section>

      <section className="panel-grid">
        <article className="panel reveal">
          <h2>Appointments Overview</h2>
          <div className="chip-row">
            {statusByCount.length
              ? statusByCount.map(([status, count]) => (
                  <span className="chip" key={status}>
                    {status}: {count}
                  </span>
                ))
              : <span className="muted">No appointment analytics yet.</span>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {byDayPreview.length
                  ? byDayPreview.map((item) => (
                      <tr key={item.date}>
                        <td>{item.date}</td>
                        <td>{item.count}</td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan="2" className="muted">No daily data found.</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel reveal">
          <h2>Recent Transactions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length
                  ? transactions.slice(0, 8).map((tx) => (
                      <tr key={tx._id || `${tx.amount}-${tx.createdAt}`}>
                        <td>{new Date(tx.createdAt || tx.transactionDate).toLocaleDateString()}</td>
                        <td>{tx.amount} {tx.currency || 'LKR'}</td>
                        <td>{tx.status || 'completed'}</td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan="3" className="muted">No transaction data found.</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel reveal">
        <h2>User Management Search</h2>
        <div className="form-grid">
          <label>
            Role
            <select
              value={usersQuery.role}
              onChange={(e) => setUsersQuery((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>
          </label>
          <label>
            Status
            <input
              value={usersQuery.status}
              onChange={(e) => setUsersQuery((prev) => ({ ...prev, status: e.target.value }))}
              placeholder="active / suspended / verified"
            />
          </label>
          <label>
            Search
            <input
              value={usersQuery.search}
              onChange={(e) => setUsersQuery((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="name, email, specialty"
            />
          </label>
          <label>
            Sort By
            <select
              value={usersQuery.sortBy}
              onChange={(e) => setUsersQuery((prev) => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="createdAt">createdAt</option>
              <option value="updatedAt">updatedAt</option>
              <option value="email">email</option>
              <option value="name">name</option>
              <option value="status">status</option>
            </select>
          </label>
          <label>
            Order
            <select
              value={usersQuery.sortOrder}
              onChange={(e) => setUsersQuery((prev) => ({ ...prev, sortOrder: e.target.value }))}
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </label>
        </div>

        <div className="inline-actions">
          <button onClick={searchUsers} disabled={isLoadingUsers}>
            {isLoadingUsers ? 'Searching...' : 'Search Users'}
          </button>
          {usersMeta ? (
            <span className="muted">
              {usersMeta.total} results ({usersMeta.totalPages} pages)
            </span>
          ) : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Name / Email</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {users.length
                ? users.slice(0, 15).map((user) => (
                    <tr key={`${user.roleType}-${user._id}`}>
                      <td>{user.roleType}</td>
                      <td>{user.name || user.email}</td>
                      <td>{user.status}</td>
                      <td>{new Date(user.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan="4" className="muted">No users loaded yet.</td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel reveal">
          <h2>Doctor Document Upload</h2>
          <form className="form-grid" onSubmit={uploadDoctorDocument}>
            <label>
              Doctor ID
              <input
                value={doctorDocumentForm.doctorId}
                onChange={(e) => setDoctorDocumentForm((prev) => ({ ...prev, doctorId: e.target.value }))}
                required
              />
            </label>
            <label>
              Document Type
              <input
                value={doctorDocumentForm.type}
                onChange={(e) => setDoctorDocumentForm((prev) => ({ ...prev, type: e.target.value }))}
                required
              />
            </label>
            <label>
              URL
              <input
                type="url"
                value={doctorDocumentForm.url}
                onChange={(e) => setDoctorDocumentForm((prev) => ({ ...prev, url: e.target.value }))}
                required
              />
            </label>
            <label>
              Notes
              <input
                value={doctorDocumentForm.notes}
                onChange={(e) => setDoctorDocumentForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
            <button type="submit">Upload Document</button>
          </form>
        </article>

        <article className="panel reveal">
          <h2>Document Verification Actions</h2>
          <div className="form-grid">
            <label>
              Doctor ID
              <input
                value={verificationForm.doctorId}
                onChange={(e) => setVerificationForm((prev) => ({ ...prev, doctorId: e.target.value }))}
              />
            </label>
            <label>
              Document ID
              <input
                value={verificationForm.documentId}
                onChange={(e) => setVerificationForm((prev) => ({ ...prev, documentId: e.target.value }))}
              />
            </label>
            <label>
              Reject Notes
              <input
                value={verificationForm.rejectNotes}
                onChange={(e) => setVerificationForm((prev) => ({ ...prev, rejectNotes: e.target.value }))}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button onClick={verifyDoctorDocument}>Verify Document</button>
            <button className="ghost" onClick={rejectDoctorDocument}>Reject Document</button>
          </div>
        </article>
      </section>

      <section className="panel reveal">
        <h2>Audit Log Explorer</h2>
        <div className="form-grid">
          <label>
            Target Type
            <input
              placeholder="admin / doctor / patient"
              value={auditQuery.targetType}
              onChange={(e) => setAuditQuery((prev) => ({ ...prev, targetType: e.target.value }))}
            />
          </label>
          <label>
            Action
            <input
              placeholder="user.doctor.verified"
              value={auditQuery.action}
              onChange={(e) => setAuditQuery((prev) => ({ ...prev, action: e.target.value }))}
            />
          </label>
        </div>
        <div className="inline-actions">
          <button onClick={loadAuditLogs} disabled={isLoadingAudit}>
            {isLoadingAudit ? 'Loading...' : 'Load Audit Logs'}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length
                ? auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{log.action}</td>
                      <td>{log.actorEmail}</td>
                      <td>{log.targetType}:{log.targetId}</td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan="4" className="muted">No logs loaded.</td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminAnalyticsModule;
