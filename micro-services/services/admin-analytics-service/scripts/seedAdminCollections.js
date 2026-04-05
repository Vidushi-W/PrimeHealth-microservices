const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

const Admin = require('../src/models/Admin');
const Doctor = require('../src/models/Doctor');
const Patient = require('../src/models/Patient');
const Appointment = require('../src/models/Appointment');
const Transaction = require('../src/models/Transaction');
const AuditLog = require('../src/models/AuditLog');

// Load workspace root .env so the script can run from this service folder.
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const MONGO_URI = process.env.ADMIN_MONGO_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Missing ADMIN_MONGO_URI or MONGO_URI in environment.');
  process.exit(1);
}

async function ensureSeedData() {
  await mongoose.connect(MONGO_URI);

  const adminEmail = 'admin@primehealth.local';
  const adminPassword = 'Admin@12345';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await Admin.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        email: adminEmail,
        passwordHash,
        role: 'super_admin',
        status: 'active',
        permissions: ['*'],
        lastActiveAt: new Date(),
        deletedAt: null
      }
    },
    { upsert: true, new: true }
  );

  const created = {
    admin: false,
    doctor: false,
    patient: false,
    appointment: false,
    transaction: false,
    auditLog: false
  };

  created.admin = true;

  const doctorCount = await Doctor.countDocuments();
  if (doctorCount === 0) {
    await Doctor.create({
      name: 'Dr. Sample',
      specialty: 'General Medicine',
      status: 'pending',
      email: 'doctor.sample@primehealth.local'
    });
    created.doctor = true;
  }

  const patientCount = await Patient.countDocuments();
  if (patientCount === 0) {
    await Patient.create({
      name: 'Patient Sample',
      email: 'patient.sample@primehealth.local',
      status: 'active'
    });
    created.patient = true;
  }

  const appointmentCount = await Appointment.countDocuments();
  if (appointmentCount === 0) {
    await Appointment.create({
      appointmentDate: new Date(),
      status: 'pending'
    });
    created.appointment = true;
  }

  const transactionCount = await Transaction.countDocuments();
  if (transactionCount === 0) {
    await Transaction.create({
      amount: 2500,
      currency: 'LKR',
      patientName: 'Patient Sample',
      doctorName: 'Dr. Sample',
      status: 'completed'
    });
    created.transaction = true;
  }

  await AuditLog.create({
    actorAdminId: admin._id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: 'seed.admin.collections.verified',
    targetType: 'system',
    targetId: String(admin._id),
    targetEmail: admin.email,
    metadata: {
      created
    },
    ip: '127.0.0.1',
    userAgent: 'seed-script'
  });
  created.auditLog = true;

  const totals = {
    admins: await Admin.countDocuments(),
    doctors: await Doctor.countDocuments(),
    patients: await Patient.countDocuments(),
    appointments: await Appointment.countDocuments(),
    transactions: await Transaction.countDocuments(),
    auditLogs: await AuditLog.countDocuments()
  };

  console.log('Seed complete.');
  console.log('Login email:', adminEmail);
  console.log('Login password:', adminPassword);
  console.log('Collection totals:', JSON.stringify(totals, null, 2));

  await mongoose.disconnect();
}

ensureSeedData().catch(async (error) => {
  console.error('Seed failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect failure
  }
  process.exit(1);
});
