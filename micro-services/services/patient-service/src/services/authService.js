const bcrypt = require("bcrypt");

const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const DoctorProfile = require("../models/DoctorProfile");
const { generateToken } = require("../utils/token");

const SUPPORTED_ROLES = ["patient", "doctor", "admin"];
const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [value].filter(Boolean);
}

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

function validateRegisterInput(payload) {
  const requiredFields = ["fullName", "email", "password", "role"];
  const missingFields = requiredFields.filter((field) => !payload[field]?.toString().trim());

  if (missingFields.length) {
    return `Missing required fields: ${missingFields.join(", ")}`;
  }

  if (!SUPPORTED_ROLES.includes(payload.role)) {
    return "Role must be one of: patient, doctor, admin";
  }

  if (payload.password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  return null;
}

async function createRoleProfile(user, payload) {
  if (user.role === "patient") {
    await PatientProfile.create({
      userId: user._id,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      bloodGroup: payload.bloodGroup,
      allergies: normalizeArray(payload.allergies),
      chronicConditions: normalizeArray(payload.chronicConditions),
      address: payload.address,
      emergencyContactName: payload.emergencyContactName,
      emergencyContactPhone: payload.emergencyContactPhone,
      profilePhoto: payload.profilePhoto,
    });
  }

  if (user.role === "doctor") {
    await DoctorProfile.create({
      userId: user._id,
      specialization: payload.specialization,
      licenseNumber: payload.licenseNumber,
      hospitalOrClinic: payload.hospitalOrClinic,
      yearsOfExperience: payload.yearsOfExperience,
      consultationFee: payload.consultationFee,
      bio: payload.bio,
    });
  }
}

async function registerUser(payload) {
  const validationError = validateRegisterInput(payload);
  if (validationError) {
    return {
      status: 400,
      body: { message: validationError },
    };
  }

  const email = normalizeEmail(payload.email);
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return {
      status: 409,
      body: { message: "User already exists with this email" },
    };
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  let user;

  try {
    user = await User.create({
      fullName: payload.fullName.trim(),
      email,
      passwordHash,
      role: payload.role,
      phone: payload.phone || "",
    });

    await createRoleProfile(user, payload);
  } catch (error) {
    if (user?._id) {
      await User.findByIdAndDelete(user._id);
    }

    throw error;
  }

  const token = generateToken(user);

  return {
    status: 201,
    body: {
      message: "User registered successfully",
      token,
      user: buildUserSummary(user),
    },
  };
}

async function loginUser(payload) {
  if (!payload.email?.trim() || !payload.password) {
    return {
      status: 400,
      body: { message: "Email and password are required" },
    };
  }

  const email = normalizeEmail(payload.email);
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    return {
      status: 401,
      body: { message: "Invalid email or password" },
    };
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    return {
      status: 401,
      body: { message: "Invalid email or password" },
    };
  }

  const token = generateToken(user);

  return {
    status: 200,
    body: {
      message: "Login successful",
      token,
      user: buildUserSummary(user),
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
};
