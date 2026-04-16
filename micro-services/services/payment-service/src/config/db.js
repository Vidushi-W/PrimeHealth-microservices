const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/primehealth_payment';
  
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  logger.info(`MongoDB connected to ${mongoUri.split('@').pop()}`);
}

module.exports = connectDB;
