function getRoleCopy(role) {
  if (role === 'doctor') {
    return {
      eyebrow: 'Doctor dashboard',
      title: 'Clinical workspace coming together',
      description: 'Authentication and routing are now role-aware. This placeholder confirms doctors land in their own flow after sign-in.',
      status: 'Awaiting approvals, scheduling, and consultation modules',
    };
  }

  return {
    eyebrow: 'Admin dashboard',
    title: 'Admin access is protected',
    description: 'Admins no longer belong in public registration. This placeholder keeps admin sign-in on a distinct route until the full console is ready.',
    status: 'Awaiting analytics, verification, and system management modules',
  };
}

function RoleDashboard({ auth }) {
  const role = auth?.user?.role || 'admin';
  const copy = getRoleCopy(role);

  return (
    <div className="dashboard animate-fade-in">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <div className="dashboard-badge glass">
          <span>{role}</span>
          <strong>{auth?.user?.isVerified ? 'Verified' : 'Pending verification'}</strong>
        </div>
      </header>

      <section className="profile-editor glass">
        <div className="profile-editor-header">
          <h2>Shared auth flow is live</h2>
          <p>
            Signed in as <strong>{auth?.user?.fullName || auth?.user?.email}</strong>. The next step is wiring this
            route into the dedicated {role} module when that UI is ready.
          </p>
        </div>

        <div className="dashboard-grid role-dashboard-grid">
          <div className="dashboard-card glass">
            <h3>Current route</h3>
            <p className="card-value">/{role}/dashboard</p>
            <p className="text-muted">Role-based redirect after shared login is working.</p>
          </div>

          <div className="dashboard-card glass">
            <h3>Access model</h3>
            <p className="card-value">Shared authentication</p>
            <p className="text-muted">One login page, separate role experiences.</p>
          </div>

          <div className="dashboard-card glass">
            <h3>Next milestone</h3>
            <p className="card-value">{copy.status}</p>
            <p className="text-muted">
              Patient dashboard remains the active profile management experience for now.
            </p>
          </div>
        </div>

        <p className="auth-inline-note">
          This role-specific landing page is ready for the next module to plug into shared authentication.
        </p>
      </section>
    </div>
  );
}

export default RoleDashboard;
