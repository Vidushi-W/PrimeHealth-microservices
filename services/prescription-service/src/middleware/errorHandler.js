const ApiError = require('../utils/ApiError');

function errorHandler(err, _req, res, _next) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message =
    err instanceof ApiError ? err.message : 'Internal Server Error';

  const payload = {
    success: false,
    message
  };

  if (err instanceof ApiError && err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production') payload.stack = err.stack;

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
