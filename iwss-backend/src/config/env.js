import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates the presence of required environment variables.
 * Throws an error if any essential variable is missing.
 */
const validateEnv = () => {
  const essentials = ['MONGODB_URI'];
  const missing = essentials.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️ Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Falling back to default values where possible.');
  }
};

validateEnv();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/iwssdb',
    dbName: process.env.DB_NAME || 'iwssdb'
  },
  mqtt: {
    host: process.env.MQTT_HOST || 'localhost',
    port: process.env.MQTT_PORT || 1883,
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    topic: 'iwss/+/telemetry'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};
