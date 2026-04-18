const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

// Routes
const paymentRoutes = require('./routes/paymentRoutes');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { swaggerSpec } = require('./config/swagger');
const { getPayHereStatus } = require('./config/payhere');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'payment-service',
    payhere: getPayHereStatus()
  });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
