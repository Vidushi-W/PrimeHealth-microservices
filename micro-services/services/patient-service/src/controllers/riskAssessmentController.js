const { calculateRiskAssessment, listRiskAssessmentHistory } = require("../services/riskAssessmentService");

async function calculateRisk(req, res) {
  try {
    const result = await calculateRiskAssessment(req.user._id, req.body, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to calculate risk score",
      error: error.message,
    });
  }
}

async function getRiskHistory(req, res) {
  try {
    const result = await listRiskAssessmentHistory(req.user._id, req.headers["x-profile-id"]);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch risk score history",
      error: error.message,
    });
  }
}

module.exports = {
  calculateRisk,
  getRiskHistory,
};
