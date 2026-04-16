const mongoose = require('mongoose');
const env = require('./env');

const connectDatabase = async () => {
    if (!env.mongoUri) {
        console.warn('MONGO_URI is not set. API will run without database connectivity.');
        return;
    }

    try {
        await mongoose.connect(env.mongoUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
    }
};

const isDatabaseReady = () => mongoose.connection.readyState === 1;

module.exports = {
    connectDatabase,
    isDatabaseReady
};
