const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes (to be added)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Patient service is running' });
});

module.exports = app;
