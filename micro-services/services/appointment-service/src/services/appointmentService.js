const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const doctorClient = require('./doctorClient');
const { fetchDoctorById } = require('./doctorServiceClient');
const { fetchPatientSummary } = require('./patientServiceClient');
const { syncPatientAppointmentStatus } = require('./patientAppointmentClient');

const APPOINTMENT_STATUS = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
const PAYMENT_STATUS = ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];

function toPlainAppointment(appointment) {
  if (!appointment) return null;
  return typeof appointment.toObject === 'function' ? appointment.toObject() : appointment;
}

class AppointmentService {
  _normalizeStatus(status) {
    return String(status || '').trim().toUpperCase();
  }

  _assertValidStatus(status) {
    const normalized = this._normalizeStatus(status);
    if (!APPOINTMENT_STATUS.includes(normalized)) {
      throw new ApiError(400, 'Invalid status');
    }
    return normalized;
  }

  _assertValidPaymentStatus(paymentStatus) {
    const normalized = this._normalizeStatus(paymentStatus);
    if (!PAYMENT_STATUS.includes(normalized)) {
      throw new ApiError(400, 'Invalid payment status');
    }
    return normalized;
  }

  _assertStatusTransition(currentStatus, nextStatus) {
    const flow = {
      PENDING: new Set(['CONFIRMED', 'CANCELLED']),
      CONFIRMED: new Set(['COMPLETED', 'CANCELLED']),
      COMPLETED: new Set([]),
      CANCELLED: new Set([])
    };

    if (currentStatus === nextStatus) return;

    if (!flow[currentStatus] || !flow[currentStatus].has(nextStatus)) {
      throw new ApiError(400, `Invalid appointment transition: ${currentStatus} -> ${nextStatus}`);
    }
  }

  async _syncPatientAppointment(appointment, overrides = {}) {
    if (!appointment?._id) return;
    await syncPatientAppointmentStatus(String(appointment._id), {
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      ...overrides
    });
  }

  async attachPatientNames(appointments) {
    const list = (Array.isArray(appointments) ? appointments : []).map((item) => toPlainAppointment(item)).filter(Boolean);
    const patientIds = [...new Set(list.map((item) => String(item.patientId || '').trim()).filter(Boolean))];

    if (!patientIds.length) {
      return list;
    }

    const resolved = await Promise.all(
      patientIds.map(async (patientId) => {
        const summary = await fetchPatientSummary(patientId);
        const patientName = String(summary?.patient?.name || '').trim();
        return [patientId, patientName];
      })
    );

    const patientNameMap = new Map(resolved.filter(([, name]) => Boolean(name)));

    return list.map((appointment) => {
      const patientId = String(appointment.patientId || '').trim();
      return {
        ...appointment,
        patientName: patientNameMap.get(patientId) || appointment.patientName || ''
      };
    });
  }

  // ─── Create Appointment ──────────────────────────────────
  async createAppointment(data) {
    const { patientId, patientName, doctorId, doctorName, specialty, appointmentDate, startTime, endTime, mode, reason, consultationFee } = data;
    const appointmentMode = String(mode || 'online').toLowerCase() === 'physical' ? 'physical' : 'online';

    let canonicalDoctorId = String(doctorId || '').trim();
    try {
      const doctor = await fetchDoctorById(canonicalDoctorId);
      canonicalDoctorId = String(doctor?.externalRef || doctor?.uniqueId || doctor?._id || canonicalDoctorId);
    } catch (_error) {
      // If lookup fails, continue with provided ID for backward compatibility.
    }

    // 1. Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(appointmentDate);
    if (apptDate < today) {
      throw new ApiError(400, 'Cannot book an appointment in the past.');
    }

    // 2. Check if doctor is valid and available (Inter-service communication)
    const isDoctorAvailable = await doctorClient.checkDoctorAvailability(canonicalDoctorId, appointmentDate, startTime);
    if (!isDoctorAvailable) {
      throw new ApiError(400, 'Doctor is not available at the selected date and time or does not exist.');
    }

    // 3. Check for double booking
    const existingAppointment = await Appointment.findOne({
      doctorId: canonicalDoctorId,
      appointmentDate,
      startTime,
      status: { $ne: 'CANCELLED' }
    });

    if (existingAppointment) {
      throw new ApiError(409, 'Timeslot is already booked.');
    }

    // 4. Assign Queue Number
    const sameDayAppointments = await Appointment.countDocuments({
      doctorId: canonicalDoctorId,
      appointmentDate,
      status: { $ne: 'CANCELLED' }
    });
    const queueNumber = sameDayAppointments + 1;

    // 5. Create appointment
    const appointment = await Appointment.create({
      patientId,
      patientName: String(patientName || '').trim(),
      doctorId: canonicalDoctorId,
      doctorName,
      specialty: specialty || '',
      appointmentDate,
      startTime,
      endTime: endTime || startTime,
      mode: appointmentMode,
      reason,
      consultationFee: consultationFee || 0,
      queueNumber,
      status: 'PENDING',
      paymentStatus: 'UNPAID'
    });

    return appointment;
  }

