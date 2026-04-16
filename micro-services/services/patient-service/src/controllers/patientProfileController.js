const {
  analyzePatientReport,
  deletePatientReport,
  getMyPatientProfile,
  updateMyPatientProfile,
  getMyPatientHome,
  getPatientSummaryForDoctor,
  listMyPatientReports,
  uploadPatientReport,
} = require("../services/patientProfileService");

async function getProfile(req, res) {
  try {
    const result = await getMyPatientProfile(req.user._id);
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

async function getHome(req, res) {
  try {
    const result = await getMyPatientHome(req.user._id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch patient home data",
      error: error.message,
    });
  }
}

async function getReports(req, res) {
  try {
    const result = await listMyPatientReports(req.user._id);
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
    const result = await uploadPatientReport(req.user._id, req.body);
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
    const result = await analyzePatientReport(req.user._id, req.params.reportId);
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
    const result = await deletePatientReport(req.user._id, req.params.reportId);
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
  uploadReport,
  updateProfile,
};
