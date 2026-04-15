const paymentService = require('./paymentService');

/**
 * InvoiceService wraps around paymentService for invoice-specific logic.
 * In production this could handle templates, email delivery, etc.
 */
class InvoiceService {
  async generateAndStream(paymentId, responseStream) {
    return paymentService.generateInvoice(paymentId, responseStream);
  }
}

module.exports = new InvoiceService();
