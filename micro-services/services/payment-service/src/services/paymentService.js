const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const appointmentClient = require('./appointmentClient');
const { generateOrderId } = require('../utils/generateOrderId');
const crypto = require('crypto');

const PAYHERE_SANDBOX_CHECKOUT_URL = 'https://sandbox.payhere.lk/pay/checkout';
const PAYHERE_LIVE_CHECKOUT_URL = 'https://www.payhere.lk/pay/checkout';

function normalizedAmount(value) {
  return Number(value || 0).toFixed(2);
}

function md5(value) {
  return crypto.createHash('md5').update(String(value)).digest('hex');
}

function getPayHereSecretHash(secret) {
  return md5(secret || '').toUpperCase();
}

class PaymentService {
  // ─── Initiate Payment ────────────────────────────────────
  async initiatePayment(data) {
    const { appointmentId, patientId, doctorId, amount, method, customer = {}, returnUrl, cancelUrl, provider } = data;
    const requestedProvider = String(provider || process.env.PAYMENT_PROVIDER || 'SIMULATED').toUpperCase();
    const merchantId = String(process.env.PAYHERE_MERCHANT_ID || '').trim();
    const merchantSecret = String(process.env.PAYHERE_MERCHANT_SECRET || '').trim();
    if (requestedProvider === 'PAYHERE' && (!merchantId || !merchantSecret)) {
      throw new ApiError(503, 'PayHere sandbox is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.');
    }
    const canUsePayHere = requestedProvider === 'PAYHERE';

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
      gatewayProvider: canUsePayHere ? 'PAYHERE' : 'SIMULATED'
    });

    if (!canUsePayHere) {
      return payment;
    }

    const amountString = normalizedAmount(amount);
    const currency = 'LKR';
    const secretHash = getPayHereSecretHash(merchantSecret);
    const hash = md5(`${merchantId}${orderId}${amountString}${currency}${secretHash}`).toUpperCase();

    const frontendBase = String(process.env.PAYHERE_FRONTEND_BASE_URL || '').trim();
    const notifyUrl = String(process.env.PAYHERE_NOTIFY_URL || '').trim();
    const effectiveReturnUrl = returnUrl || (frontendBase ? `${frontendBase}/appointments` : 'http://localhost:3000/appointments');
    const effectiveCancelUrl = cancelUrl || effectiveReturnUrl;
    const effectiveNotifyUrl = notifyUrl || 'http://localhost:5004/api/payments/payhere/notify';

    const payload = {
      merchant_id: merchantId,
      return_url: effectiveReturnUrl,
      cancel_url: effectiveCancelUrl,
      notify_url: effectiveNotifyUrl,
      order_id: orderId,
      items: `PrimeHealth appointment ${appointmentId}`,
      currency,
      amount: amountString,
      first_name: String(customer.firstName || 'PrimeHealth').trim() || 'PrimeHealth',
      last_name: String(customer.lastName || 'Patient').trim() || 'Patient',
      email: String(customer.email || 'patient@primehealth.test').trim() || 'patient@primehealth.test',
      phone: String(customer.phone || '0771234567').trim() || '0771234567',
      address: String(customer.address || 'PrimeHealth').trim() || 'PrimeHealth',
      city: String(customer.city || 'Colombo').trim() || 'Colombo',
      country: String(customer.country || 'Sri Lanka').trim() || 'Sri Lanka',
      hash,
      custom_1: String(appointmentId),
      custom_2: String(patientId)
    };

    payment.checkoutData = payload;
    await payment.save();

    const gatewayUrl = process.env.PAYHERE_USE_SANDBOX === 'false'
      ? PAYHERE_LIVE_CHECKOUT_URL
      : PAYHERE_SANDBOX_CHECKOUT_URL;

    return {
      ...payment.toObject(),
      checkout: {
        gateway: 'PAYHERE',
        actionUrl: gatewayUrl,
        method: 'POST',
        fields: payload
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

    // Simulate gateway — 90% success rate
    const success = this._mockPaymentGateway(payment.method, payment.amount);

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

  async handlePayHereNotification(payload) {
    const merchantId = String(process.env.PAYHERE_MERCHANT_ID || '').trim();
    const merchantSecret = String(process.env.PAYHERE_MERCHANT_SECRET || '').trim();
    if (!merchantId || !merchantSecret) {
      throw new ApiError(503, 'PayHere configuration missing.');
    }

    const orderId = String(payload.order_id || '').trim();
    const statusCode = String(payload.status_code || '').trim();
    const md5sig = String(payload.md5sig || '').trim().toUpperCase();
    const payhereAmount = String(payload.payhere_amount || '').trim();
    const payhereCurrency = String(payload.payhere_currency || '').trim();
    const paymentId = String(payload.payment_id || '').trim();

    if (!orderId) {
      throw new ApiError(400, 'Missing order_id in PayHere notification');
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      throw new ApiError(404, 'Payment not found for PayHere notification');
    }

    const localSecretHash = getPayHereSecretHash(merchantSecret);
    const localSig = md5(`${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${localSecretHash}`).toUpperCase();

    if (!md5sig || localSig !== md5sig) {
      payment.status = 'FAILED';
      payment.failureReason = 'Invalid PayHere signature.';
      payment.gatewayResponse = payload;
      await payment.save();
      throw new ApiError(400, 'Invalid PayHere signature');
    }

    payment.gatewayResponse = payload;

    if (statusCode === '2') {
      if (payment.status !== 'SUCCESS') {
        payment.status = 'SUCCESS';
        payment.transactionId = paymentId || payment.transactionId;
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

    payment.status = 'FAILED';
    payment.failureReason = `PayHere status code ${statusCode}`;
    await payment.save();
    await appointmentClient.updateAppointmentPaymentStatus(payment.appointmentId, 'FAILED', String(payment._id));
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
  _mockPaymentGateway(method, amount) {
    if (amount <= 0) return false;
    return Math.random() > 0.1; // 90% success
  }
}

module.exports = new PaymentService();
