const app = require('./app');
const connectDB = require('./config/db');
const PORT = process.env.PORT || 5002;

// Connect to Database
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Mock Doctor service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`Failed to start doctor-service: ${err.message}`);
    process.exit(1);
  });
