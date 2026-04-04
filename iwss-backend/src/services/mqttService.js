import mqtt from 'mqtt';
import { config } from '../config/env.js';
import { getDB } from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Service to manage MQTT broker connection and data ingestion.
 *
 * Architecture notes for relay devices (Pumps / Solenoid Valves):
 * - Commands are published one-way to the device's MQTT topic (fire-and-forget).
 * - The ESP32 does NOT send back a feedback/acknowledgement message.
 * - Device status (on/off) is tracked entirely on the server side:
 *   the moment a command is published, the DB is updated immediately.
 * - Therefore incoming messages on pump/SV topics are treated as plain telemetry
 *   (or ignored), never used to derive device state.
 *
 * Only pure sensors (isPump: false, isSV: false) publish telemetry data that
 * is stored as type: 'telemetry' in the data collection.
 */
class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initializes the MQTT connection and sets up message handlers.
   */
  connect() {
    const { host, port, username, password } = config.mqtt;
    const url = `mqtt://${host}:${port}`;

    logger.info(`Attempting to connect to MQTT Broker at ${url}...`);

    this.client = mqtt.connect(url, {
      username,
      password,
      connectTimeout: 5000,
      reconnectPeriod: 5000,
      protocol: 'mqtt',
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info(`Connected to MQTT Broker at ${url}`);

      const subscriptionTopic = '#';
      this.client.subscribe(subscriptionTopic, (err) => {
        if (!err) {
          logger.info(`Subscribed to all topics: ${subscriptionTopic}`);
        } else {
          logger.error('Failed to subscribe to MQTT topics', err);
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        const messageStr = message.toString();
        let dataToStore;
        let deviceName = topic;
        let pm2_5, pm10;

        logger.info(`MQTT DEBUG: Received on topic '${topic}': ${messageStr}`);

        // --- NEW: Handle Master Node CSV Payload (sensors/pm topic) ---
        // Format: "NodeName,PM2.5,PM10" (e.g. "C1-SCU1,12.5,25.0")
        if (topic === 'sensors/pm') {
          const parts = messageStr.split(',');
          if (parts.length >= 3) {
            deviceName = parts[0].trim();
            pm2_5 = parseFloat(parts[1]);
            pm10 = parseFloat(parts[2]);
            dataToStore = { pm2_5, pm10, raw: messageStr };
            logger.debug(`MQTT [Master]: Parsed CSV from ${deviceName}: PM2.5=${pm2_5}, PM10=${pm10}`);
          } else {
            logger.warn(`MQTT [Master]: Received malformed CSV (length ${parts.length}) on ${topic}: ${messageStr}. Expected at least 3 parts.`);
            return;
          }
        } else {
          // --- LEGACY: Handle JSON Payload (individual device topics) ---
          try {
            const payload = JSON.parse(messageStr);
            dataToStore = payload.data || payload;
            pm2_5 = dataToStore.pm2_5 !== undefined ? dataToStore.pm2_5 : dataToStore.pm25;
            pm10 = dataToStore.pm10;
          } catch (e) {
            logger.warn(`MQTT: Received non-JSON message on topic ${topic}: ${messageStr}`);
            return;
          }
        }

        const db = getDB();
        // Look up device record by its name (stored as deviceid)
        const device = await db.collection('devices').findOne({ deviceid: deviceName });

        if (!device) {
          logger.warn(`MQTT WARNING: Device '${deviceName}' not found in DB. Topic was '${topic}'. Make sure you registered the device exactly with this name.`);
          return;
        }

        // Pump and SV devices do NOT send feedback — any incoming message on their
        // topic is unexpected and should be ignored (not used to derive status).
        if (device.isPump || device.isSV) {
          logger.debug(`Ignoring incoming message on relay topic '${topic}' — pumps/SVs do not send feedback.`);
          return;
        }

        // Sensor telemetry: store as normal
        const clusterId = device.clusterId;

        await db.collection('data').insertOne({
          topic: deviceName, // Store the actual device name/id even if topic was 'sensors/pm'
          data: dataToStore,
          type: 'telemetry',
          clusterId,
          _ts: Date.now(),
        });

        logger.info(`MQTT [${deviceName}]: Saved telemetry from ${topic} (Cluster ${clusterId})`);

        // Trigger automatic control based on thresholds
        if (pm2_5 !== undefined || pm10 !== undefined) {
          await this._checkThresholdAndActuate(clusterId, pm2_5 || 0, pm10 || 0);
        }
      } catch (error) {
        logger.error(`Failed to process message on topic '${topic}':`, error);
      }
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('MQTT Connection closed');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      logger.error('MQTT Client Error encountered:', err);
    });
  }

  /**
   * Internal helper to check cluster thresholds against incoming sensor data
   * and automatically actuate (ON/OFF) all pumps and SVs in that cluster.
   *
   * Threshold rules:
   * - If PM2.5 > threshold OR PM10 > threshold: Turn ON all pumps/SVs.
   * - Otherwise: Turn OFF all pumps/SVs.
   * - Default threshold (if not set in dashboard) is PM2.5: 100, PM10: 100.
   */
  async _checkThresholdAndActuate(clusterId, pm2_5, pm10) {
    try {
      const db = getDB();
      const thresholdId = `threshold-${clusterId}`;

      // Fetch thresholds for this cluster, default to 100 if not found
      let threshold = await db.collection('thresholds').findOne({ _id: thresholdId });

      const pm25Limit = (threshold && threshold.pm2_5 !== undefined) ? threshold.pm2_5 : 100;
      const pm10Limit = (threshold && threshold.pm10 !== undefined) ? threshold.pm10 : 100;

      // Determine desired state: ON if either PM level exceeds threshold
      const shouldBeOn = pm2_5 > pm25Limit || pm10 > pm10Limit;
      const command = shouldBeOn ? 'on' : 'off';

      // Find all controllable devices (pumps + SVs) in this cluster
      const controllableDevices = await db.collection('devices').find({
        clusterId: parseInt(clusterId),
        $or: [{ isPump: true }, { isSV: true }]
      }).toArray();

      if (controllableDevices.length === 0) return;

      // Filter to only devices that actually need a state change to avoid MQTT spam
      const devicesToActuate = controllableDevices.filter(d => d.status !== command);

      if (devicesToActuate.length === 0) return;

      logger.info(`Auto-control Logic [Cluster ${clusterId}]: PM2.5=${pm2_5}, PM10=${pm10}. Thresholds: PM2.5=${threshold.pm2_5}, PM10=${threshold.pm10}. Action: ${command.toUpperCase()} for ${devicesToActuate.length} devices.`);

      // Actuate each device that needs a state change
      for (const device of devicesToActuate) {
        try {
          await this.publishCommand(device.deviceid, command, clusterId);
        } catch (err) {
          logger.error(`Auto-control failed to actuate ${device.deviceid}:`, err);
        }
      }
    } catch (error) {
      logger.error(`Error in auto-control logic for Cluster ${clusterId}:`, error);
    }
  }

  /**
   * Publish a command (on/off) to a pump or SV device — fire-and-forget.
   *
   * Since the ESP32 does not send back a status response, the server tracks
   * the device state itself:
   *   1. Publish the command payload to the device's MQTT topic.
   *   2. Immediately update the device's status in the DB to match the command.
   *   3. Record a 'command' event in the data collection for analytics history.
   *
   * The frontend Pump/SV ON-OFF graph reads these 'command' events.
   */
  async publishCommand(topic, command, clusterId = null) {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT broker is not connected');
    }

    // Payload format: raw string "on" or "off" as expected by the ESP32 relay hardware
    const payload = command;

    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, { qos: 1, retain: false }, async (err) => {
        if (err) {
          logger.error(`Failed to publish command '${command}' to topic '${topic}':`, err);
          reject(err);
          return;
        }

        logger.info(`MQTT command '${command}' published to '${topic}' (fire-and-forget)`);

        // Server-side state tracking — no feedback needed from the device
        try {
          const db = getDB();
          const device = await db.collection('devices').findOne({ deviceid: topic });
          const cId = clusterId || device?.clusterId;

          if (cId) {
            // 1. Persist the command event for analytics (Pump/SV ON-OFF history graph)
            await db.collection('data').insertOne({
              topic,
              data: { command, state: command },
              type: 'command',
              clusterId: cId,
              _ts: Date.now(),
            });

            // 2. Update the device's status in the devices collection immediately
            await db.collection('devices').updateOne(
              { deviceid: topic },
              { $set: { status: command, _ts: Date.now() } }
            );

            logger.info(`Device '${topic}' status set to '${command}' (server-tracked)`);
          }
        } catch (dbErr) {
          logger.warn(`Failed to persist command event for '${topic}':`, dbErr);
        }

        resolve();
      });
    });
  }

  /**
   * Returns current status of the MQTT connection.
   */
  getStatus() {
    return {
      connected: this.isConnected,
      host: config.mqtt.host,
      port: config.mqtt.port,
    };
  }

  /**
   * Gracefully close the MQTT client connection.
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      logger.info('MQTT Client disconnected');
    }
  }
}

export default new MQTTService();
