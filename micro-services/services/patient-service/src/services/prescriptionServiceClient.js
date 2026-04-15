function getBaseUrl() {
  return process.env.PRESCRIPTION_SERVICE_URL || "http://localhost:5003";
}

async function fetchPrescriptionsByPatient(patientId) {
  const baseUrl = getBaseUrl().replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/api/prescriptions/patient/${patientId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch prescriptions from prescription-service");
  }

  const payload = await response.json();
  return payload?.data || [];
}

module.exports = {
  fetchPrescriptionsByPatient,
};
