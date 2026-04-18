const PatientAppointment = require("../models/PatientAppointment");
const axios = require("axios");
const User = require("../models/User");
const { getAccessibleProfile } = require("./familyProfileService");
const { getDoctorBookingDetails, getDoctorSlots, searchDoctors } = require("./doctorDirectoryService");
const { createCentralAppointment } = require("./appointmentServiceClient");

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
    externalAppointmentId: appointment.externalAppointmentId || "",
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

function getDoctorServiceBaseUrl() {
  return (process.env.DOCTOR_SERVICE_URL || "http://localhost:5002").replace(/\/+$/, "");
}

async function resolveCentralDoctorId(doctor) {
  if (!doctor?.email) {
    return doctor?.id || "";
  }

  try {
    const { data } = await axios.get(`${getDoctorServiceBaseUrl()}/api/doctors/${encodeURIComponent(doctor.email)}`);
    if (data?.data?._id) {
      return String(data.data._id);
    }
  } catch (_error) {
    // Fall back to patient-service doctor identifier when doctor-service lookup is unavailable.
  }

  return doctor?.id || "";
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

async function listMyAppointments(patientId, profileId) {
  const query = { patientId };
  if (profileId) {
    query.patientProfileId = profileId;
  }

  const appointments = await PatientAppointment.find(query).sort({
    appointmentDate: 1,
    createdAt: -1,
  });

  return appointments.map(buildAppointmentResponse);
}

async function createAppointmentBooking(patientId, payload, profileId, centralPatientId) {
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
  const selectedSlot = slots.find((slot) => slot.value === payload.timeSlot && !slot.disabled);
  const isSlotAvailable = Boolean(selectedSlot);
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

  const patientProfile = await getAccessibleProfile(patientId, profileId);
  if (!patientProfile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const patientUser = await User.findById(patientId).select("fullName");
  const patientName = String(patientProfile.fullName || patientUser?.fullName || "Patient").trim();

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

  try {
    const centralDoctorId = await resolveCentralDoctorId(doctor);
    const canonicalPatientId = String(centralPatientId || patientId || "").trim();

    const centralAppointment = await createCentralAppointment({
      patientId: canonicalPatientId,
      patientName,
      body: {
        patientId: canonicalPatientId,
        patientName,
        doctorId: centralDoctorId,
        doctorName: doctor.fullName,
        specialty: doctor.specialization,
        appointmentDate: payload.appointmentDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        mode: payload.mode,
        reason: payload.reason || "",
        consultationFee: Number(doctor.consultationFee || 0)
      }
    });

    if (centralAppointment?._id) {
      appointment.externalAppointmentId = String(centralAppointment._id);
      await appointment.save();
    }
  } catch (_error) {
    // Keep patient booking persisted even if central sync fails.
  }

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
