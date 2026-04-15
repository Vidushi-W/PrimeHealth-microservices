const winston = require('winston');

function buildLogger() {
  const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

  const formats = [
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ];

  if (process.env.NODE_ENV !== 'production') {
    formats.push(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} ${level}: ${message}${stack ? '\n' + stack : ''}`;
      })
    );
  } else {
    formats.push(winston.format.json());
  }

  return winston.createLogger({
    level,
    format: winston.format.combine(...formats),
    transports: [new winston.transports.Console()]
  });
}

module.exports = buildLogger();
