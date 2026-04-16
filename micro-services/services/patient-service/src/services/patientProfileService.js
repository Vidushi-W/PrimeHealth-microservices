const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const { fetchPrescriptionsByPatient } = require("./prescriptionServiceClient");
const { listMyAppointments } = require("./appointmentBookingService");
const { analyzeImageScan, analyzeTextReport, DEFAULT_DISCLAIMER } = require("./modelReportAnalyzer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPORT_STORAGE_DIR = path.join(__dirname, "..", "..", "uploads", "reports");

function ensureReportStorageDir() {
  fs.mkdirSync(REPORT_STORAGE_DIR, { recursive: true });
}

function buildUserSummary(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildProfileResponse(user, profile) {
  return {
    user: buildUserSummary(user),
    profile: {
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      chronicConditions: profile.chronicConditions,
      address: profile.address,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      profilePhoto: profile.profilePhoto,
      uploadedReports: buildUploadedReports(profile.uploadedReports || []),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
  };
}

function normalizeArray(value) {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [value].filter(Boolean);
}

function formatDateLabel(value) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAnalyzerSummary(analyzer = {}) {
  const findings = Array.isArray(analyzer.findings) ? analyzer.findings.filter(Boolean) : [];
  const extractedValues = analyzer.extractedValues && typeof analyzer.extractedValues === "object"
    ? analyzer.extractedValues
    : {};
  const summaryLabel = analyzer.summary || findings[0] || "Analyzer not run yet";

  return {
    status: analyzer.status || "not_started",
    analyzerType: analyzer.analyzerType || "",
    summary: analyzer.summary || "",
    extractedText: analyzer.extractedText || "",
    findings,
    confidence: typeof analyzer.confidence === "number" ? analyzer.confidence : 0,
    disclaimer: analyzer.disclaimer || DEFAULT_DISCLAIMER,
    errorMessage: analyzer.errorMessage || "",
    extractedValues,
    metrics: {
      glucose: extractedValues.glucose || "",
      cholesterol: extractedValues.cholesterol || "",
      hemoglobin: extractedValues.hemoglobin || "",
    },
    summaryLabel,
    analyzedAt: analyzer.analyzedAt || null,
  };
}

function buildUploadedReports(reports = []) {
  return reports
    .slice()
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .map((report) => ({
      id: report._id,
      patientProfileId: report.patientProfileId,
      name: report.fileName,
      fileName: report.fileName,
      fileUrl: report.fileUrl,
      filePath: report.filePath,
      mimeType: report.mimeType,
      reportType: report.reportType,
      type: report.reportType,
      reportDate: report.reportDate,
      reportDateLabel: formatDateLabel(report.reportDate),
      uploadedAt: report.createdAt,
      uploadedAtLabel: formatDateLabel(report.createdAt),
      status: report.analyzer?.status === "done" ? "Analyzed" : "Uploaded",
      hospitalOrLabName: report.hospitalOrLabName,
      doctorName: report.doctorName,
      notes: report.notes,
      fileSizeBytes: report.fileSizeBytes || 0,
      fileSizeLabel: formatBytes(report.fileSizeBytes || 0),
      analyzer: buildAnalyzerSummary(report.analyzer),
    }));
}

function sanitizeFileName(fileName) {
  return String(fileName || "report")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function decodeBase64File(fileContentBase64) {
  if (!fileContentBase64) {
    return Buffer.from("");
  }

  const normalized = String(fileContentBase64).replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(normalized, "base64");
}

function getFileExtension(fileName) {
  return path.extname(String(fileName || "")).toLowerCase();
}

function isTextLikeReport(report = {}) {
  const mimeType = String(report.mimeType || "").toLowerCase();
  const extension = getFileExtension(report.fileName);

  return mimeType.startsWith("text/")
    || mimeType.includes("pdf")
    || mimeType.includes("json")
    || [".txt", ".pdf", ".csv", ".json", ".md"].includes(extension);
}

function isImageLikeReport(report = {}) {
  return String(report.mimeType || "").toLowerCase().startsWith("image/");
}

function isXrayLikeImage(report = {}) {
  const searchable = [
    report.fileName,
    report.reportType,
    report.notes,
    report.doctorName,
  ].join(" ").toLowerCase();

  return isImageLikeReport(report)
    && /(x-?ray|xray|radiograph|radiology|fracture|chest scan|scan image|scan)/i.test(searchable);
}

function extractPrintablePdfText(fileBuffer) {
  const rawText = fileBuffer.toString("latin1");
  const printableChunks = rawText.match(/[A-Za-z0-9/%().,:;+\-\s]{4,}/g) || [];
  return printableChunks
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function extractTextForAnalysis(report, fileBuffer) {
  const fragments = [String(report.notes || "").trim()];
  const mimeType = String(report.mimeType || "").toLowerCase();

  if (mimeType && mimeType.startsWith("text/")) {
    fragments.push(fileBuffer.toString("utf8"));
  }

  if (mimeType.includes("pdf") || getFileExtension(report.fileName) === ".pdf") {
    fragments.push(extractPrintablePdfText(fileBuffer));
  }

  return fragments.filter(Boolean).join("\n");
}

function matchMetric(sourceText, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(sourceText);
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function buildNotRunAnalyzer() {
  return {
    status: "not_started",
    analyzerType: "",
    summary: "",
    extractedText: "",
    findings: [],
    confidence: 0,
    disclaimer: DEFAULT_DISCLAIMER,
    errorMessage: "",
    extractedValues: {},
    analyzedAt: null,
  };
}

function buildDoctorSummaryResponse(user, profile) {
  return {
    patient: {
      id: user._id,
      name: user.fullName,
      email: user.email,
      phone: user.phone,
      gender: profile.gender || "",
      bloodGroup: profile.bloodGroup || "",
      dateOfBirth: profile.dateOfBirth,
      emergencyContactName: profile.emergencyContactName || "",
      emergencyContactPhone: profile.emergencyContactPhone || "",
    },
    reports: buildUploadedReports(profile.uploadedReports || []),
  };
}

function buildHomeReminders(profile) {
  const reminders = [];

  if (!profile.emergencyContactName || !profile.emergencyContactPhone) {
    reminders.push({
      id: "emergency-contact",
      title: "Add an emergency contact",
      detail: "Keep a trusted contact ready for urgent care workflows.",
      status: "action-needed",
    });
  }

  if (!profile.bloodGroup) {
    reminders.push({
      id: "blood-group",
      title: "Complete your blood group",
      detail: "This helps emergency and clinical teams move faster.",
      status: "action-needed",
    });
  }

  if (!profile.dateOfBirth) {
    reminders.push({
      id: "dob",
      title: "Add your date of birth",
      detail: "Your health record stays more reliable when core identity fields are complete.",
      status: "action-needed",
    });
  }

  if (!reminders.length) {
    reminders.push({
      id: "all-set",
      title: "Your profile looks ready",
      detail: "No urgent profile reminders right now.",
      status: "good",
    });
  }

  return reminders.slice(0, 3);
}

function buildAppointmentReminders(appointments = []) {
  const pendingPayment = appointments.find((appointment) => appointment.status === "pending_payment");
  if (!pendingPayment) {
    return [];
  }

  return [
    {
      id: `payment-${pendingPayment.id}`,
      title: "Complete appointment payment",
      detail: `Your booking with ${pendingPayment.doctorName} is waiting for payment confirmation.`,
      status: "action-needed",
    },
  ];
}

function buildWelcomeCard(user, profile) {
  return {
    title: `Welcome back, ${user.fullName.split(" ")[0] || "Patient"}`,
    subtitle: "Your care updates, prescriptions, and next actions are all in one place.",
    stats: [
      {
        label: "Blood group",
        value: profile.bloodGroup || "Add to profile",
      },
      {
        label: "Emergency contact",
        value: profile.emergencyContactName || "Missing",
      },
      {
        label: "Account email",
        value: user.email,
      },
    ],
  };
}

function buildQuickActions(userId) {
  return {
    symptomChecker: {
      title: "Quick symptom checker",
      description: "Start a quick triage flow before booking a consultation.",
      ctaLabel: "Start symptom check",
      route: "/symptom-checker",
      userId,
    },
    profile: {
      title: "My profile",
      description: "Update medical details, contact info, and emergency contacts.",
      ctaLabel: "Open profile",
      route: "/patient/profile",
    },
  };
}

function buildUpcomingAppointments(appointments, profile) {
  if (!appointments.length) {
    return [
      {
        id: "appt-placeholder-1",
        title: "No upcoming appointments yet",
        clinician: "Book a consultation to see it here",
        dateLabel: "Schedule when ready",
        status: "open",
        location: profile.address || "PrimeHealth care network",
        mode: "",
        timeSlot: "",
      },
    ];
  }

  return appointments.slice(0, 3).map((appointment) => ({
    id: appointment.id,
    title: appointment.doctorName,
    clinician: appointment.specialization,
    dateLabel: appointment.dateLabel,
    status: appointment.status,
    location: appointment.hospitalOrClinic,
    mode: appointment.mode,
    timeSlot: appointment.timeSlot,
    paymentStatus: appointment.paymentStatus,
  }));
}

function buildPrescriptionSummary(prescriptions) {
  if (!prescriptions.length) {
    return [
      {
        id: "prescription-empty",
        diagnosis: "No prescriptions yet",
        doctorId: "Your latest prescriptions will appear here",
        createdAtLabel: "Nothing issued yet",
        medicineCount: 0,
        pdfUrl: "",
      },
    ];
  }

  return prescriptions.slice(0, 3).map((prescription) => ({
    id: prescription._id,
    diagnosis: prescription.diagnosis,
    doctorId: prescription.doctorId,
    createdAtLabel: formatDateLabel(prescription.createdAt),
    medicineCount: Array.isArray(prescription.medicines) ? prescription.medicines.length : 0,
    pdfUrl: prescription.pdfUrl || "",
  }));
}

function sortTimelineItems(items = []) {
  return items
    .filter((item) => item?.date)
    .sort((left, right) => new Date(right.date) - new Date(left.date));
}

function buildAction(type, item = {}) {
  if (type === "report" && item.fileUrl) {
    return {
      label: "Open file",
      href: item.fileUrl,
      actionType: "link",
    };
  }

  if (type === "report_analysis" && item.fileUrl) {
    return {
      label: "Open file",
      href: item.fileUrl,
      actionType: "link",
    };
  }

  if (type === "prescription" && item.pdfUrl) {
    return {
      label: "View prescription",
      href: item.pdfUrl,
      actionType: "link",
    };
  }

  return {
    label: "View details",
    href: type === "consultation" ? "/patient/history" : "/patient/dashboard",
    actionType: "route",
  };
}

function buildAppointmentTimelineItems(appointments = []) {
  return appointments.flatMap((appointment) => {
    const appointmentDate = appointment.appointmentDate
      ? new Date(`${appointment.appointmentDate}T00:00:00Z`).toISOString()
      : appointment.createdAt;

    const bookedEvent = {
      id: `appointment-${appointment.id}`,
      type: "appointment",
      title: `Appointment with ${appointment.doctorName}`,
      description: `${appointment.specialization} at ${appointment.hospitalOrClinic || "PrimeHealth care network"}`,
      date: appointment.createdAt || appointmentDate,
      displayDate: formatDateLabel(appointment.createdAt || appointmentDate),
      status: appointment.status || "booked",
      doctorOrHospital: appointment.doctorName || appointment.hospitalOrClinic || "",
      action: buildAction("appointment", appointment),
    };

    if (!String(appointment.status || "").toLowerCase().includes("complete")) {
      return [bookedEvent];
    }

    return [
      bookedEvent,
      {
        id: `consultation-${appointment.id}`,
        type: "consultation",
        title: `Consultation completed with ${appointment.doctorName}`,
        description: `${appointment.mode === "online" ? "Online" : "In-person"} consultation${appointment.reason ? ` for ${appointment.reason}` : ""}`,
        date: appointmentDate,
        displayDate: formatDateLabel(appointmentDate),
        status: "completed",
        doctorOrHospital: appointment.doctorName || appointment.hospitalOrClinic || "",
        action: buildAction("consultation", appointment),
      },
    ];
  });
}

function buildReportTimelineItems(reports = []) {
  return reports.flatMap((report) => {
    const uploadedEvent = {
      id: `report-${report.id}`,
      type: "report",
      title: `${report.reportType} uploaded`,
      description: `Uploaded from ${report.hospitalOrLabName || "your healthcare provider"}`,
      date: report.uploadedAt || report.reportDate,
      displayDate: formatDateLabel(report.uploadedAt || report.reportDate),
      status: report.analyzer?.status === "done" ? "analyzed" : "stored",
      doctorOrHospital: report.doctorName || report.hospitalOrLabName || "",
      action: buildAction("report", report),
    };

    if (report.analyzer?.status !== "done" || !report.analyzer?.analyzedAt) {
      return [uploadedEvent];
    }

    return [
      uploadedEvent,
      {
        id: `report-analysis-${report.id}`,
        type: "report_analysis",
        title: `${report.reportType} analyzed`,
        description: report.analyzer.summary || "Analyzer completed and added a summary to this report.",
        date: report.analyzer.analyzedAt,
        displayDate: formatDateLabel(report.analyzer.analyzedAt),
        status: "completed",
        doctorOrHospital: report.hospitalOrLabName || "",
        action: buildAction("report_analysis", report),
      },
    ];
  });
}

function buildPrescriptionTimelineItems(prescriptions = []) {
  return prescriptions.map((prescription) => ({
    id: `prescription-${prescription._id}`,
    type: "prescription",
    title: prescription.diagnosis || "Prescription issued",
    description: `${Array.isArray(prescription.medicines) ? prescription.medicines.length : 0} medicine${Array.isArray(prescription.medicines) && prescription.medicines.length === 1 ? "" : "s"} added to your treatment plan`,
    date: prescription.createdAt,
    displayDate: formatDateLabel(prescription.createdAt),
    status: "issued",
    doctorOrHospital: prescription.doctorId || "",
    action: buildAction("prescription", prescription),
  }));
}

function buildTimelineItems({ appointments = [], reports = [], prescriptions = [] }) {
  return sortTimelineItems([
    ...buildAppointmentTimelineItems(appointments),
    ...buildReportTimelineItems(reports),
    ...buildPrescriptionTimelineItems(prescriptions),
  ]);
}

async function getMyPatientProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  return {
    status: 200,
    body: buildProfileResponse(user, profile),
  };
}

async function getMyPatientHome(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  let prescriptions = [];
  let appointments = [];

  try {
    prescriptions = await fetchPrescriptionsByPatient(String(userId));
  } catch (_error) {
    prescriptions = [];
  }

  try {
    appointments = await listMyAppointments(userId);
  } catch (_error) {
    appointments = [];
  }

  const uploadedReports = buildUploadedReports(profile.uploadedReports || []);
  const timeline = buildTimelineItems({
    appointments,
    reports: uploadedReports,
    prescriptions,
  });

  return {
    status: 200,
    body: {
      message: "Patient home fetched successfully",
      user: buildUserSummary(user),
      profile: buildProfileResponse(user, profile).profile,
      welcomeCard: buildWelcomeCard(user, profile),
      upcomingAppointments: buildUpcomingAppointments(appointments, profile),
      recentPrescriptions: buildPrescriptionSummary(prescriptions),
      uploadedReports,
      recentHistory: timeline.slice(0, 3),
      reminders: [...buildAppointmentReminders(appointments), ...buildHomeReminders(profile)].slice(0, 3),
      quickActions: buildQuickActions(String(userId)),
    },
  };
}

async function getMyPatientTimeline(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  let prescriptions = [];
  let appointments = [];

  try {
    prescriptions = await fetchPrescriptionsByPatient(String(userId));
  } catch (_error) {
    prescriptions = [];
  }

  try {
    appointments = await listMyAppointments(userId);
  } catch (_error) {
    appointments = [];
  }

  const reports = buildUploadedReports(profile.uploadedReports || []);
  const timeline = buildTimelineItems({
    appointments,
    reports,
    prescriptions,
  });

  return {
    status: 200,
    body: {
      success: true,
      timeline,
    },
  };
}

async function uploadPatientReport(userId, payload) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const requiredFields = ["fileName", "fileContentBase64", "mimeType", "reportType", "reportDate", "hospitalOrLabName"];
  const missing = requiredFields.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) {
    return {
      status: 400,
      body: { message: `Missing required fields: ${missing.join(", ")}` },
    };
  }

  ensureReportStorageDir();

  const fileBuffer = decodeBase64File(payload.fileContentBase64);
  if (!fileBuffer.length) {
    return {
      status: 400,
      body: { message: "Uploaded file content is empty" },
    };
  }

  const safeName = sanitizeFileName(payload.fileName);
  const extension = path.extname(safeName);
  const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
  const absoluteFilePath = path.join(REPORT_STORAGE_DIR, storedName);
  fs.writeFileSync(absoluteFilePath, fileBuffer);

  const relativePath = path.posix.join("uploads", "reports", storedName);
  profile.uploadedReports.push({
    patientProfileId: profile._id,
    fileName: safeName,
    fileUrl: `/${relativePath}`,
    filePath: relativePath,
    mimeType: payload.mimeType,
    fileSizeBytes: fileBuffer.length,
    reportType: payload.reportType,
    reportDate: payload.reportDate,
    hospitalOrLabName: payload.hospitalOrLabName,
    doctorName: payload.doctorName || "",
    notes: payload.notes || "",
    analyzer: buildNotRunAnalyzer(),
  });

  await profile.save();

  const uploadedReport = buildUploadedReports(profile.uploadedReports || [])[0];

  return {
    status: 201,
    body: {
      message: "Patient report uploaded successfully",
      report: uploadedReport,
    },
  };
}

async function listMyPatientReports(userId) {
  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  return {
    status: 200,
    body: {
      message: "Patient reports fetched successfully",
      reports: buildUploadedReports(profile.uploadedReports || []),
    },
  };
}

async function analyzePatientReport(userId, reportId) {
  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const report = profile.uploadedReports.id(reportId);
  if (!report) {
    return {
      status: 404,
      body: { message: "Report not found" },
    };
  }

  const absoluteFilePath = path.join(__dirname, "..", "..", report.filePath);
  if (!fs.existsSync(absoluteFilePath)) {
    return {
      status: 404,
      body: { message: "Saved report file could not be found" },
    };
  }

  report.analyzer = {
    ...buildNotRunAnalyzer(),
    status: "processing",
  };
  await profile.save();

  try {
    const analysis = isTextLikeReport(report)
      ? await analyzeTextReport({
        filePath: absoluteFilePath,
        fileName: report.fileName,
        reportType: report.reportType,
        notes: report.notes,
      })
      : await analyzeImageScan({
        filePath: absoluteFilePath,
        fileName: report.fileName,
        reportType: report.reportType,
        notes: report.notes,
      });

    report.analyzer = {
      ...buildNotRunAnalyzer(),
      ...analysis,
    };

    await profile.save();

    const refreshed = buildUploadedReports(profile.uploadedReports || []).find((item) => String(item.id) === String(reportId));

    return {
      status: 200,
      body: {
        message: "Report analyzer completed",
        report: refreshed,
      },
    };
  } catch (error) {
    report.analyzer = {
      ...buildNotRunAnalyzer(),
      status: "failed",
      analyzerType: isTextLikeReport(report) ? "text_report" : "image_scan",
      summary: "Analysis failed before a result could be generated.",
      findings: ["Analysis could not be completed"],
      confidence: 0,
      disclaimer: DEFAULT_DISCLAIMER,
      errorMessage: error.message,
      analyzedAt: new Date(),
    };

    await profile.save();

    return {
      status: 500,
      body: {
        message: "Report analysis failed",
        error: error.message,
      },
    };
  }
}

async function deletePatientReport(userId, reportId) {
  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const report = profile.uploadedReports.id(reportId);
  if (!report) {
    return {
      status: 404,
      body: { message: "Report not found" },
    };
  }

  const absoluteFilePath = path.join(__dirname, "..", "..", report.filePath);
  if (fs.existsSync(absoluteFilePath)) {
    fs.unlinkSync(absoluteFilePath);
  }

  report.deleteOne();
  await profile.save();

  return {
    status: 200,
    body: {
      message: "Patient report deleted successfully",
      reports: buildUploadedReports(profile.uploadedReports || []),
    },
  };
}

async function getPatientSummaryForDoctor(patientId) {
  const user = await User.findById(patientId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId: patientId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  return {
    status: 200,
    body: {
      message: "Patient summary fetched successfully",
      ...buildDoctorSummaryResponse(user, profile),
    },
  };
}

async function updateMyPatientProfile(userId, payload) {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      body: { message: "User not found" },
    };
  }

  const profile = await PatientProfile.findOne({ userId });
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  const userUpdates = {};
  const profileUpdates = {};

  if (payload.fullName !== undefined) {
    userUpdates.fullName = payload.fullName.trim();
  }

  if (payload.phone !== undefined) {
    userUpdates.phone = payload.phone;
  }

  const profileFields = [
    "dateOfBirth",
    "gender",
    "bloodGroup",
    "address",
    "emergencyContactName",
    "emergencyContactPhone",
    "profilePhoto",
  ];

  for (const field of profileFields) {
    if (payload[field] !== undefined) {
      profileUpdates[field] = payload[field];
    }
  }

  const allergies = normalizeArray(payload.allergies);
  if (allergies !== undefined) {
    profileUpdates.allergies = allergies;
  }

  const chronicConditions = normalizeArray(payload.chronicConditions);
  if (chronicConditions !== undefined) {
    profileUpdates.chronicConditions = chronicConditions;
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(userId, userUpdates, {
      new: true,
      runValidators: true,
    });
  }

  if (Object.keys(profileUpdates).length > 0) {
    await PatientProfile.findOneAndUpdate({ userId }, profileUpdates, {
      new: true,
      runValidators: true,
    });
  }

  const updatedUser = await User.findById(userId);
  const updatedProfile = await PatientProfile.findOne({ userId });

  return {
    status: 200,
    body: {
      message: "Patient profile updated successfully",
      ...buildProfileResponse(updatedUser, updatedProfile),
    },
  };
}

module.exports = {
  analyzePatientReport,
  deletePatientReport,
  getMyPatientHome,
  getMyPatientProfile,
  getMyPatientTimeline,
  getPatientSummaryForDoctor,
  listMyPatientReports,
  uploadPatientReport,
  updateMyPatientProfile,
};
