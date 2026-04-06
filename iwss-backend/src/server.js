import createApp from './app.js';
import { config } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import logger from './utils/logger.js';
import mqttService from './services/mqttService.js';

/**
 * Entry point for the Intelligent Water Sprinkler System backend.
 * Responsible for initializing the database connection and starting the Express server.
 */
async function startServer() {
  try {
    // 1. Initialize MongoDB connection
    logger.info('Initializing MongoDB connection...');
    await connectDB();

    // 2. Initialize MQTT Broker connection
    logger.info('Initializing MQTT Broker connection...');
    mqttService.connect();

    // 3. Initialize Polling Service (Talk When Spoken To architecture)
    const pollingService = (await import('./services/pollingService.js')).default;
    pollingService.start();

    // 4. Initialize and configure Express app
    const app = createApp();

    // 5. Start listening for network requests
    app.listen(config.port, () => {
      logger.info(`Server is running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Check /api/health for system status`);
    });
  } catch (error) {
    logger.error('CRITICAL ERROR: Failed to start the server environment', error);
    process.exit(1);
  }
}

// Global Rejection Handler for unhandled asynchronous errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', reason);
});

// Global Exception Handler for synchronous errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception occurred!', error);
  process.exit(1);
});

// Handle graceful shutdown for process signals (e.g., SIGINT, SIGTERM)
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Initiating graceful shutdown...`);
  try {
    await closeDB();
    mqttService.disconnect();
    logger.info('Graceful shutdown completed successfully.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Kick off the server execution
startServer();
