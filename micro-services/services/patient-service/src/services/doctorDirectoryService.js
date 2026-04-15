const User = require("../models/User");
const DoctorProfile = require("../models/DoctorProfile");

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function formatTimeLabel(value) {
  if (!value) {
    return "";
  }

  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatSlotLabel(startTime, endTime) {
  return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
}

function normalizeAvailabilityItems(items = []) {
  return items
    .filter((item) => item?.date && item?.startTime && item?.endTime)
    .map((item) => ({
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      mode: item.mode || "physical",
      label: formatSlotLabel(item.startTime, item.endTime),
    }))
    .sort((left, right) => {
      const leftKey = `${left.date} ${left.startTime}`;
      const rightKey = `${right.date} ${right.startTime}`;
      return leftKey.localeCompare(rightKey);
    });
}

function buildDoctorDirectoryRecord(user, profile) {
  const availability = normalizeAvailabilityItems(profile.availability || []);
  const supportedModes = [...new Set(availability.map((item) => item.mode))];

  return {
    id: String(user._id),
    fullName: user.fullName,
    specialization: profile.specialization || "General Medicine",
    hospitalOrClinic: profile.hospitalOrClinic || "PrimeHealth Care Network",
    consultationFee: profile.consultationFee || 0,
    profileImage: "",
    rating: null,
    supportedModes: supportedModes.length ? supportedModes : ["online", "physical"],
    availability,
    yearsOfExperience: profile.yearsOfExperience || 0,
    licenseNumber: profile.licenseNumber || "",
  };
}

async function getRegisteredDoctors() {
  const profiles = await DoctorProfile.find({}).lean();
  if (!profiles.length) {
    return [];
  }

  const userIds = profiles.map((profile) => profile.userId);
  const users = await User.find({
    _id: { $in: userIds },
    role: "doctor",
    isActive: true,
  }).lean();

  const usersById = new Map(users.map((user) => [String(user._id), user]));

  return profiles
    .map((profile) => {
      const user = usersById.get(String(profile.userId));
      if (!user) {
        return null;
      }

      return buildDoctorDirectoryRecord(user, profile);
    })
    .filter(Boolean);
}

async function getDoctorById(doctorId) {
  const user = await User.findOne({
    _id: doctorId,
    role: "doctor",
    isActive: true,
  }).lean();

  if (!user) {
    return null;
  }

  const profile = await DoctorProfile.findOne({ userId: user._id }).lean();
  if (!profile) {
    return null;
  }

  return buildDoctorDirectoryRecord(user, profile);
}

function buildDoctorCard(doctor) {
  const today = new Date().toISOString().slice(0, 10);
  const nextAvailability = doctor.availability.find((item) => item.date >= today);

  return {
    id: doctor.id,
    fullName: doctor.fullName,
    specialization: doctor.specialization,
    hospitalOrClinic: doctor.hospitalOrClinic,
    consultationFee: doctor.consultationFee,
    profileImage: doctor.profileImage,
    rating: doctor.rating,
    supportedModes: doctor.supportedModes,
    nextAvailableSlot: nextAvailability
      ? `${nextAvailability.date} ${nextAvailability.label}`
      : "Slots will be updated soon",
  };
}

async function searchDoctors(filters = {}) {
  const registeredDoctors = await getRegisteredDoctors();
  const search = normalizeValue(filters.search);
  const specialization = normalizeValue(filters.specialization);
  const hospitalOrClinic = normalizeValue(filters.hospitalOrClinic);
  const mode = normalizeValue(filters.mode);

  const doctors = registeredDoctors.filter((doctor) => {
    if (search) {
      const haystack = `${doctor.fullName} ${doctor.specialization} ${doctor.hospitalOrClinic}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (specialization && normalizeValue(doctor.specialization) !== specialization) {
      return false;
    }

    if (hospitalOrClinic && !normalizeValue(doctor.hospitalOrClinic).includes(hospitalOrClinic)) {
      return false;
    }

    if (mode && !doctor.supportedModes.includes(mode)) {
      return false;
    }

    return true;
  });

  return doctors.map(buildDoctorCard);
}

async function getDoctorSlots(doctorId, dateText, mode) {
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    return [];
  }

  if (mode && !doctor.supportedModes.includes(mode)) {
    return [];
  }

  if (!dateText) {
    return [];
  }

  return doctor.availability
    .filter((item) => item.date === dateText && (!mode || item.mode === mode))
    .map((item) => ({
      value: item.label,
      label: item.label,
    }));
}

async function getDoctorBookingDetails(doctorId) {
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    return null;
  }

  return {
    id: doctor.id,
    fullName: doctor.fullName,
    specialization: doctor.specialization,
    hospitalOrClinic: doctor.hospitalOrClinic,
    consultationFee: doctor.consultationFee,
    supportedModes: doctor.supportedModes,
  };
}

module.exports = {
  getDoctorBookingDetails,
  getDoctorSlots,
  searchDoctors,
};
