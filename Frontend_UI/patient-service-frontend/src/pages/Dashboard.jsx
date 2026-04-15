import { useEffect, useState } from 'react';
import { getMyProfile, updateMyProfile } from '../lib/api';
import './Dashboard.css';

const initialProfileForm = {
  fullName: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  allergies: '',
  chronicConditions: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

function formatDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

const Dashboard = ({ auth, onProfileSync }) => {
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setIsLoading(true);
      setError('');

      try {
        const response = await getMyProfile(auth.token);
        if (!active) {
          return;
        }

        setProfileData(response);
        onProfileSync(response.user);
        setProfileForm({
          fullName: response.user.fullName || '',
          phone: response.user.phone || '',
          dateOfBirth: formatDate(response.profile.dateOfBirth),
          gender: response.profile.gender || '',
          bloodGroup: response.profile.bloodGroup || '',
          allergies: (response.profile.allergies || []).join(', '),
          chronicConditions: (response.profile.chronicConditions || []).join(', '),
          address: response.profile.address || '',
          emergencyContactName: response.profile.emergencyContactName || '',
          emergencyContactPhone: response.profile.emergencyContactPhone || '',
        });
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

    loadProfile();

    return () => {
      active = false;
    };
  }, [auth.token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        dateOfBirth: profileForm.dateOfBirth || null,
        gender: profileForm.gender,
        bloodGroup: profileForm.bloodGroup,
        allergies: profileForm.allergies.split(',').map((item) => item.trim()).filter(Boolean),
        chronicConditions: profileForm.chronicConditions.split(',').map((item) => item.trim()).filter(Boolean),
        address: profileForm.address,
        emergencyContactName: profileForm.emergencyContactName,
        emergencyContactPhone: profileForm.emergencyContactPhone,
      };

      const response = await updateMyProfile(auth.token, payload);
      setProfileData(response);
      onProfileSync(response.user);
      setSuccess('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="dashboard-state glass">Loading patient profile...</div>;
  }

  if (error && !profileData) {
    return <div className="dashboard-state glass error">{error}</div>;
  }

  return (
    <div className="dashboard animate-fade-in">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Patient dashboard</p>
          <h1>{profileData?.user.fullName || 'Patient profile'}</h1>
          <p>Keep your registration details updated and ready for appointments.</p>
        </div>
        <div className="dashboard-badge glass">
          <span>{profileData?.user.role}</span>
          <strong>{profileData?.user.isVerified ? 'Verified' : 'Pending verification'}</strong>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card glass">
          <h3>Account email</h3>
          <p className="card-value">{profileData?.user.email}</p>
          <p className="text-muted">Primary sign-in for the patient portal</p>
        </div>
        <div className="dashboard-card glass">
          <h3>Blood group</h3>
          <p className="card-value status-good">{profileData?.profile.bloodGroup || 'Not added yet'}</p>
          <p className="text-muted">Useful for emergency workflows and clinical records</p>
        </div>
        <div className="dashboard-card glass">
          <h3>Emergency contact</h3>
          <p className="card-value">
            {profileData?.profile.emergencyContactName || 'Add a trusted contact'}
          </p>
          <p className="text-muted">
            {profileData?.profile.emergencyContactPhone || 'No emergency phone saved'}
          </p>
        </div>
      </div>

      <section className="profile-editor glass">
        <div className="profile-editor-header">
          <h2>Edit profile</h2>
          <p>These fields connect directly to your patient profile backend.</p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-field">
              <span>Full name</span>
              <input name="fullName" value={profileForm.fullName} onChange={handleChange} />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input name="phone" value={profileForm.phone} onChange={handleChange} />
            </label>
          </div>

          <div className="form-row">
            <label className="form-field">
              <span>Date of birth</span>
              <input type="date" name="dateOfBirth" value={profileForm.dateOfBirth} onChange={handleChange} />
            </label>
            <label className="form-field">
              <span>Gender</span>
              <input name="gender" value={profileForm.gender} onChange={handleChange} />
            </label>
          </div>

          <div className="form-row">
            <label className="form-field">
              <span>Blood group</span>
              <input name="bloodGroup" value={profileForm.bloodGroup} onChange={handleChange} />
            </label>
            <label className="form-field">
              <span>Address</span>
              <input name="address" value={profileForm.address} onChange={handleChange} />
            </label>
          </div>

          <label className="form-field">
            <span>Allergies</span>
            <input name="allergies" value={profileForm.allergies} onChange={handleChange} placeholder="Peanuts, Dust" />
          </label>

          <label className="form-field">
            <span>Chronic conditions</span>
            <input
              name="chronicConditions"
              value={profileForm.chronicConditions}
              onChange={handleChange}
              placeholder="Asthma, Diabetes"
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Emergency contact name</span>
              <input
                name="emergencyContactName"
                value={profileForm.emergencyContactName}
                onChange={handleChange}
              />
            </label>
            <label className="form-field">
              <span>Emergency contact phone</span>
              <input
                name="emergencyContactPhone"
                value={profileForm.emergencyContactPhone}
                onChange={handleChange}
              />
            </label>
          </div>

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <button className="btn btn-primary" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Dashboard;
