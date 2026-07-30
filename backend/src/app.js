import 'express-async-errors';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import { createRateLimiter } from './middleware/rateLimit.middleware.js';

import apiRoutes from './routes/index.js';
import { specs, swaggerUi } from './config/swagger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

function createApp() {
  const app = express();

  /**
   * @description Middleware setup
   */
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use(compression());
  app.use(morgan('dev'));
  app.use(
    '/api',
    createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 300,
    })
  );

  /**
   * @description Swagger Documentation
   */
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Ledger for Gyms API Documentation'
  }));

  /**
   * @description API Routes
   */
  app.use('/api/v1', apiRoutes);

  /**
   * @description Error handling and 404
   */
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
