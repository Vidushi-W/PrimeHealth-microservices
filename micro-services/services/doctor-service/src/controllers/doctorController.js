const doctorService = require('../services/doctorService');
const asyncHandler = require('../utils/asyncHandler');

const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await doctorService.listDoctors(req.query);
  res.status(200).json({
    success: true,
    message: 'Doctors fetched',
    data: doctors
  });
});

const registerDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorService.registerDoctor(req.body);
  res.status(201).json({
    success: true,
    message: 'Doctor registered',
    data: doctor
  });
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorById(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Doctor fetched',
    data: doctor
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorService.updateDoctorById(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Doctor updated',
    data: doctor
  });
});

const addAvailability = asyncHandler(async (req, res) => {
  const availability = await doctorService.addAvailability(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Availability updated',
    data: availability
  });
});

const getAvailability = asyncHandler(async (req, res) => {
  const availability = await doctorService.getAvailability(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Availability fetched',
    data: availability
  });
});

const updateAvailabilitySlotStatus = asyncHandler(async (req, res) => {
  const availability = await doctorService.updateAvailabilitySlotStatus(
    req.params.id,
    req.body
  );
  res.status(200).json({
    success: true,
    message: 'Availability slot status updated',
    data: availability
  });
});

const getNextAvailableSlot = asyncHandler(async (req, res) => {
  const slot = await doctorService.getNextAvailableSlot(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Next available slot fetched',
    data: slot
  });
});

const getPatientSummary = asyncHandler(async (req, res) => {
  const summary = await doctorService.getPatientSummary(
    req.params.doctorId,
    req.params.patientId
  );
  res.status(200).json({
    success: true,
    message: 'Patient summary fetched',
    data: summary
  });
});

const syncDoctorFromAdmin = asyncHandler(async (req, res) => {
  const result = await doctorService.syncDoctorFromAdmin(req.body, req.headers);
  res.status(200).json({
    success: true,
    message: 'Doctor synced from admin service',
    data: result
  });
});

module.exports = {
  listDoctors,
  registerDoctor,
  getDoctorById,
  updateDoctor,
  addAvailability,
  getAvailability,
  updateAvailabilitySlotStatus,
  getNextAvailableSlot,
  getPatientSummary,
  syncDoctorFromAdmin
};
