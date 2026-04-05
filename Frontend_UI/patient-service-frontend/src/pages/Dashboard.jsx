import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard animate-fade-in">
      <header className="dashboard-header">
        <h1>Welcome Back</h1>
        <p>Here is an overview of your patient status and upcoming appointments.</p>
        <button className="btn btn-primary">Schedule Appointment</button>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card glass">
          <h3>Upcoming Appointment</h3>
          <p className="card-value">Dr. Smith - Cardiology</p>
          <p className="text-muted">Tomorrow, 10:00 AM</p>
        </div>
        <div className="dashboard-card glass">
          <h3>Health Status</h3>
          <p className="card-value status-good">Optimal</p>
          <p className="text-muted">All vitals are within normal range</p>
        </div>
        <div className="dashboard-card glass">
          <h3>Recent Test Results</h3>
          <p className="card-value">Complete Blood Count</p>
          <p className="text-muted">Processed on Jan 24</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
