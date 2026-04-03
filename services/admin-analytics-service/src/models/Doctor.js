const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        specialty: { type: String, default: '' },
        status: { type: String, default: 'pending' },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
