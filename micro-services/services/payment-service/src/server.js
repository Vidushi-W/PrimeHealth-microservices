require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { getPayHereStatus } = require('./config/payhere');

const port = Number(process.env.PORT) || 5004;

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      const ph = getPayHereStatus();
      logger.info(`Payment Service is running on port ${port}`);
      logger.info(
        `PayHere: provider=${ph.provider} mode=${ph.mode} merchantConfigured=${ph.merchantConfigured} checkout=${ph.checkoutUrl || 'n/a'}`
      );
    });
  } catch (error) {
    logger.error('Failed to start Payment Service:', error);
    process.exit(1);
  }
}

start();
