const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const appointmentClient = require('./appointmentClient');
const { generateOrderId } = require('../utils/generateOrderId');
const { getStripeClient, resolveFrontendBase } = require('../config/stripe');
const logger = require('../config/logger');
const crypto = require('crypto');

class PaymentService {
  // ─── Initiate Payment ────────────────────────────────────
  async initiatePayment(data) {
    const { appointmentId, patientId, doctorId, amount, method, customer = {}, returnUrl, cancelUrl, provider } = data;
    const requestedProvider = String(provider || process.env.PAYMENT_PROVIDER || 'SIMULATED').toUpperCase();
    const stripe = getStripeClient();
    if (requestedProvider === 'STRIPE' && !stripe) {
      throw new ApiError(
        503,
        'Stripe is not configured. Set STRIPE_SECRET_KEY in payment-service environment variables.'
      );
    }
    const canUseStripe = requestedProvider === 'STRIPE';

    // Block duplicate paid payments
    const existingPaid = await Payment.findOne({ appointmentId, status: 'SUCCESS' });
    if (existingPaid) {
      throw new ApiError(409, 'Payment already completed for this appointment.');
    }

    const orderId = generateOrderId();

    const payment = await Payment.create({
      appointmentId,
      patientId,
      doctorId,
      orderId,
      amount,
      currency: 'LKR',
      method: method || 'CREDIT_CARD',
      status: 'PENDING',
      gatewayProvider: canUseStripe ? 'STRIPE' : 'SIMULATED'
    });

    if (!canUseStripe) {
      return payment;
    }

    const appBase = resolveFrontendBase();
    const successUrlBase = returnUrl || `${appBase}/appointments`;
    const cancelUrlBase = cancelUrl || successUrlBase;
    const successUrl = `${successUrlBase}${successUrlBase.includes('?') ? '&' : '?'}order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = `${cancelUrlBase}${cancelUrlBase.includes('?') ? '&' : '?'}order_id=${encodeURIComponent(orderId)}`;

    const amountInCents = Math.round(Number(amount || 0) * 100);
    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      throw new ApiError(400, 'Amount must be greater than zero.');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: finalCancelUrl,
      customer_email: String(customer.email || '').trim() || undefined,
      client_reference_id: orderId,
      metadata: {
        orderId: String(orderId),
        paymentId: String(payment._id),
        appointmentId: String(appointmentId),
        patientId: String(patientId || ''),
        doctorId: String(doctorId || '')
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'lkr',
            unit_amount: amountInCents,
            product_data: {
              name: `PrimeHealth appointment ${appointmentId}`
            }
          }
        }
      ]
    });

    payment.checkoutData = {
      sessionId: session.id,
      checkoutUrl: session.url
    };
    await payment.save();

    logger.info('Stripe checkout session created', {
      orderId,
      sessionId: session.id
    });

    return {
      ...payment.toObject(),
      checkout: {
        gateway: 'STRIPE',
        sessionId: session.id,
        url: session.url
      }
    };
  }

  // ─── Confirm Payment (Simulated Gateway) ─────────────────
  async confirmPayment(orderId) {
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new ApiError(404, 'Payment not found for this order.');
    }

    if (payment.status === 'SUCCESS') {
      throw new ApiError(409, 'Payment already confirmed.');
    }

    const success = this._mockPaymentGateway(payment.method, payment.amount, payment);

    if (success) {
      const transactionId = crypto.randomBytes(16).toString('hex');
      payment.status = 'SUCCESS';
      payment.transactionId = transactionId;
      payment.paidAt = new Date();
      payment.invoiceNumber = `INV-${Date.now()}`;
      await payment.save();

      // Inter-service call: update appointment to PAID + CONFIRMED
      const updated = await appointmentClient.updateAppointmentPaymentStatus(
        payment.appointmentId, 'PAID', String(payment._id)
      );
      if (!updated) {
        console.error(`Warning: Failed to update appointment status for ${payment.appointmentId}`);
      }
    } else {
      payment.status = 'FAILED';
      payment.failureReason = 'Simulated gateway declined the transaction.';
      await payment.save();
      await appointmentClient.updateAppointmentPaymentStatus(payment.appointmentId, 'FAILED', String(payment._id));

      throw new ApiError(400, 'Payment failed. Please try another method.');
    }

    return payment;
  }

  // ─── Get Payments (List) ─────────────────────────────────
  async getPayments(filters = {}) {
    return Payment.find(filters).sort({ createdAt: -1 });
  }

  // ─── Get Payment By ID ───────────────────────────────────
  async getPaymentById(id) {
    const payment = await Payment.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }
    return payment;
  }

  // ─── Get Payment By OrderId ──────────────────────────────
  async getPaymentByOrderId(orderId) {
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new ApiError(404, 'Payment not found for this order.');
    }
    return payment;
  }

  async confirmStripeSession(sessionId) {
    const stripe = getStripeClient();
    if (!stripe) {
      throw new ApiError(503, 'Stripe is not configured.');
    }
    if (!sessionId) {
      throw new ApiError(400, 'Stripe sessionId is required.');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = String(session?.client_reference_id || session?.metadata?.orderId || '').trim();
    if (!orderId) {
      throw new ApiError(400, 'Stripe checkout session does not include an order reference.');
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new ApiError(404, 'Payment not found for this Stripe session.');
    }

    payment.gatewayResponse = session;
    if (session.payment_status === 'paid') {
      if (payment.status !== 'SUCCESS') {
        payment.status = 'SUCCESS';
        payment.transactionId = String(session.payment_intent || payment.transactionId || '');
        payment.paidAt = new Date();
        payment.invoiceNumber = payment.invoiceNumber || `INV-${Date.now()}`;
        await payment.save();

        const updated = await appointmentClient.updateAppointmentPaymentStatus(payment.appointmentId, 'PAID', String(payment._id));
        if (!updated) {
          console.error(`Warning: Failed to update appointment status for ${payment.appointmentId}`);
        }
      }
      return payment;
    }

    if (payment.status !== 'FAILED') {
      payment.status = 'FAILED';
      payment.failureReason = `Stripe checkout payment_status=${session.payment_status || 'unknown'}`;
      await payment.save();
      await appointmentClient.updateAppointmentPaymentStatus(payment.appointmentId, 'FAILED', String(payment._id));
    }
    return payment;
  }

  async getDoctorEarningsSummary(doctorId) {
    const successfulPayments = await Payment.find({
      doctorId,
      status: 'SUCCESS'
    }).sort({ paidAt: -1 });

    let totalEarnings = 0;
    let currentMonthEarnings = 0;
    const monthlyMap = new Map();
    const now = new Date();
    const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    for (const payment of successfulPayments) {
      const amount = Number(payment.amount || 0);
      totalEarnings += amount;

      const paidAt = payment.paidAt || payment.createdAt || now;
      const paidDate = new Date(paidAt);
      const monthKey = `${paidDate.getUTCFullYear()}-${String(paidDate.getUTCMonth() + 1).padStart(2, '0')}`;

      if (monthKey === currentMonthKey) {
        currentMonthEarnings += amount;
      }

      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amount);
    }

    const monthlyHistory = [...monthlyMap.entries()]
      .sort((left, right) => (left[0] < right[0] ? 1 : -1))
      .map(([month, amount]) => ({ month, amount }));

    return {
      doctorId,
      totalEarnings: Number(totalEarnings.toFixed(2)),
      currentMonthEarnings: Number(currentMonthEarnings.toFixed(2)),
      completedPaidConsultations: successfulPayments.length,
      monthlyHistory
    };
  }

  // ─── Refund ──────────────────────────────────────────────
  async processRefund(id) {
    const payment = await Payment.findById(id);
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    if (payment.status !== 'SUCCESS') {
      throw new ApiError(400, 'Can only refund successful transactions');
    }

    payment.status = 'REFUNDED';
    await payment.save();

    await appointmentClient.updateAppointmentPaymentStatus(payment.appointmentId, 'REFUNDED', String(payment._id));

    return payment;
  }

  // ─── Invoice PDF ─────────────────────────────────────────
  async generateInvoice(id, responseStream) {
    const payment = await this.getPaymentById(id);
    if (payment.status !== 'SUCCESS') {
      throw new ApiError(400, 'Invoice is only available for successful payments.');
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(responseStream);

    // Header
    doc.fontSize(22).text('PrimeHealth', { align: 'center' });
    doc.fontSize(14).text('Appointment Invoice', { align: 'center' });
    doc.moveDown(1.5);

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Invoice details
    doc.fontSize(11);
    doc.text(`Invoice Number: ${payment.invoiceNumber || 'N/A'}`);
    doc.text(`Order ID: ${payment.orderId}`);
    doc.text(`Transaction ID: ${payment.transactionId}`);
    doc.text(`Payment Date: ${new Date(payment.paidAt).toLocaleString()}`);
    doc.text(`Payment Method: ${payment.method}`);
    doc.moveDown();

    // Patient / Appointment
    doc.text(`Appointment ID: ${payment.appointmentId}`);
    doc.text(`Patient ID: ${payment.patientId}`);
    if (payment.doctorId) doc.text(`Doctor ID: ${payment.doctorId}`);
    doc.moveDown();

    // Amount
    doc.fontSize(13).text(`Total Amount: ${payment.currency} ${payment.amount}`, { underline: true });
    doc.moveDown();

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Footer
    doc.fontSize(10).text('Thank you for choosing PrimeHealth.', { align: 'center' });
    doc.text('This is a computer-generated invoice.', { align: 'center' });

    doc.end();
  }

  // ─── Mock Gateway ────────────────────────────────────────
  _mockPaymentGateway(method, amount, payment = null) {
    if (amount <= 0) return false;
    const force = String(process.env.PAYMENT_SIMULATE_ALWAYS_SUCCESS || '').toLowerCase();
    if (force === 'true' || force === '1') {
      return true;
    }
    const isSimulated = String(payment?.gatewayProvider || '').toUpperCase() === 'SIMULATED';
    if (isSimulated) {
      const randomFail = String(process.env.PAYMENT_SIMULATE_RANDOM_FAILURE || '').toLowerCase();
      if (randomFail === 'true' || randomFail === '1') {
        return Math.random() > 0.1;
      }
      return true;
    }
    return Math.random() > 0.1;
  }
}

module.exports = new PaymentService();
