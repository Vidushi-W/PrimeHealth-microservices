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

const updateAvailabilitySlot = asyncHandler(async (req, res) => {
  const availability = await doctorService.updateAvailabilitySlot(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Availability slot updated',
    data: availability
  });
});

const deleteAvailabilitySlot = asyncHandler(async (req, res) => {
  const availability = await doctorService.deleteAvailabilitySlot(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Availability slot removed',
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

const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file?.filename) {
    return res.status(400).json({
      success: false,
      message: 'Profile image file is required'
    });
  }

  const filePath = `/uploads/doctor-profiles/${req.file.filename}`;
  const doctor = await doctorService.uploadProfilePicture(req.params.id, filePath);

  res.status(200).json({
    success: true,
    message: 'Profile picture updated',
    data: doctor
  });
});

const submitReview = asyncHandler(async (req, res) => {
  const review = await doctorService.submitDoctorReview(req.params.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Review submitted',
    data: review
  });
});

const getReviews = asyncHandler(async (req, res) => {
  const reviews = await doctorService.listDoctorReviews(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Doctor reviews fetched',
    data: reviews
  });
});

const getUpcomingAppointments = asyncHandler(async (req, res) => {
  const appointments = await doctorService.getDoctorUpcomingAppointments(req.params.id, req.query.limit);

  res.status(200).json({
    success: true,
    message: 'Upcoming appointments fetched',
    data: appointments
  });
});

const getPatientReports = asyncHandler(async (req, res) => {
  const reports = await doctorService.getDoctorPatientReports(req.params.id, Number(req.query.limit) || 25);

  res.status(200).json({
    success: true,
    message: 'Patient reports fetched',
    data: reports
  });
});

const getEarnings = asyncHandler(async (req, res) => {
  const earnings = await doctorService.getDoctorEarnings(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Doctor earnings fetched',
    data: earnings
  });
});

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await doctorService.getDoctorNotifications(req.params.id, req.query.limit);

  res.status(200).json({
    success: true,
    message: 'Doctor notifications fetched',
    data: notifications
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
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getNextAvailableSlot,
  uploadProfilePicture,
  submitReview,
  getReviews,
  getUpcomingAppointments,
  getPatientReports,
  getEarnings,
  getNotifications,
  getPatientSummary,
  syncDoctorFromAdmin
};
