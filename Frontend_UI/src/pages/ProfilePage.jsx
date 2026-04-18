import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { API_BASE_PATIENT } from '../config/apiBase';
import { getMyProfile, updateMyProfile, uploadPatientProfilePicture } from '../services/patientApi';

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
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function displayDateLabel(iso) {
  if (!iso) return '—';
  try {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getPatientImageSrc(profilePhoto) {
  if (!profilePhoto) return 'https://placehold.co/120x120?text=Patient';
  if (String(profilePhoto).startsWith('http')) return profilePhoto;

  const base = API_BASE_PATIENT.replace(/\/+$/, '');
  const path = String(profilePhoto).startsWith('/') ? profilePhoto : `/${profilePhoto}`;
  return `${base}${path}`;
}

function ProfilePage({ auth, onProfileSync }) {
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await getMyProfile(auth.token);
        if (!active) return;

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
        if (active) setLoadError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [auth.token, onProfileSync]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleCancel = () => {
    if (!profileData) return;
    setProfileForm({
      fullName: profileData.user.fullName || '',
      phone: profileData.user.phone || '',
      dateOfBirth: formatDate(profileData.profile.dateOfBirth),
      gender: profileData.profile.gender || '',
      bloodGroup: profileData.profile.bloodGroup || '',
      allergies: (profileData.profile.allergies || []).join(', '),
      chronicConditions: (profileData.profile.chronicConditions || []).join(', '),
      address: profileData.profile.address || '',
      emergencyContactName: profileData.profile.emergencyContactName || '',
      emergencyContactPhone: profileData.profile.emergencyContactPhone || '',
    });
    setEditing(false);
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !auth.token) {
      return;
    }

    if (!file.type?.startsWith('image/')) {
      toast.error('Please select an image file');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be 5MB or less');
      event.target.value = '';
      return;
    }

    try {
      setUploadingPhoto(true);
      const data = await uploadPatientProfilePicture(auth.token, file);
      setProfileData({ user: data.user, profile: data.profile });
      onProfileSync(data.user);
      toast.success('Profile picture updated');
    } catch (requestError) {
      toast.error(requestError.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        dateOfBirth: profileForm.dateOfBirth || null,
        gender: profileForm.gender,
        bloodGroup: profileForm.bloodGroup,
        allergies: profileForm.allergies
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        chronicConditions: profileForm.chronicConditions
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        address: profileForm.address,
        emergencyContactName: profileForm.emergencyContactName,
        emergencyContactPhone: profileForm.emergencyContactPhone,
      };

      const response = await updateMyProfile(auth.token, payload);
      setProfileData(response);
      onProfileSync(response.user);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (requestError) {
      toast.error(requestError.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const p = profileData?.profile;
    const u = profileData?.user;
    if (!p || !u) {
      return [
        ['Blood group', '—'],
        ['Date of birth', '—'],
        ['Gender', '—'],
        ['Emergency', '—'],
      ];
    }
    const hasEmergency = Boolean(p.emergencyContactName?.trim() || p.emergencyContactPhone?.trim());
    return [
      ['Blood group', p.bloodGroup?.trim() || 'Not set'],
      ['Date of birth', displayDateLabel(formatDate(p.dateOfBirth))],
      ['Gender', p.gender?.trim() || 'Not set'],
      ['Emergency', hasEmergency ? 'On file' : 'Add contact'],
    ];
  }, [profileData]);

  if (isLoading) {
    return <LoadingState label="Loading your patient profile..." />;
  }

  if (loadError && !profileData) {
    return (
      <EmptyState
        title="Profile unavailable"
        description={loadError}
      />
    );
  }

  if (!profileData) {
    return (
      <EmptyState
        title="No profile data"
        description="Sign in as a patient to view and edit your profile."
      />
    );
  }

  const { user, profile } = profileData;
  const allergyList = profile.allergies?.length ? profile.allergies : [];
  const chronicList = profile.chronicConditions?.length ? profile.chronicConditions : [];

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              My patient profile
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {user.fullName || 'Patient'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep clinical and contact details accurate for appointments, prescriptions, and emergencies.
            </p>
          </div>
          <div className="pr-2 pt-1">
            <label className="group relative block cursor-pointer">
              <img
                src={getPatientImageSrc(profile.profilePhoto)}
                alt="Patient profile"
                className="h-28 w-28 rounded-full border-2 border-brand-100 object-cover shadow-sm"
              />
              <span className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-brand-600 text-xs text-white shadow-sm transition group-hover:bg-brand-700">
                {uploadingPhoto ? '...' : '✎'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <div className="grid gap-2 rounded-xl border border-brand-100 bg-brand-50/35 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            Role: {user.role || 'patient'}
          </span>
          <span className="truncate">Account: {user.email}</span>
        </div>
      </section>

      <section className="panel p-4">
        <p className="text-base font-semibold text-slate-900">Health &amp; medical snapshot</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Allergies</p>
            {allergyList.length ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {allergyList.slice(0, 6).map((item) => (
                  <li key={item}>· {item}</li>
                ))}
                {allergyList.length > 6 ? (
                  <li className="text-xs text-slate-500">+{allergyList.length - 6} more</li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">None recorded</p>
            )}
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Chronic conditions</p>
            {chronicList.length ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {chronicList.slice(0, 6).map((item) => (
                  <li key={item}>· {item}</li>
                ))}
                {chronicList.length > 6 ? (
                  <li className="text-xs text-slate-500">+{chronicList.length - 6} more</li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">None recorded</p>
            )}
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Address</p>
            <p className="mt-2 text-sm text-slate-800">{profile.address?.trim() || 'Not set'}</p>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <p className="text-base font-semibold text-slate-900">Contact &amp; emergency</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Reach you</p>
            <div className="mt-2 space-y-2 text-sm text-slate-800">
              <p>
                <span className="font-semibold text-slate-900">Phone:</span> {user.phone?.trim() || 'Not set'}
              </p>
              <p className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px]">
                  ✉
                </span>
                <span>
                  <span className="font-semibold text-slate-900">Email:</span> {user.email}
                </span>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Emergency contact</p>
            <div className="mt-2 space-y-1 text-sm text-slate-800">
              <p>
                <span className="font-semibold text-slate-900">Name:</span>{' '}
                {profile.emergencyContactName?.trim() || 'Not set'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Phone:</span>{' '}
                {profile.emergencyContactPhone?.trim() || '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <form className="panel p-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">Edit details</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Personal &amp; clinical information</h3>
            </div>
            {!editing ? (
              <button type="button" className="button-secondary" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Full name</span>
              <input
                name="fullName"
                value={profileForm.fullName}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Phone</span>
              <input
                name="phone"
                value={profileForm.phone}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Date of birth</span>
              <input
                type="date"
                name="dateOfBirth"
                value={profileForm.dateOfBirth}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Gender</span>
              <input
                name="gender"
                value={profileForm.gender}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
                placeholder="e.g. Female"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Blood group</span>
              <input
                name="bloodGroup"
                value={profileForm.bloodGroup}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
                placeholder="e.g. O+"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Address</span>
              <input
                name="address"
                value={profileForm.address}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Allergies</span>
              <input
                name="allergies"
                value={profileForm.allergies}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
                placeholder="Comma-separated, e.g. Peanuts, Penicillin"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Chronic conditions</span>
              <input
                name="chronicConditions"
                value={profileForm.chronicConditions}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
                placeholder="Comma-separated, e.g. Asthma, Hypertension"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Emergency contact name</span>
              <input
                name="emergencyContactName"
                value={profileForm.emergencyContactName}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Emergency contact phone</span>
              <input
                name="emergencyContactPhone"
                value={profileForm.emergencyContactPhone}
                onChange={handleChange}
                className="input"
                disabled={!editing || isSaving}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {editing ? (
              <>
                <button type="button" className="button-secondary" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save update'}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Editing is locked until you choose Edit profile.</p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProfilePage;
