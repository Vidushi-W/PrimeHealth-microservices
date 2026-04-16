const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const doctorClient = require('./doctorClient');

class AppointmentService {
  // ─── Create Appointment ──────────────────────────────────
  async createAppointment(data) {
    const { patientId, doctorId, doctorName, specialty, appointmentDate, startTime, endTime, reason, consultationFee } = data;

    // 1. Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(appointmentDate);
    if (apptDate < today) {
      throw new ApiError(400, 'Cannot book an appointment in the past.');
    }

    // 2. Check if doctor is valid and available (Inter-service communication)
    const isDoctorAvailable = await doctorClient.checkDoctorAvailability(doctorId, appointmentDate, startTime);
    if (!isDoctorAvailable) {
      throw new ApiError(400, 'Doctor is not available at the selected date and time or does not exist.');
    }

    // 3. Check for double booking
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate,
      startTime,
      status: { $ne: 'CANCELLED' }
    });

    if (existingAppointment) {
      throw new ApiError(409, 'Timeslot is already booked.');
    }

    // 4. Assign Queue Number
    const sameDayAppointments = await Appointment.countDocuments({
      doctorId,
      appointmentDate,
      status: { $ne: 'CANCELLED' }
    });
    const queueNumber = sameDayAppointments + 1;

    // 5. Create appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      doctorName,
      specialty: specialty || '',
      appointmentDate,
      startTime,
      endTime: endTime || startTime,
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

    const [appointments, total] = await Promise.all([
      Appointment.find(filters).skip(skip).limit(limit).sort({ appointmentDate: -1, startTime: -1 }),
      Appointment.countDocuments(filters)
    ]);

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

    if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    appointment.status = status;
    await appointment.save();
    return appointment;
  }

  // ─── Update Payment Status (Internal - called by Payment Service) ─
  async updatePaymentStatus(id, paymentStatus, paymentId) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    appointment.paymentStatus = paymentStatus;

    if (paymentId) {
      appointment.paymentId = paymentId;
    }

    // Automatically confirm appointment if paid and currently pending
    if (paymentStatus === 'PAID' && appointment.status === 'PENDING') {
      appointment.status = 'CONFIRMED';
    }

    await appointment.save();
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
