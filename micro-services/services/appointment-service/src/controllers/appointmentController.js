const appointmentService = require('../services/appointmentService');

class AppointmentController {
  // POST /api/appointments
  async createAppointment(req, res, next) {
    try {
      const appointment = await appointmentService.createAppointment({
        patientId: req.user ? req.user.id : req.body.patientId,
        doctorId: req.body.doctorId,
        doctorName: req.body.doctorName,
        specialty: req.body.specialty,
        appointmentDate: req.body.appointmentDate,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        reason: req.body.reason,
        consultationFee: req.body.consultationFee
      });

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/appointments  (Admin/Doctor)
  async getAllAppointments(req, res, next) {
    try {
      const filters = {};

      if (req.query.doctorId) filters.doctorId = req.query.doctorId;
      if (req.query.patientId) filters.patientId = req.query.patientId;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.paymentStatus) filters.paymentStatus = req.query.paymentStatus;
      if (req.query.date) filters.appointmentDate = req.query.date;

      // Respect user roles implicitly
      if (req.user && req.user.role === 'DOCTOR') {
        filters.doctorId = req.user.id;
      } else if (req.user && req.user.role === 'PATIENT') {
        filters.patientId = req.user.id;
      }

      const pagination = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10
      };

      const result = await appointmentService.getAllAppointments(filters, pagination);

      res.status(200).json({
        success: true,
        message: 'Appointments retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/appointments/my  (Patient only)
  async getMyAppointments(req, res, next) {
    try {
      const patientId = req.user ? req.user.id : req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ success: false, message: 'Patient ID required' });
      }

      const pagination = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20
      };

      const result = await appointmentService.getMyAppointments(patientId, pagination);

      res.status(200).json({
        success: true,
        message: 'My appointments retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/appointments/:id
  async getAppointmentById(req, res, next) {
    try {
      const appointment = await appointmentService.getAppointmentById(req.params.id);

      // Authorization check
      if (req.user && req.user.role === 'PATIENT' && appointment.patientId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (req.user && req.user.role === 'DOCTOR' && appointment.doctorId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      res.status(200).json({
        success: true,
        message: 'Appointment retrieved successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/appointments/:id/cancel
  async cancelAppointment(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const appointment = await appointmentService.cancelAppointment(req.params.id, userId);

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/appointments/:id/status
  async updateAppointmentStatus(req, res, next) {
    try {
      const { status } = req.body;
      const appointment = await appointmentService.updateAppointmentStatus(req.params.id, status);

      res.status(200).json({
        success: true,
        message: 'Appointment status updated successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/appointments/:id/payment-status  (Internal)
  async updatePaymentStatus(req, res, next) {
    try {
      const { paymentStatus, paymentId } = req.body;
      const appointment = await appointmentService.updatePaymentStatus(req.params.id, paymentStatus, paymentId);

      res.status(200).json({
        success: true,
        message: 'Appointment payment status updated successfully',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/appointments/:id/queue
  async getQueuePosition(req, res, next) {
    try {
      const positionInfo = await appointmentService.getQueuePosition(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Queue position retrieved successfully',
        data: positionInfo
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/appointments/doctor/:doctorId/slots
  async getAvailableSlots(req, res, next) {
    try {
      const { doctorId } = req.params;
      const date = req.query.date;
      if (!date) {
        return res.status(400).json({ success: false, message: 'Date query param required (?date=YYYY-MM-DD)' });
      }

      const slots = await appointmentService.getAvailableSlots(doctorId, date);

      res.status(200).json({
        success: true,
        message: 'Available slots retrieved',
        data: slots
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/appointments/:id
  async deleteAppointment(req, res, next) {
    try {
      await appointmentService.deleteAppointment(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Appointment deleted successfully',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentController();
