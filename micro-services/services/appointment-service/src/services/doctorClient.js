const axios = require('axios');
const logger = require('../config/logger');

// URL for Doctor Service - in Kubernetes this would be http://doctor-service:5002
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:5002';

class DoctorClient {
  /**
   * Check if a doctor is available at a given date/time
   * @param {string} doctorId 
   * @param {string} date (YYYY-MM-DD)
   * @param {string} time (HH:mm)
   * @returns {Promise<boolean>}
   */
  async checkDoctorAvailability(doctorId, date, time) {
    try {
      logger.info(`Checking doctor availability: ${doctorId} at ${date} ${time}`);
      
      const response = await axios.get(`${DOCTOR_SERVICE_URL}/api/doctors/${doctorId}`);
      if (!response.data.success || !response.data.data) {
        return false;
      }
      
      const doctor = response.data.data;
      
      // In a real application, we would check if the doctor's schedule allows this
      // and if there are no overlapping appointments.
      // For this assignment, we will do a basic check based on their general availability.
      if (!doctor.isAvailable) {
        return false;
      }
      
      // Could also implement an API call to appointment-service itself 
      // but the controller handles checking existing appointments
      return true;
      
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logger.error(`Doctor not found: ${doctorId}`);
        return false;
      }
      logger.error(`Error connecting to doctor service: ${error.message}`);
      // Fail closed - if we can't reach the doctor service, assume unavailable
      return false;
    }
  }
}

module.exports = new DoctorClient();
