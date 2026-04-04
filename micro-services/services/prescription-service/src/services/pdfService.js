const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildPdfFileName(prescriptionId) {
  return `prescription-${prescriptionId}.pdf`;
}

function getPdfDir() {
  return path.join(process.cwd(), 'storage', 'pdfs');
}

function getPdfPublicPath(fileName) {
  return `/files/prescriptions/${fileName}`;
}

function getBaseUrl() {
  const port = Number(process.env.PORT) || 5003;
  return process.env.BASE_URL || `http://localhost:${port}`;
}

async function generatePrescriptionPdf(prescription) {
  const dir = getPdfDir();
  ensureDir(dir);

  const fileName = buildPdfFileName(prescription._id);
  const filePath = path.join(dir, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text('Prescription', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Prescription ID: ${prescription._id}`);
  doc.text(`Doctor ID: ${prescription.doctorId}`);
  doc.text(`Patient ID: ${prescription.patientId}`);
  doc.text(`Appointment ID: ${prescription.appointmentId}`);
  doc.text(`Created At: ${new Date(prescription.createdAt || Date.now()).toISOString()}`);
  doc.moveDown();

  doc.fontSize(12).text(`Diagnosis: ${prescription.diagnosis}`);
  doc.moveDown();

  doc.fontSize(12).text('Medicines:');
  (prescription.medicines || []).forEach((m, idx) => {
    doc.text(
      `${idx + 1}. ${m.name} | Dosage: ${m.dosage} | Duration: ${m.duration}`,
      { indent: 10 }
    );
  });

  if (prescription.notes) {
    doc.moveDown();
    doc.fontSize(12).text(`Notes: ${prescription.notes}`);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const publicPath = getPdfPublicPath(fileName);
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const pdfUrl = `${baseUrl}${publicPath}`;

  return { filePath, pdfUrl, publicPath };
}

module.exports = {
  generatePrescriptionPdf,
  getPdfDir,
  getPdfPublicPath
};
