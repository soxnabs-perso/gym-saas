import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ledger for Gym management API',
      version: '1.0.0',
      description: 'API documentation for the Gym management system'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token returned by /auth/login or /auth/signup'
        }
      }
    }
  },
  apis: [
      './src/routes/*.js',
      './src/controllers/*.js',
      './src/utils/schemas/*.js'
    ]
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };