const crypto = require('crypto');

/**
 * Generates a unique order ID for payment tracking
 * Format: ORD-<timestamp>-<random>
 */
function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

module.exports = { generateOrderId };
