const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");

function formatDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return null;
  }

  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

function normalizeArray(value) {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildProfileSummary(profile) {
  return {
    id: profile._id,
    userId: profile.userId,
    fullName: profile.fullName || "",
    relation: profile.relation || "self",
    dateOfBirth: formatDate(profile.dateOfBirth),
    age: calculateAge(profile.dateOfBirth),
    gender: profile.gender || "",
    bloodGroup: profile.bloodGroup || "",
    allergies: profile.allergies || [],
    chronicConditions: profile.chronicConditions || [],
    address: profile.address || "",
    emergencyContactName: profile.emergencyContactName || "",
    emergencyContactPhone: profile.emergencyContactPhone || "",
    emergencyNotes: profile.emergencyNotes || "",
    profilePhoto: profile.profilePhoto || "",
    isPrimary: Boolean(profile.isPrimary),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function listProfilesForUser(userId) {
  const profiles = await PatientProfile.find({ userId }).sort({ isPrimary: -1, createdAt: 1 });
  return profiles.map(buildProfileSummary);
}

async function getPrimaryProfile(userId) {
  const primaryProfile = await PatientProfile.findOne({ userId, isPrimary: true });
  if (primaryProfile) {
    return primaryProfile;
  }

  const legacyProfile = await PatientProfile.findOne({ userId }).sort({ createdAt: 1 });
  if (!legacyProfile) {
    return null;
  }

  const owner = await User.findById(userId).select("fullName");
  if (!legacyProfile.fullName && owner?.fullName) {
    legacyProfile.fullName = owner.fullName;
  }

  if (!legacyProfile.relation) {
    legacyProfile.relation = "self";
  }

  legacyProfile.isPrimary = true;
  await legacyProfile.save();
  return legacyProfile;
}

async function getAccessibleProfile(userId, profileId) {
  if (profileId) {
    const selected = await PatientProfile.findOne({ _id: profileId, userId });
    if (selected) {
      return selected;
    }
  }

  return getPrimaryProfile(userId);
}

async function getFamilyProfiles(userId) {
  const profiles = await listProfilesForUser(userId);
  return {
    status: 200,
    body: {
      success: true,
      profiles,
    },
  };
}

async function getFamilyProfileById(userId, profileId) {
  const profile = await PatientProfile.findOne({ _id: profileId, userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Profile not found" },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      profile: buildProfileSummary(profile),
    },
  };
}

async function createFamilyProfile(userId, payload) {
  const owner = await User.findById(userId);
  if (!owner) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  if (!String(payload.fullName || "").trim()) {
    return {
      status: 400,
      body: { message: "Full name is required" },
    };
  }

  if (!String(payload.relation || "").trim()) {
    return {
      status: 400,
      body: { message: "Relation is required" },
    };
  }

  const profile = await PatientProfile.create({
    userId,
    fullName: payload.fullName.trim(),
    relation: payload.relation,
    isPrimary: false,
    dateOfBirth: payload.dateOfBirth || null,
    gender: payload.gender || "",
    bloodGroup: payload.bloodGroup || "",
    allergies: normalizeArray(payload.allergies) || [],
    chronicConditions: normalizeArray(payload.chronicConditions) || [],
    address: payload.address || "",
    emergencyContactName: payload.emergencyContactName || "",
    emergencyContactPhone: payload.emergencyContactPhone || "",
    emergencyNotes: payload.emergencyNotes || "",
    profilePhoto: payload.profilePhoto || "",
  });

  return {
    status: 201,
    body: {
      success: true,
      message: "Family profile created successfully",
      profile: buildProfileSummary(profile),
    },
  };
}

async function updateFamilyProfile(userId, profileId, payload) {
  const profile = await PatientProfile.findOne({ _id: profileId, userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Profile not found" },
    };
  }

  const updatableFields = [
    "fullName",
    "relation",
    "dateOfBirth",
    "gender",
    "bloodGroup",
    "address",
    "emergencyContactName",
    "emergencyContactPhone",
    "emergencyNotes",
    "profilePhoto",
  ];

  for (const field of updatableFields) {
    if (payload[field] !== undefined) {
      profile[field] = payload[field];
    }
  }

  const allergies = normalizeArray(payload.allergies);
  if (allergies !== undefined) {
    profile.allergies = allergies;
  }

  const chronicConditions = normalizeArray(payload.chronicConditions);
  if (chronicConditions !== undefined) {
    profile.chronicConditions = chronicConditions;
  }

  await profile.save();

  return {
    status: 200,
    body: {
      success: true,
      message: "Family profile updated successfully",
      profile: buildProfileSummary(profile),
    },
  };
}

async function deleteFamilyProfile(userId, profileId) {
  const profile = await PatientProfile.findOne({ _id: profileId, userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Profile not found" },
    };
  }

  if (profile.isPrimary) {
    return {
      status: 400,
      body: { message: "Primary profile cannot be deleted" },
    };
  }

  await profile.deleteOne();

  return {
    status: 200,
    body: {
      success: true,
      message: "Family profile deleted successfully",
    },
  };
}

module.exports = {
  buildProfileSummary,
  createFamilyProfile,
  deleteFamilyProfile,
  getAccessibleProfile,
  getFamilyProfileById,
  getFamilyProfiles,
  getPrimaryProfile,
  listProfilesForUser,
  updateFamilyProfile,
};
