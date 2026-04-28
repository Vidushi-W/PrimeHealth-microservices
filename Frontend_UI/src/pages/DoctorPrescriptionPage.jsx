import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createPrescription, fetchDoctorPrescriptions } from '../services/platformApi';
import { getDoctors } from '../services/doctorService';
import { resolveCurrentDoctor } from '../utils/currentDoctor';

function emptyMedicine() {
  return { name: '', dosage: '', duration: '' };
}

export default function DoctorPrescriptionPage({ auth }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId') || '';
  const patientId = searchParams.get('patientId') || '';
  const patientName = searchParams.get('patientName') || 'Selected patient';
  const [resolvedDoctorId, setResolvedDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medicines, setMedicines] = useState([emptyMedicine()]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingPrescription, setExistingPrescription] = useState(null);

  const fallbackDoctorId = useMemo(
    () => String(auth?.user?.userId || auth?.user?.id || auth?.user?._id || '').trim(),
    [auth]
  );
  const doctorId = resolvedDoctorId || fallbackDoctorId;

  useEffect(() => {
    let mounted = true;

    const loadDoctor = async () => {
      try {
        const doctors = await getDoctors();
        if (!mounted) return;
        const resolvedDoctor = resolveCurrentDoctor(Array.isArray(doctors) ? doctors : []).doctor;
        const realDoctorId = String(resolvedDoctor?._id || resolvedDoctor?.id || '').trim();
        if (realDoctorId) {
          setResolvedDoctorId(realDoctorId);
        }
      } catch (_error) {
        // Keep fallback auth id if doctor directory lookup is unavailable.
      }
    };

    loadDoctor();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadExistingPrescription = async () => {
      if (!doctorId || !appointmentId) return;

      try {
        setLoadingExisting(true);
        const list = await fetchDoctorPrescriptions(auth, doctorId).catch(() => []);
        if (!mounted) return;
        const matched = Array.isArray(list)
          ? list.find((item) => String(item?.appointmentId || '').trim() === String(appointmentId).trim())
          : null;

        setExistingPrescription(matched || null);

        if (!matched) return;

        setDiagnosis(String(matched.diagnosis || ''));
        setNotes(String(matched.notes || ''));
        setMedicines(
          Array.isArray(matched.medicines) && matched.medicines.length
            ? matched.medicines.map((item) => ({
              name: String(item?.name || ''),
              dosage: String(item?.dosage || ''),
              duration: String(item?.duration || '')
            }))
            : [emptyMedicine()]
        );
      } finally {
        if (mounted) setLoadingExisting(false);
      }
    };

    loadExistingPrescription();

    return () => {
      mounted = false;
    };
  }, [auth, doctorId, appointmentId]);

  const canSubmit = appointmentId && patientId && doctorId && diagnosis.trim() && medicines.every(
    (item) => item.name.trim() && item.dosage.trim() && item.duration.trim()
  );

  const updateMedicine = (index, field, value) => {
    setMedicines((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const addMedicine = () => {
    setMedicines((current) => [...current, emptyMedicine()]);
  };

  const removeMedicine = (index) => {
    setMedicines((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error('Complete the diagnosis and medicine details first.');
      return;
    }

    try {
      setSubmitting(true);
      const prescription = await createPrescription(auth, {
        doctorId,
        patientId,
        appointmentId,
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
        medicines: medicines.map((item) => ({
          name: item.name.trim(),
          dosage: item.dosage.trim(),
          duration: item.duration.trim()
        }))
      });

      toast.success(existingPrescription ? 'Prescription updated successfully.' : 'Prescription generated successfully.');

      if (prescription?.pdfUrl) {
        window.open(prescription.pdfUrl, '_blank', 'noopener,noreferrer');
      }

      navigate('/doctor/appointments');
    } catch (error) {
      toast.error(error.message || 'Failed to generate prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCurrentPdf = async () => {
    const pdfUrl = existingPrescription?.pdfUrl;
    if (!pdfUrl) {
      toast.error('Prescription PDF is not available yet.');
      return;
    }

    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('Prescription PDF could not be opened.');
      }
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (_error) {
      toast.error('Prescription PDF is unavailable right now. Please save the prescription again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Prescription</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Generate prescription</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create a prescription for {patientName} linked to the completed appointment.
            </p>
          </div>
          <Link className="button-secondary" to="/doctor/appointments">Back to appointments</Link>
        </div>
      </section>

      <form className="panel p-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Patient</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{patientName}</p>
            <p className="mt-1 text-sm text-slate-600">Patient ID: {patientId || 'Unavailable'}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Appointment</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{appointmentId || 'Unavailable'}</p>
            <p className="mt-1 text-sm text-slate-600">Doctor ID: {doctorId || 'Unavailable'}</p>
          </div>
        </div>

        {loadingExisting ? (
          <p className="mt-4 text-sm text-slate-500">Loading saved prescription details...</p>
        ) : null}

        {existingPrescription ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
            <p>A saved prescription already exists for this completed appointment. Updating this form will refresh the saved record and PDF.</p>
            {existingPrescription.pdfUrl ? (
              <button
                type="button"
                className="button-secondary"
                onClick={handleOpenCurrentPdf}
              >
                View current PDF
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5">
          <label className="form-field">
            <span>Diagnosis</span>
            <textarea
              className="input min-h-28"
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              placeholder="Enter diagnosis"
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Medicines</p>
              <button className="button-secondary" type="button" onClick={addMedicine}>Add medicine</button>
            </div>

            {medicines.map((medicine, index) => (
              <div key={`medicine-${index}`} className="grid gap-3 rounded-2xl border border-brand-100 bg-white/80 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                <label className="form-field">
                  <span>Name</span>
                  <input
                    value={medicine.name}
                    onChange={(event) => updateMedicine(index, 'name', event.target.value)}
                    placeholder="Medicine name"
                  />
                </label>
                <label className="form-field">
                  <span>Dosage</span>
                  <input
                    value={medicine.dosage}
                    onChange={(event) => updateMedicine(index, 'dosage', event.target.value)}
                    placeholder="e.g. 1 tablet"
                  />
                </label>
                <label className="form-field">
                  <span>Duration</span>
                  <input
                    value={medicine.duration}
                    onChange={(event) => updateMedicine(index, 'duration', event.target.value)}
                    placeholder="e.g. 5 days"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => removeMedicine(index)}
                    disabled={medicines.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <label className="form-field">
            <span>Notes</span>
            <textarea
              className="input min-h-24"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional advice or notes"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link className="button-secondary" to="/doctor/appointments">Cancel</Link>
          <button
            className="button-primary"
            type="submit"
            disabled={!canSubmit || submitting}
          >
            {submitting ? 'Saving...' : existingPrescription ? 'Update prescription' : 'Generate prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}
