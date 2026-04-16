function parseStoredJson(key) {
  try {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

function readStoredValue(keys) {
  for (const key of keys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) return value;
  }

  return '';
}

export function getStoredDoctorIdentity() {
  const storedUser =
    parseStoredJson('primehealth:user') ||
    parseStoredJson('primehealthUser') ||
    parseStoredJson('user') ||
    {};

  return {
    id:
      readStoredValue(['primehealth:doctorId', 'primehealthDoctorId', 'doctorId']) ||
      storedUser.doctorId ||
      storedUser.doctor?._id ||
      storedUser.doctor?.id ||
      storedUser._id ||
      storedUser.id ||
      '',
    email:
      readStoredValue(['primehealth:email', 'primehealthDoctorEmail', 'doctorEmail', 'email']) ||
      storedUser.email ||
      storedUser.doctor?.email ||
      '',
    name: storedUser.name || storedUser.doctor?.name || ''
  };
}

export function resolveCurrentDoctor(doctors) {
  const identity = getStoredDoctorIdentity();
  const normalizedEmail = String(identity.email || '').toLowerCase();

  const doctor =
    doctors.find((item) => String(item._id) === String(identity.id)) ||
    doctors.find((item) => String(item.email || '').toLowerCase() === normalizedEmail) ||
    null;

  if (doctor) {
    return {
      doctor,
      source: identity.id || identity.email ? 'session' : 'matched'
    };
  }

  return {
    doctor: doctors[0] || null,
    source: doctors.length > 0 ? 'demo-fallback' : 'missing'
  };
}
