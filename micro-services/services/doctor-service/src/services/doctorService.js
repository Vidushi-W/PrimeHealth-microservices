const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { fetchPrescriptionsByPatient } = require('./prescriptionServiceClient');

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function parseTimeToMinutes(hhmm) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h * 60 + m;
}

function normalizeSlot(slot) {
  const startMin = parseTimeToMinutes(slot?.start);
  const endMin = parseTimeToMinutes(slot?.end);
  if (startMin === null || endMin === null) {
    throw new ApiError(400, 'Invalid time format. Use HH:mm-HH:mm');
  }
  if (endMin <= startMin) {
    throw new ApiError(400, 'Invalid time range: end must be after start');
  }
  return { start: slot.start, end: slot.end, startMin, endMin };
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

async function registerDoctor(payload) {
  const existing = await Doctor.findOne({ email: payload.email });
  if (existing) throw new ApiError(409, 'Doctor with this email already exists');

  const doctor = await Doctor.create(payload);
  return doctor;
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

  const day = availabilityItem.day;
  const slots = availabilityItem.slots || [];
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(400, 'At least one slot is required');
  }

  const newRanges = slots.map(normalizeSlot);

  const existingDay = doctor.availability.find(
    (a) => a.day.toLowerCase() === String(day).toLowerCase()
  );

  if (!existingDay) {
    if (hasOverlap(newRanges)) {
      throw new ApiError(400, 'Availability slots overlap');
    }
    doctor.availability.push({ day, slots: newRanges.map(({ start, end }) => ({ start, end })) });
  } else {
    const existingRanges = existingDay.slots.map((s) => normalizeSlot(s));
    const combined = [...existingRanges, ...newRanges];
    if (hasOverlap(combined)) {
      throw new ApiError(400, 'Availability slots overlap');
    }
    existingDay.slots.push(...newRanges.map(({ start, end }) => ({ start, end })));
  }

  await doctor.save();
  return doctor.availability;
}

async function getAvailability(id) {
  const doctor = await getDoctorById(id);
  return doctor.availability;
}

async function getNextAvailableSlot(id) {
  const doctor = await getDoctorById(id);
  if (!doctor.availability || doctor.availability.length === 0) {
    throw new ApiError(404, 'No availability found');
  }

  const items = doctor.availability
    .map((a) => ({
      day: a.day,
      dayKey: String(a.day).toLowerCase(),
      slots: (a.slots || []).map((s) => normalizeSlot(s))
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
      const s = sortedSlots[0];
      return { day: dayItem.day, start: s.start, end: s.end };
    }
  }

  throw new ApiError(404, 'No availability found');
}

async function getPatientSummary(doctorId, patientId) {
  // Ensure doctor exists (also validates id format)
  await getDoctorById(doctorId);

  const allPatientPrescriptions = await fetchPrescriptionsByPatient(patientId);
  const prescriptionsForDoctor = (allPatientPrescriptions || []).filter(
    (p) => String(p.doctorId) === String(doctorId)
  );

  return {
    patient: {
      id: patientId,
      name: 'Mock Patient',
      age: 34,
      gender: 'Unknown',
      lastVisit: null
    },
    stats: {
      totalPrescriptions: prescriptionsForDoctor.length
    },
    prescriptions: prescriptionsForDoctor
  };
}

module.exports = {
  registerDoctor,
  getDoctorById,
  updateDoctorById,
  addAvailability,
  getAvailability,
  getNextAvailableSlot,
  getPatientSummary
};
