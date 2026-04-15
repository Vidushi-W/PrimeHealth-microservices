const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");

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
  getMyPatientProfile,
  updateMyPatientProfile,
};
