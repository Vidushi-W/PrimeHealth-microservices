import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import StarRating from '../components/StarRating';
import { API_BASE_DOCTOR } from '../config/apiBase';
import {
  fetchDoctorReviews,
  getDoctorById,
  getDoctors,
  summarizeDoctorAppointments,
  uploadDoctorProfilePicture,
  updateDoctor
} from '../services/doctorService';
import { resolveCurrentDoctor } from '../utils/currentDoctor';

const emptyForm = {
  name: '',
  email: '',
  phoneNumber: '',
  specialization: '',
  qualifications: '',
  experience: '',
  hospitalOrClinic: '',
  bio: ''
};

function toFormValues(doctor) {
  return {
    name: doctor?.name || '',
    email: doctor?.email || '',
    phoneNumber: doctor?.phoneNumber || '',
    specialization: doctor?.specialization || '',
    qualifications: doctor?.qualifications || '',
    experience: String(doctor?.experience ?? 0),
    hospitalOrClinic: doctor?.hospitalOrClinic || '',
    bio: doctor?.bio || ''
  };
}

function getDoctorImageSrc(profilePicture) {
  if (!profilePicture) return 'https://placehold.co/120x120?text=Doctor';
  if (String(profilePicture).startsWith('http')) return profilePicture;

  const base = API_BASE_DOCTOR.replace(/\/+$/, '');
  const path = String(profilePicture).startsWith('/') ? profilePicture : `/${profilePicture}`;
  return `${base}${path}`;
}

