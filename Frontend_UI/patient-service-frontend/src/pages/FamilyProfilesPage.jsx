import { useEffect, useState } from 'react';
import { createFamilyProfile, deleteFamilyProfile, getActiveProfileId, getFamilyProfiles, setActiveProfileId, updateFamilyProfile } from '../lib/api';
import './Dashboard.css';

const initialForm = {
  fullName: '',
  relation: 'mother',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  allergies: '',
  chronicConditions: '',
  emergencyNotes: '',
  profilePhoto: '',
};

function formatAge(age) {
  return age === null || age === undefined ? 'Age not set' : `${age} years`;
}

function FamilyProfilesPage({ auth }) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileState] = useState(getActiveProfileId());
  const [form, setForm] = useState(initialForm);
  const [editingProfileId, setEditingProfileId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfiles = async () => {
    const response = await getFamilyProfiles(auth.token);
    const nextProfiles = response.profiles || [];
    setProfiles(nextProfiles);

    const selected = getActiveProfileId();
    const primary = nextProfiles.find((profile) => profile.isPrimary);
    const resolvedId = nextProfiles.some((profile) => profile.id === selected) ? selected : primary?.id || '';
    setActiveProfileId(resolvedId);
    setActiveProfileState(resolvedId);
  };

  useEffect(() => {
    let active = true;

    async function fetchProfiles() {
      setIsLoading(true);
      setError('');

      try {
        const response = await getFamilyProfiles(auth.token);
        if (!active) {
          return;
        }

        const nextProfiles = response.profiles || [];
        setProfiles(nextProfiles);
        const selected = getActiveProfileId();
        const primary = nextProfiles.find((profile) => profile.isPrimary);
        const resolvedId = nextProfiles.some((profile) => profile.id === selected) ? selected : primary?.id || '';
        setActiveProfileId(resolvedId);
        setActiveProfileState(resolvedId);
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

    fetchProfiles();

    return () => {
      active = false;
    };
  }, [auth.token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingProfileId('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        allergies: form.allergies.split(',').map((item) => item.trim()).filter(Boolean),
        chronicConditions: form.chronicConditions.split(',').map((item) => item.trim()).filter(Boolean),
      };

      if (editingProfileId) {
        await updateFamilyProfile(auth.token, editingProfileId, payload);
        setSuccess('Family profile updated successfully.');
      } else {
        await createFamilyProfile(auth.token, payload);
        setSuccess('Family profile created successfully.');
      }

      await loadProfiles();
      resetForm();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfileId(profile.id);
    setForm({
      fullName: profile.fullName || '',
      relation: profile.relation || 'mother',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
      gender: profile.gender || '',
      bloodGroup: profile.bloodGroup || '',
      allergies: (profile.allergies || []).join(', '),
      chronicConditions: (profile.chronicConditions || []).join(', '),
      emergencyNotes: profile.emergencyNotes || '',
      profilePhoto: profile.profilePhoto || '',
    });
    setError('');
    setSuccess('');
  };

  const handleDelete = async (profileId) => {
    const confirmed = window.confirm('Delete this family profile?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteFamilyProfile(auth.token, profileId);
      if (activeProfileId === profileId) {
        setActiveProfileId('');
        setActiveProfileState('');
      }
      await loadProfiles();
      setSuccess('Family profile deleted successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleSwitchProfile = (profile) => {
    setActiveProfileId(profile.id);
    setActiveProfileState(profile.id);
    setSuccess(`Switched to ${profile.fullName}'s profile.`);
  };

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  if (isLoading) {
    return <div className="dashboard-state glass">Loading family profiles...</div>;
  }

  return (
    <div className="dashboard animate-fade-in">
      <section className="welcome-card glass">
        <div>
          <p className="eyebrow">Family profiles</p>
          <h1>Family Profiles</h1>
          <p>Manage your health profile and your family members in one place.</p>
        </div>
        <div className="welcome-actions">
          <button className="btn btn-primary" onClick={resetForm} type="button">
            Add Family Member
          </button>
        </div>
      </section>

      {activeProfile ? (
        <section className="dashboard-section glass">
          <div className="booking-schedule-note">
            <span>Currently viewing</span>
            <strong>{activeProfile.fullName}&apos;s profile</strong>
          </div>
        </section>
      ) : null}

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>Profiles</h2>
            <p>The primary profile cannot be deleted, and the active profile controls the patient dashboard context.</p>
          </div>
        </div>

        <div className="doctor-card-grid">
          {profiles.map((profile) => (
            <article className={`doctor-card ${activeProfileId === profile.id ? 'selected' : ''}`} key={profile.id}>
              <div>
                <p className="role-card-kicker">{profile.relation}</p>
                <h3>{profile.fullName}</h3>
                <p>{formatAge(profile.age)} • {profile.gender || 'Gender not set'}</p>
              </div>
              <div className="doctor-meta">
                <span>Blood group: {profile.bloodGroup || 'Not set'}</span>
                {profile.isPrimary ? <span>Primary profile</span> : null}
                {activeProfileId === profile.id ? <span>Active profile</span> : null}
              </div>
              <div className="booking-actions">
                <button className="btn btn-primary small" onClick={() => handleSwitchProfile(profile)} type="button">
                  {activeProfileId === profile.id ? 'Active' : 'Switch Profile'}
                </button>
                <button className="btn btn-secondary small" onClick={() => handleEdit(profile)} type="button">
                  Edit
                </button>
                {!profile.isPrimary ? (
                  <button className="btn btn-secondary small btn-delete" onClick={() => handleDelete(profile.id)} type="button">
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-section glass">
        <div className="section-header">
          <div>
            <h2>{editingProfileId ? 'Edit family member' : 'Add family member'}</h2>
            <p>Add or update dependent medical details under the same account.</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="booking-filter-grid">
            <label className="form-field">
              <span>Full name</span>
              <input name="fullName" onChange={handleChange} value={form.fullName} />
            </label>
            <label className="form-field">
              <span>Relation</span>
              <select name="relation" onChange={handleChange} value={form.relation}>
                <option value="mother">Mother</option>
                <option value="father">Father</option>
                <option value="child">Child</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="self">Self</option>
              </select>
            </label>
            <label className="form-field">
              <span>Date of birth</span>
              <input name="dateOfBirth" onChange={handleChange} type="date" value={form.dateOfBirth} />
            </label>
            <label className="form-field">
              <span>Gender</span>
              <input name="gender" onChange={handleChange} value={form.gender} />
            </label>
            <label className="form-field">
              <span>Blood group</span>
              <input name="bloodGroup" onChange={handleChange} value={form.bloodGroup} />
            </label>
            <label className="form-field">
              <span>Profile photo URL</span>
              <input name="profilePhoto" onChange={handleChange} value={form.profilePhoto} />
            </label>
          </div>

          <label className="form-field">
            <span>Allergies</span>
            <input name="allergies" onChange={handleChange} placeholder="Peanuts, Dust" value={form.allergies} />
          </label>

          <label className="form-field">
            <span>Chronic conditions</span>
            <input name="chronicConditions" onChange={handleChange} placeholder="Asthma, Diabetes" value={form.chronicConditions} />
          </label>

          <label className="form-field">
            <span>Emergency notes</span>
            <textarea className="symptom-textarea" name="emergencyNotes" onChange={handleChange} value={form.emergencyNotes} />
          </label>

          {error ? <p className="form-message error">{error}</p> : null}
          {success ? <p className="form-message success">{success}</p> : null}

          <div className="booking-actions">
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving...' : editingProfileId ? 'Save changes' : 'Add family member'}
            </button>
            <button className="btn btn-secondary" onClick={resetForm} type="button">
              {editingProfileId ? 'Cancel edit' : 'Clear'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default FamilyProfilesPage;
