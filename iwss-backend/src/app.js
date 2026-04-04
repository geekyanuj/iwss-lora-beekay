import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import routes from './routes/index.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import logger from './utils/logger.js';

/**
 * Express Application Configuration for Intelligent Water Sprinkler System.
 * Includes middleware for CORS, JSON parsing, logging, and global routing.
 */
const createApp = () => {
  const app = express();

  // Basic Middleware
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());

  // Request logger middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  // Base API path
  app.use('/api', routes);

  // Catch-all route for undefined paths
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 'error',
      statusCode: 404,
      message: `The endpoint ${req.originalUrl} was not found on this server.`,
    });
  });

  // Centralized Error Handling
  app.use(errorMiddleware);

  return app;
};

export default createApp;
