const axios = require('axios');
const Doctor = require('../models/Doctor');
const DoctorReview = require('../models/DoctorReview');
const ApiError = require('../utils/ApiError');
const { fetchPrescriptionsByPatient } = require('./prescriptionServiceClient');
const { fetchPatientSummary } = require('./patientServiceClient');
const { fetchDoctorAppointments } = require('./appointmentServiceClient');
const { fetchDoctorPayments } = require('./paymentServiceClient');

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SLOT_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked'
};

const ADMIN_SYNC_ALLOWED_STATUSES = new Set([
  'pending',
  'active',
  'verified',
  'inactive',
  'suspended',
  'deactivated'
]);

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (ADMIN_SYNC_ALLOWED_STATUSES.has(normalized)) {
    return normalized;
  }

  return 'active';
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function assertInternalSyncAuthorized(headers = {}) {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!expectedToken) {
    return;
  }

  const providedToken = headers['x-internal-service-token'] || '';

  if (providedToken !== expectedToken) {
    throw new ApiError(403, 'Forbidden: invalid internal service token');
  }
}

function parseTimeToMinutes(hhmm) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h * 60 + m;
}

function formatMinutes(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function ensurePositiveDuration(slotDuration) {
  if (!Number.isInteger(slotDuration) || slotDuration <= 0) {
    throw new ApiError(400, 'slotDuration must be a positive integer');
  }
}

function normalizeSlot(slot) {
  const startMin = parseTimeToMinutes(slot?.start);
  const endMin = parseTimeToMinutes(slot?.end);

  if (startMin === null || endMin === null) {
    throw new ApiError(400, 'Invalid time format. Use HH:mm');
  }
  if (endMin <= startMin) {
    throw new ApiError(400, 'Invalid time range: end must be after start');
  }

  const status = slot?.status || SLOT_STATUS.AVAILABLE;
  if (!Object.values(SLOT_STATUS).includes(status)) {
    throw new ApiError(400, 'Invalid slot status');
  }

  return {
    start: slot.start,
    end: slot.end,
    status,
    startMin,
    endMin
  };
}

function hasOverlap(ranges) {
  const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.startMin < prev.endMin) return true;
  }
  return false;
}

function buildSlotsFromRange(rangeStart, rangeEnd, slotDuration) {
  const startMin = parseTimeToMinutes(rangeStart);
  const endMin = parseTimeToMinutes(rangeEnd);

  if (startMin === null || endMin === null) {
    throw new ApiError(400, 'Invalid time format. Use HH:mm');
  }
  if (endMin <= startMin) {
    throw new ApiError(400, 'Invalid time range: end must be after start');
  }
  if (endMin - startMin < slotDuration) {
    throw new ApiError(400, 'Time range is smaller than slotDuration');
  }
  if ((endMin - startMin) % slotDuration !== 0) {
    throw new ApiError(400, 'Time range must divide evenly by slotDuration');
  }

  const slots = [];
  for (let current = startMin; current < endMin; current += slotDuration) {
    slots.push({
      start: formatMinutes(current),
      end: formatMinutes(current + slotDuration),
      status: SLOT_STATUS.AVAILABLE
    });
  }

  return slots;
}

function normalizeIncomingAvailability(availabilityItem) {
  const day = String(availabilityItem?.day || '').trim();
  const slotDuration = Number(availabilityItem?.slotDuration);

  if (!day) throw new ApiError(400, 'day is required');
  ensurePositiveDuration(slotDuration);

  let slots = [];
  if (Array.isArray(availabilityItem?.slots) && availabilityItem.slots.length > 0) {
    slots = availabilityItem.slots;
  } else if (availabilityItem?.rangeStart && availabilityItem?.rangeEnd) {
    slots = buildSlotsFromRange(
      availabilityItem.rangeStart,
      availabilityItem.rangeEnd,
      slotDuration
    );
  } else {
    throw new ApiError(400, 'Provide either slots or rangeStart and rangeEnd');
  }

  const normalizedSlots = slots.map(normalizeSlot);
  const invalidSlotSize = normalizedSlots.find(
    (slot) => slot.endMin - slot.startMin !== slotDuration
  );
  if (invalidSlotSize) {
    throw new ApiError(400, 'Each slot length must match slotDuration');
  }

  return { day, slotDuration, normalizedSlots };
}