function DoctorProfilePage({ auth }) {
  const [doctors, setDoctors] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalRatings: 0, reviews: [] });
  const [identitySource, setIdentitySource] = useState('missing');
  const [formValues, setFormValues] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await getDoctors();
        let resolved = resolveCurrentDoctor(data);

        // Fallback: if local identity resolution fails, attempt direct lookup from auth user id(s).
        if (!resolved.doctor) {
          const candidateIds = [
            auth?.user?.id,
            auth?.user?._id,
            auth?.user?.userId
          ].filter(Boolean);

          for (const candidate of candidateIds) {
            // eslint-disable-next-line no-await-in-loop
            const direct = await getDoctorById(candidate).catch(() => null);
            if (direct) {
              resolved = { doctor: direct, source: 'direct-id' };
              break;
            }
          }
        }

        setDoctors(data);
        setDoctor(resolved.doctor);
        setIdentitySource(resolved.source);
        setFormValues(toFormValues(resolved.doctor));

        const resolvedId = resolved?.doctor?._id || resolved?.doctor?.id;
        if (resolvedId) {
          localStorage.setItem('primehealth:doctorId', String(resolvedId));
          localStorage.setItem('primehealth:userId', String(resolvedId));
          const reviews = await fetchDoctorReviews(resolvedId).catch(() => ({
            averageRating: Number(resolved.doctor?.ratingAverage || 0),
            totalRatings: Number(resolved.doctor?.ratingCount || 0),
            reviews: []
          }));
          setReviewSummary(reviews);
        } else {
          setReviewSummary({ averageRating: 0, totalRatings: 0, reviews: [] });
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load doctor profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [auth?.user?.id, auth?.user?._id, auth?.user?.userId]);

  const appointmentSummary = useMemo(() => summarizeDoctorAppointments(doctor), [doctor]);
  const availabilityDays = doctor?.availability?.length || 0;
  const doctorIdentifier = doctor?._id || doctor?.id;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleCancel = () => {
    setFormValues(toFormValues(doctor));
    setEditing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!doctorIdentifier) {
      toast.error('No logged-in doctor profile was found');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        phoneNumber: formValues.phoneNumber.trim(),
        specialization: formValues.specialization.trim(),
        qualifications: formValues.qualifications.trim(),
        experience: Number(formValues.experience),
        hospitalOrClinic: formValues.hospitalOrClinic.trim(),
        bio: formValues.bio.trim()
      };

      const updatedDoctor = await updateDoctor(doctorIdentifier, payload);
      setDoctor(updatedDoctor);
      setDoctors((current) =>
        current.map((item) => (String(item._id || item.id) === String(updatedDoctor._id || updatedDoctor.id) ? updatedDoctor : item))
      );
      setFormValues(toFormValues(updatedDoctor));
      const reviews = await fetchDoctorReviews(updatedDoctor._id || updatedDoctor.id).catch(() => null);
      if (reviews) {
        setReviewSummary(reviews);
      }
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update doctor profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !doctorIdentifier) {
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
      const updated = await uploadDoctorProfilePicture(doctorIdentifier, file);
      const refreshed = await getDoctorById(doctorIdentifier).catch(() => null);
      const finalDoctor = refreshed || updated;
      setDoctor(finalDoctor);
      setDoctors((current) =>
        current.map((item) =>
          String(item._id || item.id) === String(finalDoctor?._id || finalDoctor?.id) ? finalDoctor : item
        )
      );
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return <LoadingState label="Loading your doctor profile..." />;
  }

  if (!doctor) {
    return (
      <EmptyState
        title="Doctor profile unavailable"
        description="No registered doctor matched the current browser session. Sign in as a doctor or add doctor identity data from the auth service."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              My Doctor Profile
            </p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
              Dr. {doctor.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep your profile concise, accurate, and patient-friendly.
            </p>
          </div>
          <div className="pr-2 pt-1">
            <label className="group relative block cursor-pointer">
              <img
                src={getDoctorImageSrc(doctor.profilePicture)}
                alt="Doctor profile"
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

      {identitySource === 'missing' ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Doctor identity could not be resolved from this session. Profile actions are shown for
          the resolved record, but verify the logged-in doctor context before saving changes.
        </p>
      ) : null}

      <section className="panel p-4">
        <div className="grid gap-2 rounded-xl border border-brand-100 bg-brand-50/35 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white/90 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Overall Rating</p>
            <div className="mt-1">
              <StarRating
                value={reviewSummary.averageRating}
                size="sm"
                showValue
                reviewCount={reviewSummary.totalRatings}
              />
            </div>
          </div>
          {[
            ['Total Reviews', `${reviewSummary.totalRatings || 0} reviews`],
            ['Available Days', `${availabilityDays}`],
            ['Appointments', `${appointmentSummary.total} weekly`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white/90 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <p className="text-base font-semibold text-slate-900">Professional Credentials & Clinical Presence</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Credentials</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
              <li>- {doctor.qualifications || 'Not set'}</li>
              <li>- Specialization: {doctor.specialization || 'Not set'}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Experience</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
              <li>- Work history: {doctor.experience} years</li>
              <li>- Clinical focus: {doctor.specialization || 'General medicine'}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Clinic Presence</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
              <li>- Primary clinic: {doctor.hospitalOrClinic || 'Not set'}</li>
              <li>- Location: Colombo, Sri Lanka</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <p className="text-base font-semibold text-slate-900">Contact & Personal Summary</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Contact Details</p>
            <div className="mt-2 space-y-2 text-sm text-slate-800">
              <p><span className="font-semibold text-slate-900">Name:</span> {doctor.name}</p>
              <p className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px]">
                  ✉
                </span>
                <span><span className="font-semibold text-slate-900">Email:</span> {doctor.email}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px]">
                  ☎
                </span>
                <span><span className="font-semibold text-slate-900">Phone:</span> {doctor.phoneNumber || 'Not set'}</span>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Bio</p>
            <p className="mt-2 text-sm text-slate-800">{doctor.bio || 'Not set'}</p>
          </div>
        </div>
      </section>

      <section>
        <form className="panel p-5" onSubmit={handleSave}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
                Edit Details
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">
                Personal and professional information
              </h3>
            </div>
            {!editing ? (
              <button type="button" className="button-secondary" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Name</span>
              <input
                name="name"
                value={formValues.name}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Email</span>
              <input
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Phone number</span>
              <input
                name="phoneNumber"
                value={formValues.phoneNumber}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">
                Specialization
              </span>
              <input
                name="specialization"
                value={formValues.specialization}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Qualifications</span>
              <input
                name="qualifications"
                value={formValues.qualifications}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">
                Experience
              </span>
              <input
                name="experience"
                type="number"
                min="0"
                value={formValues.experience}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Hospital / Clinic</span>
              <input
                name="hospitalOrClinic"
                value={formValues.hospitalOrClinic}
                onChange={handleChange}
                className="input"
                disabled={!editing || saving}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">Description / Bio</span>
              <textarea
                name="bio"
                value={formValues.bio}
                onChange={handleChange}
                className="input min-h-[7rem] resize-y"
                disabled={!editing || saving}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {editing ? (
              <>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Update'}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Editing is locked until you choose Edit profile.
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

export default DoctorProfilePage;
