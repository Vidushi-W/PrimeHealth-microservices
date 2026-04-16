const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates an invoice PDF for a payment
 * @param {Object} payment - Payment document
 * @param {Object} appointment - Inter-service fetched appointment details
 * @returns {Promise<string>} File path to the generated PDF
 */
const generateInvoice = (payment, appointmentName = 'Consultation') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      
      const fileName = `invoice-${payment._id}.pdf`;
      const filePath = path.join(__dirname, '..', 'temp', fileName);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fillColor('#333333')
         .fontSize(20)
         .text('PrimeHealth Hospital', 50, 50)
         .fontSize(10)
         .text('123 Medical Drive', 50, 75)
         .text('Health City, HC 12345', 50, 90)
         .text('contact@primehealth.com', 50, 105);

      // Invoice Details
      doc.fontSize(20)
         .text('INVOICE', 400, 50, { align: 'right' })
         .fontSize(10)
         .text(`Invoice Number: INV-${payment._id.toString().substring(0, 8).toUpperCase()}`, 400, 75, { align: 'right' })
         .text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`, 400, 90, { align: 'right' })
         .text(`Payment Status: ${payment.status}`, 400, 105, { align: 'right' });

      doc.moveTo(50, 130).lineTo(550, 130).stroke();

      // Bill To
      doc.fontSize(12).text('Bill To:', 50, 150)
         .fontSize(10)
         .text(`Patient ID: ${payment.patientId}`, 50, 170)
         .text(`Appointment Ref: ${payment.appointmentId}`, 50, 185);

      // Table Header
      const tableTop = 250;
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Description', 50, tableTop)
         .text('Amount', 450, tableTop, { width: 100, align: 'right' });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table Row
      doc.font('Helvetica')
         .text(appointmentName, 50, tableTop + 30)
         .text(`$${payment.amount.toFixed(2)}`, 450, tableTop + 30, { width: 100, align: 'right' });

      // Total
      doc.moveTo(350, tableTop + 70).lineTo(550, tableTop + 70).stroke();
      doc.font('Helvetica-Bold')
         .text('Total:', 350, tableTop + 85)
         .text(`$${payment.amount.toFixed(2)}`, 450, tableTop + 85, { width: 100, align: 'right' });

      // Footer
      doc.font('Helvetica')
         .fontSize(10)
         .text('Thank you for choosing PrimeHealth.', 50, 700, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };
