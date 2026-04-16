const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err?.name === 'ValidationError') {
    return new ApiError(
      400,
      'Validation failed',
      Object.values(err.errors || {}).map((item) => ({
        message: item.message,
        field: item.path,
        value: item.value
      }))
    );
  }

  if (err?.name === 'CastError') {
    return new ApiError(400, `Invalid ${err.path}`);
  }

  if (err?.code === 11000) {
    return new ApiError(409, 'Duplicate resource', err.keyValue);
  }

  return new ApiError(500, 'Internal Server Error');
}

function errorHandler(err, _req, res, _next) {
  const normalizedError = normalizeError(err);

  logger.error('error', {
    name: err?.name,
    message: err?.message,
    statusCode: normalizedError.statusCode,
    stack: err?.stack
  });

  const payload = {
    success: false,
    message: normalizedError.message,
    data: null
  };

  if (normalizedError.details) payload.details = normalizedError.details;
  if (process.env.NODE_ENV !== 'production') payload.stack = err.stack;

  res.status(normalizedError.statusCode).json(payload);
}

module.exports = errorHandler;
