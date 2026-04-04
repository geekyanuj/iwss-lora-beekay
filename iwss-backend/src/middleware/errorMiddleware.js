import logger from '../utils/logger.js';

/**
 * Global and centralized error handling middleware for Express.
 * Catches all errors and returns a consistent response format.
 */
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error with its properties
  logger.error(`Error ${statusCode}: ${message}`, err);

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Include stack trace only in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

export default errorMiddleware;
