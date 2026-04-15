const {
  getMyPatientProfile,
  updateMyPatientProfile,
  getMyPatientHome,
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

module.exports = {
  getHome,
  getProfile,
  updateProfile,
};
