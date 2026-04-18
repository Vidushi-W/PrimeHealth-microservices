const swaggerJSDoc = require('swagger-jsdoc');

function buildSwaggerSpec() {
  const port = Number(process.env.PORT) || 5004;
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'PrimeHealth Payment Service API',
        version: '1.0.0',
        description: 'Microservice handling payments and invoices.'
      },
      servers: [
        {
          url: baseUrl,
          description: 'Payment Service'
        }
      ]
    },
    apis: ['./src/routes/*.js']
  };

  return swaggerJSDoc(options);
}

module.exports = {
  swaggerSpec: buildSwaggerSpec()
};
