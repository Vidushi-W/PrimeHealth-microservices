const {
  createAppointmentBooking,
  listBookableDoctors,
  listDoctorSlots,
  listMyAppointments,
} = require("../services/appointmentBookingService");

async function getDoctors(req, res) {
  try {
    const doctors = await listBookableDoctors(req.query);
    return res.status(200).json({
      message: "Doctors fetched successfully",
      doctors,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctors",
      error: error.message,
    });
  }
}

async function getDoctorSlots(req, res) {
  try {
    const slots = await listDoctorSlots(req.params.doctorId, req.query.date, req.query.mode);
    return res.status(200).json({
      message: "Doctor slots fetched successfully",
      slots,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctor slots",
      error: error.message,
    });
  }
}

async function getAppointments(req, res) {
  try {
    const appointments = await listMyAppointments(req.user._id);
    return res.status(200).json({
      message: "Appointments fetched successfully",
      appointments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
}

async function createAppointment(req, res) {
  try {
    const result = await createAppointmentBooking(req.user._id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create appointment",
      error: error.message,
    });
  }
}

module.exports = {
  createAppointment,
  getAppointments,
  getDoctors,
  getDoctorSlots,
};
