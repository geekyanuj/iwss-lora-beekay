import { getDB } from '../config/db.js';
import logger from '../utils/logger.js';
import { ObjectId } from 'mongodb';

/**
 * Device Controller handling registry and control for smart devices.
 * Supports three device types: sensor, pump, sv (solenoid valve).
 * Interacts with 'devices' collection.
 */
class DeviceController {
  /**
   * Fetch all registered devices from the database.
   */
  async getDevices(req, res, next) {
    try {
      const db = getDB();
      const devices = await db.collection('devices').find({}).toArray();
      res.json({
        message: 'Devices fetched successfully',
        count: devices.length,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch devices by cluster ID.
   */
  async getDevicesByCluster(req, res, next) {
    try {
      const db = getDB();
      const { clusterId } = req.params;
      const devices = await db
        .collection('devices')
        .find({ clusterId: parseInt(clusterId) })
        .toArray();

      res.json({
        message: `Devices for cluster ${clusterId} fetched`,
        count: devices.length,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register a new device with its type and cluster ID.
   * Device types: sensor (default), pump, sv (solenoid valve).
   * Pumps and SVs use relay module and respond to MQTT commands.
   *
   * Rule: MQTT topic (deviceid) must be globally unique across all clusters.
   * A device's MQTT topic maps 1:1 to its ESP32 subscription topic — duplicates
   * would cause both devices to respond to every command, which is unsafe.
   */
  async registerDevice(req, res, next) {
    try {
      const db = getDB();
      const { topic, isPump = false, isSV = false, clusterId, x, y } = req.body;

      if (!topic || !clusterId) {
        return res.status(400).json({ error: 'topic and clusterId are required' });
      }

      // ── Duplicate topic guard ──────────────────────────────────────────────
      // MQTT topics must be globally unique. Two devices sharing the same topic
      // would both respond to every ON/OFF command, creating unsafe behaviour.
      const existing = await db.collection('devices').findOne({ deviceid: topic });
      if (existing) {
        const existingType = existing.isPump ? 'Pump' : existing.isSV ? 'Solenoid Valve' : 'Sensor';
        logger.warn(`Duplicate device registration attempt: topic '${topic}' already registered as ${existingType} in Cluster ${existing.clusterId}`);
        return res.status(409).json({
          error: `MQTT topic '${topic}' is already registered`,
          detail: `This topic is already in use by a ${existingType} device in Cluster ${existing.clusterId}. Each device must have a unique MQTT topic.`,
          existingDevice: {
            deviceid: existing.deviceid,
            type: existingType,
            clusterId: existing.clusterId,
          },
        });
      }
      // ──────────────────────────────────────────────────────────────────────

      const devicePlacementX = x !== undefined ? parseFloat(x) : Math.random() * 100;
      const devicePlacementY = y !== undefined ? parseFloat(y) : Math.random() * 100;

      // Ensure a unique index exists on deviceid (idempotent — safe to call repeatedly)
      await db.collection('devices').createIndex({ deviceid: 1 }, { unique: true, background: true });

      await db.collection('devices').insertOne({
        deviceid: topic,
        status: 'off',
        clusterId: parseInt(clusterId),
        isPump: Boolean(isPump),
        isSV: Boolean(isSV),
        x: devicePlacementX,
        y: devicePlacementY,
        _ts: Date.now(),
      });

      logger.info(`New device registered: ${topic} (Cluster ${clusterId}, isPump: ${isPump}, isSV: ${isSV})`);
      res.json({
        message: `Device '${topic}' registered successfully`,
      });
    } catch (error) {
      // MongoDB duplicate key error (E11000) — belt-and-suspenders if the
      // unique index catches a race condition that slipped past the findOne check
      if (error.code === 11000) {
        return res.status(409).json({
          error: `MQTT topic '${req.body?.topic}' is already registered`,
          detail: 'Each device must have a unique MQTT topic across the entire system.',
        });
      }
      next(error);
    }
  }

  /**
   * Update the operational status of a specific device.
   */
  async updateDeviceStatus(req, res, next) {
    try {
      const db = getDB();
      const { deviceId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      await db
        .collection('devices')
        .updateOne({ deviceid: deviceId }, { $set: { status, _ts: Date.now() } });

      logger.info(`Device ${deviceId} status changed to ${status}`);
      res.json({ message: `Device '${deviceId}' status updated to '${status}'` });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a registered device by its MongoDB _id or deviceid.
   */
  async deleteDevice(req, res, next) {
    try {
      const db = getDB();
      const { deviceId } = req.params;

      // Try to delete by deviceid field first (the MQTT topic/device name)
      let result = await db.collection('devices').deleteOne({ deviceid: deviceId });

      // Fallback: try by MongoDB ObjectId
      if (result.deletedCount === 0) {
        try {
          result = await db.collection('devices').deleteOne({ _id: new ObjectId(deviceId) });
        } catch (_) {
          // invalid ObjectId format, that's fine
        }
      }

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: `Device '${deviceId}' not found` });
      }

      logger.info(`Device ${deviceId} deleted`);
      res.json({ message: `Device '${deviceId}' deleted successfully` });
    } catch (error) {
      next(error);
    }
  }
}

export default new DeviceController();
