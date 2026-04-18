const {
  analyzePatientReport,
  deletePatientReport,
  getMyPatientProfile,
  getMyPatientTimeline,
  updateMyPatientProfile,
  uploadMyPatientProfilePicture,
  getMyPatientHome,
  getPatientSummaryForDoctor,
  listMyPatientReports,
  uploadPatientReport,
} = require("../services/patientProfileService");

async function getProfile(req, res) {
  try {
    const result = await getMyPatientProfile(req.user._id, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch patient profile",
      error: error.message,
    });
  }
}

async function updateProfile(req, res) {
  try {
    const result = await updateMyPatientProfile(req.user._id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update patient profile",
      error: error.message,
    });
  }
}

async function uploadProfilePicture(req, res) {
  try {
    if (!req.file?.filename) {
      return res.status(400).json({ message: "Profile image file is required" });
    }
    const filePath = `/uploads/patient-profiles/${req.file.filename}`;
    const result = await uploadMyPatientProfilePicture(req.user._id, filePath);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to upload profile picture",
      error: error.message,
    });
  }
}

async function getHome(req, res) {
  try {
    const result = await getMyPatientHome(req.user._id, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch patient home data",
      error: error.message,
    });
  }
}

async function getTimeline(req, res) {
  try {
    const result = await getMyPatientTimeline(req.user._id, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch patient medical history",
      error: error.message,
    });
  }
}

async function getReports(req, res) {
  try {
    const result = await listMyPatientReports(req.user._id, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch patient reports",
      error: error.message,
    });
  }
}

async function uploadReport(req, res) {
  try {
    const result = await uploadPatientReport(req.user._id, req.body, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to upload patient report",
      error: error.message,
    });
  }
}

async function analyzeReport(req, res) {
  try {
    const result = await analyzePatientReport(req.user._id, req.params.reportId, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to analyze patient report",
      error: error.message,
    });
  }
}

async function getDoctorPatientSummary(req, res) {
  try {
    const result = await getPatientSummaryForDoctor(req.params.patientId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch doctor patient summary",
      error: error.message,
    });
  }
}

async function deleteReport(req, res) {
  try {
    const result = await deletePatientReport(req.user._id, req.params.reportId, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete patient report",
      error: error.message,
    });
  }
}

module.exports = {
  analyzeReport,
  deleteReport,
  getDoctorPatientSummary,
  getHome,
  getProfile,
  getReports,
  getTimeline,
  uploadReport,
  updateProfile,
  uploadProfilePicture,
};