function toPersistenceSlot(slot) {
  return { start: slot.start, end: slot.end, status: slot.status };
}

function buildMonthKey(dateValue) {
  const date = new Date(dateValue || Date.now());
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function updateDoctorRatingSummary(doctorId) {
  const reviews = await DoctorReview.find({ doctorId });
  const ratingCount = reviews.length;
  const ratingAverage = ratingCount
    ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / ratingCount
    : 0;

  await Doctor.findByIdAndUpdate(doctorId, {
    ratingAverage: Number(ratingAverage.toFixed(2)),
    ratingCount
  });
}

function sortDayAvailability(dayAvailability) {
  dayAvailability.slots.sort((a, b) => {
    const aMin = parseTimeToMinutes(a.start);
    const bMin = parseTimeToMinutes(b.start);
    return aMin - bMin;
  });
}

function sortPrescriptionsByDateDesc(prescriptions) {
  return [...prescriptions].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function calculateMostCommonDiagnosis(prescriptions) {
  const counts = new Map();

  for (const prescription of prescriptions) {
    const rawDiagnosis = String(prescription?.diagnosis || '').trim();
    if (!rawDiagnosis) continue;

    const key = rawDiagnosis.toLowerCase();
    const current = counts.get(key) || { label: rawDiagnosis, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }

  let winner = null;
  for (const item of counts.values()) {
    if (!winner || item.count > winner.count) {
      winner = item;
    }
  }

  return winner ? winner.label : null;
}

async function registerDoctor(payload) {
  const existing = await Doctor.findOne({ email: payload.email });
  if (existing) throw new ApiError(409, 'Doctor with this email already exists');

  const doctor = await Doctor.create(payload);
  return doctor;
}

const directoryReconcileState = { lastAt: 0 };

async function reconcileDoctorDirectoryFromAdmin(force = false) {
  const base = (process.env.ADMIN_SERVICE_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.INTERNAL_SERVICE_TOKEN || '').trim();
  if (!base || !token) {
    return;
  }

  const minMs = Number(process.env.ADMIN_DIRECTORY_RECONCILE_MS || 15000);
  const now = Date.now();
  if (!force && now - directoryReconcileState.lastAt < minMs) {
    return;
  }
  directoryReconcileState.lastAt = now;

  try {
    const { data } = await axios.get(`${base}/api/internal/doctors/directory`, {
      headers: { 'x-internal-service-token': token },
      timeout: 25000
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    for (const row of rows) {
      await upsertDoctorFromAdminPayload(row);
    }
  } catch (err) {
    console.error('[doctor-service] Reconcile doctors from admin failed:', err.message);
    directoryReconcileState.lastAt = 0;
  }
}

async function listDoctors(filters = {}) {
  await reconcileDoctorDirectoryFromAdmin(false);

  const query = {};

  if (filters.specialization) {
    query.specialization = new RegExp(`^${String(filters.specialization).trim()}$`, 'i');
  }

  if (filters.includeInactive !== 'true') {
    query.isActive = true;
    query.status = { $nin: ['deactivated', 'inactive', 'suspended'] };
  }

  const doctors = await Doctor.find(query).sort({ name: 1 });
  return doctors;
}

async function getDoctorById(id) {
  const raw = String(id || '').trim();
  if (!raw) {
    throw new ApiError(404, 'Doctor id is required');
  }

  let doctor = await Doctor.findById(raw);
  if (doctor) {
    return doctor;
  }

  doctor = await Doctor.findOne({
    $or: [{ email: raw }, { externalRef: raw }, { uniqueId: raw }],
  });
  if (doctor) {
    return doctor;
  }

  await reconcileDoctorDirectoryFromAdmin(true);

  doctor = await Doctor.findById(raw);
  if (doctor) {
    return doctor;
  }
  doctor = await Doctor.findOne({
    $or: [{ email: raw }, { externalRef: raw }, { uniqueId: raw }],
  });
  if (doctor) {
    return doctor;
  }

  throw new ApiError(404, `Doctor not found with ID/Email: ${raw}`);
}

async function updateDoctorById(id, updates) {
  const doctor = await getDoctorById(id);

  if (updates.email) {
    const existing = await Doctor.findOne({ email: updates.email, _id: { $ne: doctor._id } });
    if (existing) throw new ApiError(409, 'Doctor with this email already exists');
  }

  const updated = await Doctor.findByIdAndUpdate(doctor._id, updates, {
    new: true,
    runValidators: true
  });

  if (!updated) throw new ApiError(404, 'Doctor not found');
  return updated;
}

async function addAvailability(id, availabilityItem) {
  const doctor = await getDoctorById(id);
  const { day, slotDuration, normalizedSlots } = normalizeIncomingAvailability(availabilityItem);

  const existingDay = doctor.availability.find(
    (item) => item.day.toLowerCase() === day.toLowerCase()
  );

  if (!existingDay) {
    if (hasOverlap(normalizedSlots)) {
      throw new ApiError(400, 'Availability slots overlap');
    }

    doctor.availability.push({
      day,
      slotDuration,
      slots: normalizedSlots.map(toPersistenceSlot)
    });
  } else {
    if (existingDay.slotDuration !== slotDuration) {
      throw new ApiError(400, 'slotDuration must match the existing duration for this day');
    }

    const existingRanges = existingDay.slots.map((slot) => normalizeSlot(slot));
    const combined = [...existingRanges, ...normalizedSlots];
    if (hasOverlap(combined)) {
      throw new ApiError(400, 'Availability slots overlap');
    }

    existingDay.slots.push(...normalizedSlots.map(toPersistenceSlot));
    sortDayAvailability(existingDay);
  }

  await doctor.save();
  return doctor.availability;
}

async function getAvailability(id) {
  const doctor = await getDoctorById(id);
  return doctor.availability;
}

async function updateAvailabilitySlotStatus(id, payload) {
  const doctor = await getDoctorById(id);
  const dayKey = String(payload?.day || '').toLowerCase();

  const dayAvailability = doctor.availability.find(
    (item) => String(item.day).toLowerCase() === dayKey
  );
  if (!dayAvailability) {
    throw new ApiError(404, 'Availability day not found');
  }

  const targetSlot = dayAvailability.slots.find(
    (slot) => slot.start === payload.start && slot.end === payload.end
  );
  if (!targetSlot) {
    throw new ApiError(404, 'Availability slot not found');
  }

  if (targetSlot.status === payload.status) {
    if (payload.status === SLOT_STATUS.BOOKED) {
      throw new ApiError(409, 'Slot is already booked');
    }
    return doctor.availability;
  }

  targetSlot.status = payload.status;
  await doctor.save();
  return doctor.availability;
}

async function updateAvailabilitySlot(id, payload) {
  const doctor = await getDoctorById(id);
  const dayKey = String(payload?.day || '').toLowerCase();
  const dayAvailability = doctor.availability.find(
    (item) => String(item.day).toLowerCase() === dayKey
  );

  if (!dayAvailability) {
    throw new ApiError(404, 'Availability day not found');
  }

  const slotIndex = dayAvailability.slots.findIndex(
    (slot) => slot.start === payload.start && slot.end === payload.end
  );

  if (slotIndex === -1) {
    throw new ApiError(404, 'Availability slot not found');
  }

  const nextStart = payload.newStart || payload.start;
  const nextEnd = payload.newEnd || payload.end;
  const normalized = normalizeSlot({
    start: nextStart,
    end: nextEnd,
    status: payload.status || dayAvailability.slots[slotIndex].status
  });

  if (normalized.endMin - normalized.startMin !== dayAvailability.slotDuration) {
    throw new ApiError(400, 'Updated slot must keep the same slotDuration for the day');
  }

  const currentSlots = dayAvailability.slots
    .filter((_, index) => index !== slotIndex)
    .map((slot) => normalizeSlot(slot));

  if (hasOverlap([...currentSlots, normalized])) {
    throw new ApiError(400, 'Updated slot overlaps with an existing slot');
  }

  dayAvailability.slots[slotIndex].start = normalized.start;
  dayAvailability.slots[slotIndex].end = normalized.end;
  dayAvailability.slots[slotIndex].status = normalized.status;

  sortDayAvailability(dayAvailability);
  await doctor.save();

  return doctor.availability;
}

async function deleteAvailabilitySlot(id, payload) {
  const doctor = await getDoctorById(id);
  const dayKey = String(payload?.day || '').toLowerCase();
  const dayAvailability = doctor.availability.find(
    (item) => String(item.day).toLowerCase() === dayKey
  );

  if (!dayAvailability) {
    throw new ApiError(404, 'Availability day not found');
  }

  const initialLength = dayAvailability.slots.length;
  dayAvailability.slots = dayAvailability.slots.filter(
    (slot) => !(slot.start === payload.start && slot.end === payload.end)
  );

  if (dayAvailability.slots.length === initialLength) {
    throw new ApiError(404, 'Availability slot not found');
  }

  doctor.availability = doctor.availability.filter((item) => item.slots.length > 0);
  await doctor.save();

  return doctor.availability;
}

async function getNextAvailableSlot(id) {
  const doctor = await getDoctorById(id);
  if (!doctor.availability || doctor.availability.length === 0) {
    throw new ApiError(404, 'No availability found');
  }

  const items = doctor.availability
    .map((availabilityItem) => ({
      day: availabilityItem.day,
      dayKey: String(availabilityItem.day).toLowerCase(),
      slotDuration: availabilityItem.slotDuration,
      slots: (availabilityItem.slots || [])
        .map((slot) => normalizeSlot(slot))
        .filter((slot) => slot.status === SLOT_STATUS.AVAILABLE)
    }))
    .sort((a, b) => {
      const ai = DAY_ORDER.indexOf(a.dayKey);
      const bi = DAY_ORDER.indexOf(b.dayKey);
      const ax = ai === -1 ? 999 : ai;
      const bx = bi === -1 ? 999 : bi;
      return ax - bx;
    });

  for (const dayItem of items) {
    const sortedSlots = [...dayItem.slots].sort((x, y) => x.startMin - y.startMin);
    if (sortedSlots.length > 0) {
      const slot = sortedSlots[0];
      return {
        day: dayItem.day,
        slotDuration: dayItem.slotDuration,
        start: slot.start,
        end: slot.end,
        status: slot.status
      };
    }
  }

  throw new ApiError(404, 'No available slots found');
}

async function getPatientSummary(doctorId, patientId) {
  await getDoctorById(doctorId);

  const allPatientPrescriptions = await fetchPrescriptionsByPatient(patientId);
  const patientSummary = await fetchPatientSummary(patientId);
  const prescriptionsForDoctor = sortPrescriptionsByDateDesc(
    (allPatientPrescriptions || []).filter(
      (prescription) => String(prescription.doctorId) === String(doctorId)
    )
  );

  return {
    patient: patientSummary?.patient || { id: patientId },
    stats: {
      totalPrescriptions: prescriptionsForDoctor.length,
      lastPrescriptionDate: prescriptionsForDoctor[0]?.createdAt || null,
      mostCommonDiagnosis: calculateMostCommonDiagnosis(prescriptionsForDoctor),
      totalReports: Array.isArray(patientSummary?.reports) ? patientSummary.reports.length : 0
    },
    recentPrescriptions: prescriptionsForDoctor.slice(0, 5),
    reports: patientSummary?.reports || []
  };
}

async function uploadProfilePicture(id, filePath) {
  const doctor = await getDoctorById(id);
  const updated = await Doctor.findByIdAndUpdate(
    doctor._id,
    { profilePicture: filePath },
    { new: true }
  );

  return updated;
}

async function listDoctorReviews(doctorId) {
  await getDoctorById(doctorId);

  const reviews = await DoctorReview.find({ doctorId }).sort({ createdAt: -1 }).limit(100);
  const doctor = await Doctor.findById(doctorId);

  return {
    averageRating: doctor?.ratingAverage || 0,
    totalRatings: doctor?.ratingCount || 0,
    reviews
  };
}

async function submitDoctorReview(doctorId, payload) {
  await getDoctorById(doctorId);

  const rating = Number(payload?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'rating must be between 1 and 5');
  }

  const patientId = String(payload?.patientId || '').trim();
  if (!patientId) {
    throw new ApiError(400, 'patientId is required');
  }

  const appointmentId = String(payload?.appointmentId || '').trim();
  const reviewIdQuery = {
    doctorId,
    patientId,
    appointmentId
  };

  const review = await DoctorReview.findOneAndUpdate(
    reviewIdQuery,
    {
      doctorId,
      patientId,
      patientName: String(payload?.patientName || '').trim(),
      appointmentId,
      rating,
      review: String(payload?.review || '').trim()
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  await updateDoctorRatingSummary(doctorId);
  return review;
}

async function getDoctorUpcomingAppointments(doctorId, limit = 10) {
  await getDoctorById(doctorId);

  const appointments = await fetchDoctorAppointments(doctorId, Math.max(10, Number(limit) || 10));
  const now = Date.now();
  const upcoming = appointments
    .filter((item) => {
      const datePart = String(item?.appointmentDate || '').slice(0, 10);
      const timePart = String(item?.startTime || '00:00').slice(0, 5);
      const combinedAt = new Date(`${datePart}T${timePart}:00`).getTime();
      const appointmentDate = Number.isFinite(combinedAt) && combinedAt > 0
        ? combinedAt
        : new Date(item?.appointmentDate || 0).getTime();
      const status = String(item?.status || '').toUpperCase();
      return appointmentDate >= now && !['CANCELLED', 'COMPLETED'].includes(status);
    })
    .slice(0, Number(limit) || 10)
    .map((item) => ({
      id: item._id || item.id,
      patientId: item.patientId,
      patientName: item.patientName || item.patientId,
      appointmentDate: item.appointmentDate,
      appointmentTime: item.startTime,
      appointmentEndTime: item.endTime,
      status: item.status,
      reason: item.reason || item.notes || '',
      paymentStatus: item.paymentStatus || 'UNPAID',
      createdAt: item.createdAt || null
    }));

  return upcoming;
}

async function getDoctorNotifications(doctorId, limit = 30) {
  await getDoctorById(doctorId);

  const maxItems = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [appointments, payments] = await Promise.all([
    fetchDoctorAppointments(doctorId, 120),
    fetchDoctorPayments(doctorId).catch(() => ({
      payments: []
    }))
  ]);

  const appointmentItems = (appointments || []).map((item) => {
    const status = String(item?.status || 'PENDING').toUpperCase();
    const createdAt = new Date(item?.createdAt || 0).getTime();
    const isNewBooking = Number.isFinite(createdAt) && Date.now() - createdAt <= 24 * 60 * 60 * 1000;
    return {
      id: `appt-${item._id || item.id}`,
      type: 'APPOINTMENT',
      title: isNewBooking
        ? `New appointment from ${item.patientName || item.patientId || 'patient'}`
        : `Appointment ${status.toLowerCase()} for ${item.patientName || item.patientId || 'patient'}`,
      subtitle: `${new Date(item.appointmentDate || Date.now()).toLocaleDateString()} ${item.startTime || 'TBD'} • Payment ${String(item.paymentStatus || 'UNPAID').toUpperCase()}`,
      actionTo: '/doctor/appointments',
      actionLabel: 'Open appointments',
      eventTime: item.createdAt || item.updatedAt || item.appointmentDate
    };
  });

  const paymentList = Array.isArray(payments) ? payments : (payments?.payments || []);
  const paymentItems = paymentList.map((item) => ({
    id: `pay-${item._id || item.id || item.orderId}`,
    type: 'PAYMENT',
    title: `Payment ${String(item.status || 'PENDING').toLowerCase()} for appointment`,
    subtitle: `LKR ${Number(item.amount || 0).toFixed(2)} • ${item.orderId || 'order'} `,
    actionTo: '/doctor/earnings',
    actionLabel: 'Open earnings',
    eventTime: item.paidAt || item.updatedAt || item.createdAt
  }));

  return [...appointmentItems, ...paymentItems]
    .sort((a, b) => new Date(b.eventTime || 0).getTime() - new Date(a.eventTime || 0).getTime())
    .slice(0, maxItems);
}

async function getDoctorPatientReports(doctorId, limit = 25) {
  await getDoctorById(doctorId);

  const appointments = await fetchDoctorAppointments(doctorId, 100);
  const patientIds = [...new Set(appointments.map((item) => String(item.patientId || '')).filter(Boolean))];
  const reports = [];

  for (const patientId of patientIds) {
    if (reports.length >= limit) break;

    try {
      const summary = await fetchPatientSummary(patientId);
      const patientName = summary?.patient?.fullName || summary?.patient?.name || patientId;

      for (const report of summary?.reports || []) {
        reports.push({
          patientId,
          patientName,
          reportId: report._id || report.reportId,
          fileName: report.fileName,
          fileUrl: report.fileUrl,
          reportType: report.reportType,
          uploadedAt: report.createdAt || report.uploadedAt || null
        });

        if (reports.length >= limit) break;
      }
    } catch (_error) {
      // Skip a single patient summary failure so dashboard still renders.
    }
  }

  return reports;
}

async function getDoctorEarnings(doctorId) {
  await getDoctorById(doctorId);

  const paymentSummary = await fetchDoctorPayments(doctorId);
  if (!paymentSummary) {
    return {
      totalEarnings: 0,
      currentMonthEarnings: 0,
      completedPaidConsultations: 0,
      monthlyHistory: []
    };
  }

  return paymentSummary;
}

async function upsertDoctorFromAdminPayload(payload) {
  const email = String(payload?.email || '').trim().toLowerCase();
  if (!email) {
    throw new ApiError(400, 'email is required for doctor sync');
  }

  const externalRef = String(payload?.externalRef || payload?.adminId || payload?.id || '').trim();
  const uniqueId = String(payload?.uniqueId || '').trim();
  const incomingStatus = normalizeStatus(payload?.status);
  const explicitIsActive = payload?.isActive;
  const explicitIsVerified = payload?.isVerified;

  const existingDoctor = await Doctor.findOne({
    $or: [
      ...(externalRef ? [{ externalRef }] : []),
      ...(uniqueId ? [{ uniqueId }] : []),
      { email }
    ]
  });

  const stableId =
    existingDoctor?._id ||
    externalRef ||
    uniqueId ||
    email;

  const computedIsActive =
    explicitIsActive !== undefined
      ? Boolean(explicitIsActive)
      : !['deactivated', 'inactive', 'suspended'].includes(incomingStatus);

  const computedIsVerified =
    explicitIsVerified !== undefined
      ? Boolean(explicitIsVerified)
      : incomingStatus === 'verified';

  const updates = {
    _id: stableId,
    ...(externalRef ? { externalRef } : {}),
    ...(uniqueId ? { uniqueId } : {}),
    email,
    name: String(payload?.name || payload?.fullName || existingDoctor?.name || email).trim(),
    specialization: String(payload?.specialization || payload?.specialty || existingDoctor?.specialization || 'General').trim(),
    experience: Number.isFinite(Number(payload?.experience)) ? Math.max(0, Number(payload.experience)) : Number(existingDoctor?.experience || 0),
    status: incomingStatus,
    isActive: toBoolean(computedIsActive, true),
    isVerified: toBoolean(computedIsVerified, false)
  };

  const syncedDoctor = await Doctor.findByIdAndUpdate(stableId, updates, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true
  });

  return syncedDoctor;
}

async function syncDoctorFromAdmin(payload, headers = {}) {
  assertInternalSyncAuthorized(headers);
  return upsertDoctorFromAdminPayload(payload);
}

module.exports = {
  listDoctors,
  registerDoctor,
  getDoctorById,
  updateDoctorById,
  uploadProfilePicture,
  addAvailability,
  getAvailability,
  updateAvailabilitySlotStatus,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getNextAvailableSlot,
  submitDoctorReview,
  listDoctorReviews,
  getDoctorUpcomingAppointments,
  getDoctorPatientReports,
  getDoctorEarnings,
  getDoctorNotifications,
  getPatientSummary,
  syncDoctorFromAdmin
};
