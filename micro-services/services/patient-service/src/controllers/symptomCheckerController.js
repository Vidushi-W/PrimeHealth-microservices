const { checkSymptoms } = require("../services/symptomCheckerService");

async function runSymptomCheck(req, res) {
  try {
    const result = await checkSymptoms(req.user._id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to check symptoms",
      error: error.message,
    });
  }
}

module.exports = {
  runSymptomCheck,
};
