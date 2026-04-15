require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');

const port = Number(process.env.PORT) || 5004;

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      logger.info(`Payment Service is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start Payment Service:', error);
    process.exit(1);
  }
}

start();
