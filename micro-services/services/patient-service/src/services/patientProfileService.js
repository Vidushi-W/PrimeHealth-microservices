const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const { fetchPrescriptionsByPatient } = require("./prescriptionServiceClient");
const { listMyAppointments } = require("./appointmentBookingService");

function buildUserSummary(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildProfileResponse(user, profile) {
  return {
    user: buildUserSummary(user),
    profile: {
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      chronicConditions: profile.chronicConditions,
      address: profile.address,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      profilePhoto: profile.profilePhoto,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
  };
}

function normalizeArray(value) {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [value].filter(Boolean);
}

function formatDateLabel(value) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function buildHomeReminders(profile) {
  const reminders = [];

  if (!profile.emergencyContactName || !profile.emergencyContactPhone) {
    reminders.push({
      id: "emergency-contact",
      title: "Add an emergency contact",
      detail: "Keep a trusted contact ready for urgent care workflows.",
      status: "action-needed",
    });
  }

  if (!profile.bloodGroup) {
    reminders.push({
      id: "blood-group",
      title: "Complete your blood group",
      detail: "This helps emergency and clinical teams move faster.",
      status: "action-needed",
    });
  }

  if (!profile.dateOfBirth) {
    reminders.push({
      id: "dob",
      title: "Add your date of birth",
      detail: "Your health record stays more reliable when core identity fields are complete.",
      status: "action-needed",
    });
  }

  if (!reminders.length) {
    reminders.push({
      id: "all-set",
      title: "Your profile looks ready",
      detail: "No urgent profile reminders right now.",
      status: "good",
    });
  }

  return reminders.slice(0, 3);
}

function buildWelcomeCard(user, profile) {
  return {
    title: `Welcome back, ${user.fullName.split(" ")[0] || "Patient"}`,
    subtitle: "Your care updates, prescriptions, and next actions are all in one place.",
    stats: [
      {
        label: "Blood group",
        value: profile.bloodGroup || "Add to profile",
      },
      {
        label: "Emergency contact",
        value: profile.emergencyContactName || "Missing",
      },
      {
        label: "Account email",
        value: user.email,
      },
    ],
  };
}

function buildQuickActions(userId) {
  return {
    symptomChecker: {
      title: "Quick symptom checker",
      description: "Start a quick triage flow before booking a consultation.",
      ctaLabel: "Start symptom check",
      route: "/symptom-checker",
      userId,
    },
    profile: {
      title: "My profile",
      description: "Update medical details, contact info, and emergency contacts.",
      ctaLabel: "Open profile",
      route: "/patient/profile",
    },
  };
}

function buildUpcomingAppointments(appointments, profile) {
  if (!appointments.length) {
    return [
      {
        id: "appt-placeholder-1",
        title: "No upcoming appointments yet",
        clinician: "Book a consultation to see it here",
        dateLabel: "Schedule when ready",
        status: "open",
        location: profile.address || "PrimeHealth care network",
        mode: "",
        timeSlot: "",
      },
    ];
  }

  return appointments.slice(0, 3).map((appointment) => ({
    id: appointment.id,
    title: appointment.doctorName,
    clinician: appointment.specialization,
    dateLabel: appointment.dateLabel,
    status: appointment.status,
    location: appointment.hospitalOrClinic,
    mode: appointment.mode,
    timeSlot: appointment.timeSlot,
  }));
}

function buildUploadedReports() {
  return [
    {
      id: "report-placeholder-1",
      name: "No uploaded reports yet",
      type: "Medical reports",
      uploadedAtLabel: "Upload history will appear here",
      status: "empty",
    },
  ];
}

function buildPrescriptionSummary(prescriptions) {
  if (!prescriptions.length) {
    return [
      {
        id: "prescription-empty",
        diagnosis: "No prescriptions yet",
        doctorId: "Your latest prescriptions will appear here",
        createdAtLabel: "Nothing issued yet",
        medicineCount: 0,
        pdfUrl: "",
      },
    ];
  }

  return prescriptions.slice(0, 3).map((prescription) => ({
    id: prescription._id,
    diagnosis: prescription.diagnosis,
    doctorId: prescription.doctorId,
    createdAtLabel: formatDateLabel(prescription.createdAt),
    medicineCount: Array.isArray(prescription.medicines) ? prescription.medicines.length : 0,
    pdfUrl: prescription.pdfUrl || "",
  }));
}

async function getMyPatientProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  return {
    status: 200,
    body: buildProfileResponse(user, profile),
  };
}

async function getMyPatientHome(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  let prescriptions = [];
  let appointments = [];

  try {
    prescriptions = await fetchPrescriptionsByPatient(String(userId));
  } catch (_error) {
    prescriptions = [];
  }

  try {
    appointments = await listMyAppointments(userId);
  } catch (_error) {
    appointments = [];
  }

  return {
    status: 200,
    body: {
      message: "Patient home fetched successfully",
      user: buildUserSummary(user),
      profile: buildProfileResponse(user, profile).profile,
      welcomeCard: buildWelcomeCard(user, profile),
      upcomingAppointments: buildUpcomingAppointments(appointments, profile),
      recentPrescriptions: buildPrescriptionSummary(prescriptions),
      uploadedReports: buildUploadedReports(),
      reminders: buildHomeReminders(profile),
      quickActions: buildQuickActions(String(userId)),
    },
  };
}

async function updateMyPatientProfile(userId, payload) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const userUpdates = {};
  const profileUpdates = {};

  if (payload.fullName !== undefined) {
    userUpdates.fullName = payload.fullName.trim();
  }

  if (payload.phone !== undefined) {
    userUpdates.phone = payload.phone;
  }

  const profileFields = [
    "dateOfBirth",
    "gender",
    "bloodGroup",
    "address",
    "emergencyContactName",
    "emergencyContactPhone",
    "profilePhoto",
  ];

  for (const field of profileFields) {
    if (payload[field] !== undefined) {
      profileUpdates[field] = payload[field];
    }
  }

  const allergies = normalizeArray(payload.allergies);
  if (allergies !== undefined) {
    profileUpdates.allergies = allergies;
  }

  const chronicConditions = normalizeArray(payload.chronicConditions);
  if (chronicConditions !== undefined) {
    profileUpdates.chronicConditions = chronicConditions;
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(userId, userUpdates, {
      new: true,
      runValidators: true,
    });
  }

  if (Object.keys(profileUpdates).length > 0) {
    await PatientProfile.findOneAndUpdate({ userId }, profileUpdates, {
      new: true,
      runValidators: true,
    });
  }

  const updatedUser = await User.findById(userId);
  const updatedProfile = await PatientProfile.findOne({ userId });

  return {
    status: 200,
    body: {
      message: "Patient profile updated successfully",
      ...buildProfileResponse(updatedUser, updatedProfile),
    },
  };
}

module.exports = {
  getMyPatientHome,
  getMyPatientProfile,
  updateMyPatientProfile,
};
