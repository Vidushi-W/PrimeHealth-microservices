const User = require("../models/User");
const DoctorProfile = require("../models/DoctorProfile");
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

function parseTimeToMinutes(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
}

function minutesToTime(minutes) {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function normalizeAvailabilityItems(items = []) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return items
    .map((item) => {
      let day = item?.day;

      if (!day && item?.date) {
        const parsed = new Date(`${item.date}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          day = dayNames[parsed.getDay()];
        }
      }

      return {
        day,
        startTime: item?.startTime,
        endTime: item?.endTime,
        mode: item?.mode || "physical",
        label: formatSlotLabel(item?.startTime, item?.endTime),
      };
    })
    .filter((item) => item.day && item.startTime && item.endTime)
    .sort((left, right) => {
      const leftKey = `${left.day} ${left.startTime}`;
      const rightKey = `${right.day} ${right.startTime}`;
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
  const nextAvailability = doctor.availability.find((item) => item.label);

  return {
    id: doctor.id,
    fullName: doctor.fullName,
    specialization: doctor.specialization,
    hospitalOrClinic: doctor.hospitalOrClinic,
    consultationFee: doctor.consultationFee,
    profileImage: doctor.profileImage,
    rating: doctor.rating,
    supportedModes: doctor.supportedModes,
    availability: doctor.availability,
    nextAvailableSlot: nextAvailability
      ? `${nextAvailability.day} ${nextAvailability.label}`
      : "Slots will be updated soon",
  };
}

function getDayName(dateText) {
  if (!dateText) {
    return null;
  }

  const parsed = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return DAY_NAMES[parsed.getUTCDay()];
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

  const dayName = getDayName(dateText);
  if (!dayName) {
    return [];
  }

  const slots = doctor.availability
    .filter((item) => item.day === dayName && (!mode || item.mode === mode))
    .flatMap((item) => {
      const startMinutes = parseTimeToMinutes(item.startTime);
      const endMinutes = parseTimeToMinutes(item.endTime);

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return [];
      }

      const generatedSlots = [];
      for (let cursor = startMinutes; cursor + 15 <= endMinutes; cursor += 15) {
        const slotStart = minutesToTime(cursor);
        const slotEnd = minutesToTime(cursor + 15);
        generatedSlots.push({
          value: formatSlotLabel(slotStart, slotEnd),
          label: formatSlotLabel(slotStart, slotEnd),
          startTime: slotStart,
          endTime: slotEnd,
          disabled: false,
        });
      }

      return generatedSlots;
    });

  const uniqueSlots = new Map();
  for (const slot of slots) {
    uniqueSlots.set(slot.value, slot);
  }

  return Array.from(uniqueSlots.values());
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
