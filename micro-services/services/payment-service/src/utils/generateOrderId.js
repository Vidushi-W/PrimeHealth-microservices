const crypto = require('crypto');

/**
 * Generates a unique order ID for payment tracking.
 * PayHere-hosted checkout is safest with alphanumeric IDs (no hyphens).
 */
function generateOrderId() {
  return `PH${Date.now()}${crypto.randomBytes(5).toString('hex')}`;
}

module.exports = { generateOrderId };
