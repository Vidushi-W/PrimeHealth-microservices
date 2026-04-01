const doctorService = require('../services/doctorService');

async function registerDoctor(req, res, next) {
  try {
    const doctor = await doctorService.registerDoctor(req.body);
    res.status(201).json({
      success: true,
      message: 'Doctor registered',
      data: doctor
    });
  } catch (err) {
    next(err);
  }
}

async function getDoctorById(req, res, next) {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Doctor fetched',
      data: doctor
    });
  } catch (err) {
    next(err);
  }
}

async function updateDoctor(req, res, next) {
  try {
    const doctor = await doctorService.updateDoctorById(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Doctor updated',
      data: doctor
    });
  } catch (err) {
    next(err);
  }
}

async function addAvailability(req, res, next) {
  try {
    const availability = await doctorService.addAvailability(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Availability updated',
      data: availability
    });
  } catch (err) {
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const availability = await doctorService.getAvailability(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Availability fetched',
      data: availability
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerDoctor,
  getDoctorById,
  updateDoctor,
  addAvailability,
  getAvailability
};
