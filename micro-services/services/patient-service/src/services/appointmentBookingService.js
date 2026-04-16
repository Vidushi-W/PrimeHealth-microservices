const PatientAppointment = require("../models/PatientAppointment");
const PatientProfile = require("../models/PatientProfile");
const { getDoctorBookingDetails, getDoctorSlots, searchDoctors } = require("./doctorDirectoryService");

function formatDateLabel(dateText) {
  if (!dateText) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateText}T00:00:00Z`));
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
    fee: appointment.fee,
    appointmentDate: appointment.appointmentDate,
    dateLabel: formatDateLabel(appointment.appointmentDate),
    timeSlot: appointment.timeSlot,
    mode: appointment.mode,
    reason: appointment.reason,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    sharedReports: (appointment.sharedReports || []).map((report) => ({
      reportId: report.reportId,
      fileName: report.fileName,
      fileUrl: report.fileUrl,
      reportType: report.reportType,
      reportDate: report.reportDate,
      hospitalOrLabName: report.hospitalOrLabName,
      doctorName: report.doctorName,
      notes: report.notes,
      analyzerStatus: report.analyzerStatus,
      analyzerType: report.analyzerType,
      summary: report.summary,
      findings: report.findings || [],
      confidence: report.confidence,
      disclaimer: report.disclaimer,
      extractedValues: report.extractedValues || {},
      metrics: report.metrics || {},
    })),
    createdAt: appointment.createdAt,
  };
}

function buildSharedReportsSnapshot(uploadedReports = []) {
  return uploadedReports
    .slice()
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .map((report) => ({
      reportId: report._id,
      fileName: report.fileName,
      fileUrl: report.fileUrl,
      reportType: report.reportType,
      reportDate: report.reportDate,
      hospitalOrLabName: report.hospitalOrLabName,
      doctorName: report.doctorName,
      notes: report.notes,
      analyzerStatus: report.analyzer?.status || "not_started",
      analyzerType: report.analyzer?.analyzerType || "",
      summary: report.analyzer?.summary || "",
      findings: report.analyzer?.findings || [],
      confidence: report.analyzer?.confidence || 0,
      disclaimer: report.analyzer?.disclaimer || "",
      extractedValues: report.analyzer?.extractedValues || {},
      metrics: {
        glucose: report.analyzer?.extractedValues?.glucose || "",
        cholesterol: report.analyzer?.extractedValues?.cholesterol || "",
        hemoglobin: report.analyzer?.extractedValues?.hemoglobin || "",
      },
    }));
}

async function listBookableDoctors(filters) {
  return searchDoctors(filters);
}

async function listDoctorSlots(doctorId, dateText, mode) {
  const candidateSlots = await getDoctorSlots(doctorId, dateText, mode);
  if (!candidateSlots.length) {
    return [];
  }

  const reservedAppointments = await PatientAppointment.find({
    doctorId,
    appointmentDate: dateText,
    mode,
    status: { $in: ["pending_payment", "booked", "confirmed"] },
  }).select("timeSlot");

  const reservedSlotValues = new Set(reservedAppointments.map((appointment) => appointment.timeSlot));

  return candidateSlots.map((slot) => ({
    ...slot,
    disabled: reservedSlotValues.has(slot.value),
  }));
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
  const isSlotAvailable = slots.some((slot) => slot.value === payload.timeSlot && !slot.disabled);
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
    status: { $in: ["pending_payment", "booked", "confirmed"] },
  });

  if (conflicting) {
    return {
      status: 409,
      body: { message: "That slot has already been booked" },
    };
  }

  const patientProfile = await PatientProfile.findOne({ userId: patientId });
  if (!patientProfile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const appointment = await PatientAppointment.create({
    patientId,
    patientProfileId: patientProfile._id,
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    specialization: doctor.specialization,
    hospitalOrClinic: doctor.hospitalOrClinic,
    fee: doctor.consultationFee || 0,
    appointmentDate: payload.appointmentDate,
    timeSlot: payload.timeSlot,
    mode: payload.mode,
    reason: payload.reason || "",
    status: "pending_payment",
    paymentStatus: "pending",
    sharedReports: buildSharedReportsSnapshot(patientProfile.uploadedReports || []),
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
