const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    patientId: {
      type: String,
      required: true
    },
    doctorId: {
      type: String
    },
    orderId: {
      type: String,
      unique: true,
      required: true
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'LKR'
    },
    method: {
      type: String,
      enum: ['CREDIT_CARD', 'CASH', 'INSURANCE'],
      default: 'CREDIT_CARD'
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    },
    paidAt: {
      type: Date
    },
    failureReason: {
      type: String
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    },
    invoiceNumber: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
