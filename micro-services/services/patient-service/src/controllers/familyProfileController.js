const {
  createFamilyProfile,
  deleteFamilyProfile,
  getFamilyProfileById,
  getFamilyProfiles,
  updateFamilyProfile,
} = require("../services/familyProfileService");

async function listProfiles(req, res) {
  try {
    const result = await getFamilyProfiles(req.user._id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch family profiles",
      error: error.message,
    });
  }
}

async function getProfileById(req, res) {
  try {
    const result = await getFamilyProfileById(req.user._id, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch family profile",
      error: error.message,
    });
  }
}

async function createProfile(req, res) {
  try {
    const result = await createFamilyProfile(req.user._id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "This account is still blocked by an old single-profile database index. Restart the patient-service and try again.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create family profile",
      error: error.message,
    });
  }
}

async function updateProfile(req, res) {
  try {
    const result = await updateFamilyProfile(req.user._id, req.params.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update family profile",
      error: error.message,
    });
  }
}

async function deleteProfile(req, res) {
  try {
    const result = await deleteFamilyProfile(req.user._id, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete family profile",
      error: error.message,
    });
  }
}

module.exports = {
  createProfile,
  deleteProfile,
  getProfileById,
  listProfiles,
  updateProfile,
};
