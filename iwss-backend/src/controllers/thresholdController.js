import { getDB } from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Threshold Controller managing safety limits for PM2.5 and PM10 levels.
 * Interacts with 'thresholds' collection.
 */
class ThresholdController {
  /**
   * Get configured thresholds for a specific cluster.
   */
  async getThresholdsByCluster(req, res, next) {
    try {
      const db = getDB();
      const { clusterId } = req.params;
      const thresholdId = `threshold-${clusterId}`;
      const threshold = await db.collection('thresholds').findOne({ _id: thresholdId });

      if (!threshold) {
        return res.json({
          message: `Threshold not found for cluster ${clusterId}.`,
          data: null,
        });
      }

      res.json({
        message: 'Threshold fetched successfully',
        data: threshold,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system-wide configuration (Global Polling Interval).
   */
  async getGlobalConfig(req, res, next) {
    try {
      const db = getDB();
      const config = await db.collection('thresholds').findOne({ _id: 'global-config' });
      res.json({
        message: 'Global config fetched successfully',
        data: config || { _id: 'global-config', pollInterval: 5 }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the system-wide (global) LoRa polling interval to avoid congestion.
   */
  async updateGlobalInterval(req, res, next) {
    try {
      const db = getDB();
      const { pollInterval } = req.body;

      if (!pollInterval || parseInt(pollInterval) < 1) {
        return res.status(400).json({ error: 'Valid pollInterval is required' });
      }

      const updateData = {
        pollInterval: parseInt(pollInterval),
        _ts: Date.now(),
      };

      await db.collection('thresholds').updateOne(
        { _id: 'global-config' },
        { $set: updateData },
        { upsert: true }
      );

      // Trigger hot-reload of Global polling strategy
      const pollingService = (await import('../services/pollingService.js')).default;
      pollingService.refresh();

      logger.info(`System polling interval updated to ${pollInterval}s`);
      res.json({
        message: 'Global polling interval updated successfully',
        data: updateData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update safety thresholds for a specific cluster.
   */
  async updateThreshold(req, res, next) {
    try {
      const db = getDB();
      const { clusterId } = req.params;
      const { pm2_5, pm10 } = req.body;

      if (!pm2_5 || !pm10) {
        return res.status(400).json({ error: 'pm2_5 and pm10 are required' });
      }

      const updateData = {
        pm2_5: parseInt(pm2_5),
        pm10: parseInt(pm10),
        _ts: Date.now(),
      };

      const thresholdId = `threshold-${clusterId}`;
      await db.collection('thresholds').updateOne(
        { _id: thresholdId },
        { $set: updateData },
        { upsert: true }
      );

      logger.info(`Thresholds updated for cluster ${clusterId}: PM2.5=${pm2_5}, PM10=${pm10}`);
      res.json({
        message: `Threshold for cluster ${clusterId} updated successfully`,
        data: updateData,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ThresholdController();
