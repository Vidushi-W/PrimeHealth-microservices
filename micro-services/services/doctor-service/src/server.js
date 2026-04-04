require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const port = Number(process.env.PORT) || 5002;

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`doctor-service listening on port ${port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start doctor-service:', err);
    process.exit(1);
  }
}

start();
