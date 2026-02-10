const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KGL REST API Documentation',
      version: '1.0.0',
      description: 'This is the documentation for the KGL REST API for the frontend app',
      contact: {
        name: 'KGL Groceries LTD',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Main API Server',
      },
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development Server',
      },
      {
        url: 'https://kgl-groceries-production.up.railway.app/api',
        description: 'Production Server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
