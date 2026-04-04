const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'LKR' },
        patientName: { type: String, default: '' },
        doctorName: { type: String, default: '' },
        transactionDate: { type: Date, default: Date.now },
        status: { type: String, default: 'completed' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
