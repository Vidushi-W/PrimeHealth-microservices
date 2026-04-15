const express = require("express");

const {
  getProfile,
  updateProfile,
} = require("../controllers/patientProfileController");
const { authorizeRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("patient"));

router.get("/me", getProfile);
router.put("/me", updateProfile);

module.exports = router;
