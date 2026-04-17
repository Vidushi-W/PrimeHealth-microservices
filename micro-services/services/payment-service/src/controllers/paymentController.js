const paymentService = require('../services/paymentService');

class PaymentController {
  // POST /api/payments/initiate
  async initiatePayment(req, res, next) {
    try {
      const payment = await paymentService.initiatePayment({
        appointmentId: req.body.appointmentId,
        patientId: req.user?.id || req.body.patientId,
        doctorId: req.body.doctorId,
        amount: req.body.amount,
        provider: req.body.provider,
        method: req.body.method || req.body.paymentMethod,
        customer: req.body.customer || {},
        returnUrl: req.body.returnUrl,
        cancelUrl: req.body.cancelUrl
      });

      res.status(201).json({
        success: true,
        message: payment?.checkout?.gateway === 'PAYHERE'
          ? 'Payment initiated successfully. Redirect to PayHere checkout.'
          : 'Payment initiated successfully. Proceed to confirm.',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/payments/payhere/notify
  async handlePayHereNotify(req, res, next) {
    try {
      await paymentService.handlePayHereNotification(req.body || {});
      return res.status(200).send('OK');
    } catch (error) {
      return next(error);
    }
  }

  // POST /api/payments/confirm
  async confirmPayment(req, res, next) {
    try {
      const { orderId } = req.body;
      const payment = await paymentService.confirmPayment(orderId);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/payments  &  GET /api/payments/my
  async getPayments(req, res, next) {
    try {
      const filters = {};
      if (req.query.appointmentId) filters.appointmentId = req.query.appointmentId;
      if (req.query.patientId) filters.patientId = req.query.patientId;
      if (req.query.doctorId) filters.doctorId = req.query.doctorId;
      if (req.query.status) filters.status = req.query.status;

      // Restrict access for PATIENT role
      if (req.user && req.user.role === 'PATIENT') {
        filters.patientId = req.user.id;
      } else if (req.user && req.user.role === 'DOCTOR') {
        filters.doctorId = req.user.id;
      }

      const payments = await paymentService.getPayments(filters);
      res.status(200).json({
        success: true,
        message: 'Payments retrieved successfully',
        data: payments
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/payments/doctor/:doctorId/summary
  async getDoctorEarningsSummary(req, res, next) {
    try {
      if (req.user?.role === 'DOCTOR' && String(req.user.id) !== String(req.params.doctorId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const summary = await paymentService.getDoctorEarningsSummary(req.params.doctorId);

      res.status(200).json({
        success: true,
        message: 'Doctor earnings summary retrieved successfully',
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/payments/:id
  async getPaymentById(req, res, next) {
    try {
      const payment = await paymentService.getPaymentById(req.params.id);

      // Authorization check
      if (req.user && req.user.role === 'PATIENT' && payment.patientId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (req.user && req.user.role === 'DOCTOR' && payment.doctorId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      res.status(200).json({
        success: true,
        message: 'Payment retrieved successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/payments/order/:orderId
  async getPaymentByOrderId(req, res, next) {
    try {
      const payment = await paymentService.getPaymentByOrderId(req.params.orderId);

      res.status(200).json({
        success: true,
        message: 'Payment retrieved successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/payments/:id/refund
  async processRefund(req, res, next) {
    try {
      const payment = await paymentService.processRefund(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/payments/:id/invoice
  async downloadInvoice(req, res, next) {
    try {
      const payment = await paymentService.getPaymentById(req.params.id);

      // Authorization check
      if (req.user && req.user.role === 'PATIENT' && payment.patientId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (req.user && req.user.role === 'DOCTOR' && payment.doctorId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      if (payment.status !== 'SUCCESS') {
        return res.status(400).json({ success: false, message: 'Invoice only available for successful payments' });
      }

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${payment.invoiceNumber || payment._id}.pdf`);

      // Stream PDF directly to response
      await paymentService.generateInvoice(req.params.id, res);
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      } else {
        console.error('Error generating PDF stream:', error);
      }
    }
  }
}

module.exports = new PaymentController();
