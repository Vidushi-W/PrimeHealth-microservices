const PatientAppointment = require("../models/PatientAppointment");
const { getDoctorBookingDetails, getDoctorSlots, searchDoctors } = require("./doctorDirectoryService");

function formatDateLabel(dateText) {
  if (!dateText) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateText}T00:00:00`));
}

function buildAppointmentResponse(appointment) {
  return {
    id: appointment._id,
    appointmentId: appointment._id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName,
    specialization: appointment.specialization,
    hospitalOrClinic: appointment.hospitalOrClinic,
    appointmentDate: appointment.appointmentDate,
    dateLabel: formatDateLabel(appointment.appointmentDate),
    timeSlot: appointment.timeSlot,
    mode: appointment.mode,
    reason: appointment.reason,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    createdAt: appointment.createdAt,
  };
}

async function listBookableDoctors(filters) {
  return searchDoctors(filters);
}

async function listDoctorSlots(doctorId, dateText, mode) {
  return getDoctorSlots(doctorId, dateText, mode);
}

async function listMyAppointments(patientId) {
  const appointments = await PatientAppointment.find({ patientId }).sort({
    appointmentDate: 1,
    createdAt: -1,
  });

  return appointments.map(buildAppointmentResponse);
}

async function createAppointmentBooking(patientId, payload) {
  const requiredFields = ["doctorId", "appointmentDate", "timeSlot", "mode"];
  const missing = requiredFields.filter((field) => !String(payload[field] || "").trim());

  if (missing.length) {
    return {
      status: 400,
      body: { message: `Missing required fields: ${missing.join(", ")}` },
    };
  }

  const doctor = await getDoctorBookingDetails(payload.doctorId);
  if (!doctor) {
    return {
      status: 404,
      body: { message: "Doctor not found in patient booking directory" },
    };
  }

  if (!doctor.supportedModes.includes(payload.mode)) {
    return {
      status: 400,
      body: { message: "Selected appointment mode is not supported for this doctor" },
    };
  }

  const slots = await listDoctorSlots(payload.doctorId, payload.appointmentDate, payload.mode);
  const isSlotAvailable = slots.some((slot) => slot.value === payload.timeSlot);
  if (!isSlotAvailable) {
    return {
      status: 400,
      body: { message: "Selected slot is not currently available" },
    };
  }

  const conflicting = await PatientAppointment.findOne({
    doctorId: payload.doctorId,
    appointmentDate: payload.appointmentDate,
    timeSlot: payload.timeSlot,
    status: { $in: ["booked", "confirmed"] },
  });

  if (conflicting) {
    return {
      status: 409,
      body: { message: "That slot has already been booked" },
    };
  }

  const appointment = await PatientAppointment.create({
    patientId,
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    specialization: doctor.specialization,
    hospitalOrClinic: doctor.hospitalOrClinic,
    appointmentDate: payload.appointmentDate,
    timeSlot: payload.timeSlot,
    mode: payload.mode,
    reason: payload.reason || "",
    status: "booked",
    paymentStatus: "pending",
  });

  return {
    status: 201,
    body: {
      message: "Appointment booked successfully",
      appointment: buildAppointmentResponse(appointment),
    },
  };
}

module.exports = {
  buildAppointmentResponse,
  createAppointmentBooking,
  listBookableDoctors,
  listDoctorSlots,
  listMyAppointments,
};
