import { MongoClient } from 'mongodb';
import { config } from './env.js';
import logger from '../utils/logger.js';

let client;
let db;

/**
 * Establish a persistent connection to MongoDB.
 * Reconnects on failure and initializes collections.
 */
export async function connectDB() {
  if (db) return db;

  try {
    client = new MongoClient(config.mongodb.uri);
    await client.connect();
    db = client.db(config.mongodb.dbName);

    logger.info(`Connected to MongoDB: ${config.mongodb.uri}`);
    await initializeCollections(db);
    return db;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

/**
 * Get the initialized database instance.
 */
export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

/**
 * Closes the MongoDB connection gracefully.
 */
export async function closeDB() {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed.');
  }
}

/**
 * Create collections and seed with default data if necessary.
 * Useful for new environments.
 */
async function initializeCollections(database) {
  try {
    const existingCollections = await database.listCollections().toArray();
    const collectionNames = existingCollections.map(c => c.name);

    const requiredCollections = ['devices', 'data', 'thresholds'];
    for (const collection of requiredCollections) {
      if (!collectionNames.includes(collection)) {
        await database.createCollection(collection);
        logger.info(`Collection '${collection}' created.`);
      }
    }

    // Initial devices must be registered manually through the dashboard to match actual hardware deployment.

    // Seed default thresholds if empty
    const thresholdCount = await database.collection('thresholds').countDocuments();
    if (thresholdCount === 0) {
      await database.collection('thresholds').insertMany([
        {
          _id: 'threshold-1',
          clusterId: 1,
          pm2_5: 35,
          pm10: 50,
          _ts: Date.now(),
        },
      ]);
      logger.info('Default thresholds seeded.');
    }
  } catch (error) {
    logger.error('Error initializing collections', error);
  }
}
