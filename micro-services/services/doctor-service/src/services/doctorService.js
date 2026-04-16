const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { fetchPrescriptionsByPatient } = require('./prescriptionServiceClient');
const { fetchPatientSummary } = require('./patientServiceClient');

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SLOT_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked'
};

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

async function listDoctors(filters = {}) {
  const query = {};

  if (filters.specialization) {
    query.specialization = new RegExp(`^${String(filters.specialization).trim()}$`, 'i');
  }

  const doctors = await Doctor.find(query).sort({ name: 1 });
  return doctors;
}

async function getDoctorById(id) {
  const doctor = await Doctor.findById(id);
  
  if (!doctor) {
    // Try email as fallback
    const byEmail = await Doctor.findOne({ email: id });
    if (!byEmail) throw new ApiError(404, `Doctor not found with ID/Email: ${id}`);
    
    const doctorObj = byEmail.toObject();
    doctorObj.isAvailable = true;
    return doctorObj;
  }
  
  const doctorObj = doctor.toObject();
  doctorObj.isAvailable = true; 
  
  return doctorObj;
}

async function updateDoctorById(id, updates) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid doctor id');

  if (updates.email) {
    const existing = await Doctor.findOne({ email: updates.email, _id: { $ne: id } });
    if (existing) throw new ApiError(409, 'Doctor with this email already exists');
  }

  const doctor = await Doctor.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true
  });
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  return doctor;
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

module.exports = {
  listDoctors,
  registerDoctor,
  getDoctorById,
  updateDoctorById,
  addAvailability,
  getAvailability,
  updateAvailabilitySlotStatus,
  getNextAvailableSlot,
  getPatientSummary
};
