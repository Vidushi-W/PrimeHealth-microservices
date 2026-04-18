const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Transaction = require('../models/Transaction');
const Appointment = require('../models/Appointment');

async function fetchSummary() {
  const [totalAdmins, totalDoctors, totalPatients] = await Promise.all([
    Admin.countDocuments(),
    Doctor.countDocuments(),
    Patient.countDocuments()
  ]);

  const revenueAggregation = await Transaction.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totalRevenue = revenueAggregation.length ? revenueAggregation[0].total : 0;

  return {
    totalUsers: totalAdmins + totalDoctors + totalPatients,
    totalDoctors,
    totalPatients,
    revenue: {
      total: totalRevenue,
      currency: 'LKR'
    }
  };
}

async function fetchAppointmentAnalytics() {
  const byDay = await Appointment.aggregate([
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1
      }
    }
  ]);

  const byStatusAggregation = await Appointment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const byStatus = byStatusAggregation.reduce((acc, item) => {
    if (item._id) {
      acc[item._id] = item.count;
    }
    return acc;
  }, {});

  return { byDay, byStatus };
}

module.exports = {
  fetchSummary,
  fetchAppointmentAnalytics
};
