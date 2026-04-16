const axios = require('axios');
const logger = require('../config/logger');

// URL for Appointment Service
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5003';

class AppointmentClient {
  /**
   * Update the payment status of an appointment
   * @param {string} appointmentId 
   * @param {string} paymentStatus (UNPAID, PAID, FAILED, REFUNDED)
   * @returns {Promise<boolean>}
   */
  async updateAppointmentPaymentStatus(appointmentId, paymentStatus) {
    try {
      logger.info(`Updating appointment payment status: ${appointmentId} to ${paymentStatus}`);
      
      const response = await axios.patch(`${APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}/payment-status`, {
        paymentStatus
      });
      
      return response.data.success;
    } catch (error) {
      logger.error(`Error updating appointment service: ${error.message}`);
      return false;
    }
  }
}

module.exports = new AppointmentClient();
