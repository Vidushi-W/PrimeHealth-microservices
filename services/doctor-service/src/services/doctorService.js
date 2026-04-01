const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');

async function registerDoctor(payload) {
  const existing = await Doctor.findOne({ email: payload.email });
  if (existing) throw new ApiError(409, 'Doctor with this email already exists');

  const doctor = await Doctor.create(payload);
  return doctor;
}

async function getDoctorById(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid doctor id');
  const doctor = await Doctor.findById(id);
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  return doctor;
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

  const existingDay = doctor.availability.find(
    (a) => a.day.toLowerCase() === String(day).toLowerCase()
  );

  if (!existingDay) {
    doctor.availability.push({ day, slots });
  } else {
    existingDay.slots.push(...slots);
  }

  await doctor.save();
  return doctor.availability;
}

async function getAvailability(id) {
  const doctor = await getDoctorById(id);
  return doctor.availability;
}

module.exports = {
  registerDoctor,
  getDoctorById,
  updateDoctorById,
  addAvailability,
  getAvailability
};
