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

      const thresholdId = `threshold-${clusterId}`;
      await db.collection('thresholds').updateOne(
        { _id: thresholdId },
        {
          $set: {
            pm2_5: parseInt(pm2_5),
            pm10: parseInt(pm10),
            _ts: Date.now(),
          },
        },
        { upsert: true }
      );

      logger.info(`Thresholds updated for cluster ${clusterId}: PM2.5=${pm2_5}, PM10=${pm10}`);
      res.json({
        message: `Threshold for cluster ${clusterId} updated successfully`,
        data: { pm2_5, pm10 },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ThresholdController();
