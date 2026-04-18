const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "patient-profiles");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExt = extension || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }
  return cb(new Error("Only image files are allowed"), false);
}

const patientPhotoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = { patientPhotoUpload };
