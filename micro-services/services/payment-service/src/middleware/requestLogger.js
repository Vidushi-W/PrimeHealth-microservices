const logger = require('../config/logger');

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${durationMs.toFixed(3)}ms`
    });
  });
  next();
}

module.exports = requestLogger;