  // ─── Get All Appointments (Admin/Doctor filtered) ────────
  async getAllAppointments(filters = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [rawAppointments, total] = await Promise.all([
      Appointment.find(filters).skip(skip).limit(limit).sort({ appointmentDate: -1, startTime: -1 }),
      Appointment.countDocuments(filters)
    ]);
    const appointments = await this.attachPatientNames(rawAppointments);

    return {
      appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ─── Get My Appointments (Patient) ───────────────────────
  async getMyAppointments(patientId, pagination = { page: 1, limit: 20 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const filters = { patientId };
    const [appointments, total] = await Promise.all([
      Appointment.find(filters).skip(skip).limit(limit).sort({ appointmentDate: -1 }),
      Appointment.countDocuments(filters)
    ]);

    return {
      appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ─── Get Appointment By ID ───────────────────────────────
  async getAppointmentById(id) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }
    return appointment;
  }

  // ─── Cancel Appointment ──────────────────────────────────
  async cancelAppointment(id, userId) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    if (appointment.status === 'COMPLETED') {
      throw new ApiError(400, 'Cannot cancel a completed appointment.');
    }

    if (appointment.status === 'CANCELLED') {
      throw new ApiError(400, 'Appointment is already cancelled.');
    }

    appointment.status = 'CANCELLED';
    await appointment.save();
    return appointment;
  }

  // ─── Update Status (Doctor/Admin) ────────────────────────
  async updateAppointmentStatus(id, status) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    const currentStatus = this._normalizeStatus(appointment.status);
    const nextStatus = this._assertValidStatus(status);
    this._assertStatusTransition(currentStatus, nextStatus);

    if (nextStatus === 'COMPLETED' && this._normalizeStatus(appointment.paymentStatus) === 'UNPAID') {
      throw new ApiError(400, 'Cannot complete an appointment with unpaid status');
    }

    appointment.status = nextStatus;
    await appointment.save();
    await this._syncPatientAppointment(appointment);
    return appointment;
  }

  // ─── Update Payment Status (Internal - called by Payment Service) ─
  async updatePaymentStatus(id, paymentStatus, paymentId) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    const normalizedPaymentStatus = this._assertValidPaymentStatus(paymentStatus);
    const currentPaymentStatus = this._normalizeStatus(appointment.paymentStatus);
    if (currentPaymentStatus === 'REFUNDED' && normalizedPaymentStatus !== 'REFUNDED') {
      throw new ApiError(400, 'Cannot change payment status after refund');
    }

    appointment.paymentStatus = normalizedPaymentStatus;

    if (paymentId) {
      appointment.paymentId = paymentId;
    }

    // Automatically confirm appointment if paid and currently pending
    if (normalizedPaymentStatus === 'PAID' && this._normalizeStatus(appointment.status) === 'PENDING') {
      appointment.status = 'CONFIRMED';
    }

    if (normalizedPaymentStatus === 'FAILED' && this._normalizeStatus(appointment.status) === 'CONFIRMED') {
      appointment.status = 'PENDING';
    }

    await appointment.save();
    await this._syncPatientAppointment(appointment, {
      paymentId: appointment.paymentId || null
    });
    return appointment;
  }

  // ─── Get Queue Position ──────────────────────────────────
  async getQueuePosition(id) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    const positionsAhead = await Appointment.countDocuments({
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate,
      queueNumber: { $lt: appointment.queueNumber },
      status: { $in: ['PENDING', 'CONFIRMED'] }
    });

    return {
      appointmentId: id,
      myQueueNumber: appointment.queueNumber,
      peopleAheadOfMe: positionsAhead,
      estimatedWaitMinutes: positionsAhead * 15
    };
  }

  // ─── Get Available Slots for Doctor ──────────────────────
  async getAvailableSlots(doctorId, date) {
    // All possible 30-min slots from 08:00 to 17:00
    const allSlots = [];
    for (let h = 8; h < 17; h++) {
      allSlots.push(`${String(h).padStart(2, '0')}:00`);
      allSlots.push(`${String(h).padStart(2, '0')}:30`);
    }

    // Find taken slots
    const takenAppointments = await Appointment.find({
      doctorId,
      appointmentDate: date,
      status: { $ne: 'CANCELLED' }
    }).select('startTime');

    const takenSlots = takenAppointments.map(a => a.startTime);
    const freeSlots = allSlots.filter(slot => !takenSlots.includes(slot));

    return { doctorId, date, takenSlots, freeSlots };
  }

  // ─── Delete Appointment (Admin) ──────────────────────────
  async deleteAppointment(id) {
    const appointment = await Appointment.findByIdAndDelete(id);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }
    return true;
  }
}

module.exports = new AppointmentService();
