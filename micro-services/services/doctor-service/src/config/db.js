const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
}

module.exports = connectDB;
