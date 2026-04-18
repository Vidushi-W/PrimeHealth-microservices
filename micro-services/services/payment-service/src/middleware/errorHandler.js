const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

function errorHandler(err, _req, res, _next) {
  logger.error('error', {
    name: err?.name,
    message: err?.message,
    statusCode: err instanceof ApiError ? err.statusCode : 500,
    stack: err?.stack
  });

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: err.details || null
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    data: null
  });
}

module.exports = errorHandler;
