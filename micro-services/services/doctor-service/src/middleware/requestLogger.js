const logger = require('../config/logger');

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: req.user?.id || null,
      userRole: req.user?.role || null
    });
  });
  next();
}

module.exports = requestLogger;
