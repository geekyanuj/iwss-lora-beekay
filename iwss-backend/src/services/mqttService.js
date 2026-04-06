import mqtt from 'mqtt';
import { config } from '../config/env.js';
import { getDB } from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Service to manage MQTT broker connection and data ingestion.
 * 
 * Scalability & Robustness Updates:
 * - Priority Queue: Sequential command delivery with 2s delay.
 * - Feedback Verification: Tracks RCU state via 'STATE:ON/OFF' feedback.
 * - Collision Avoidance: Ensures only one transmission happens at a time.
 */

// Command Priorities
const PRIORITY = {
  MANUAL: 1,      // Highest: User clicks ON/OFF in dashboard
  THRESHOLD: 2,   // High: Automatic actuation based on PM levels
  POLL: 3         // Normal: Regular status/data polling
};

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.commandQueue = [];
    this.isProcessing = false;
    this.lastTransmitted = 0;
    this.pendingFeedback = new Map(); // key: deviceId, val: { command, ts, retryCount }
    this.INTER_COMMAND_DELAY = 1500; // 1.5 seconds minimum between transmissions
  }

  /**
   * Initializes the MQTT connection and starts the queue worker.
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
      logger.info(`Connected to MQTT Broker. Initializing command worker...`);
      this.client.subscribe('#');
    });

    this.client.on('message', async (topic, message) => {
      try {
        const messageStr = message.toString().trim();
        const db = getDB();

        // 1. Handle Master Data & Feedback Topic: factory/data/<SenderID>
        if (topic.startsWith('factory/data/')) {
          const deviceId = topic.split('/').pop();

          // Check if it's Feedback (e.g. "STATE:ON" or "STATE:OFF")
          if (messageStr.startsWith("STATE:")) {
            const stateValue = messageStr.split(':')[1].toLowerCase(); // "on" or "off"
            await this._handleFeedback(deviceId, stateValue);
            return;
          }

          // Otherwise, it's Sensor Telemetry (PM data)
          const parts = messageStr.split(',');
          let pm2_5, pm10;

          if (parts.length === 1) {
            pm2_5 = parseFloat(parts[0]);
            pm10 = pm2_5;
          } else {
            pm2_5 = parseFloat(parts[0]);
            pm10 = parseFloat(parts[1]);
          }

          if (!isNaN(pm2_5)) {
            await this._handleTelemetry(deviceId, pm2_5, pm10, messageStr);
          }
        }
      } catch (error) {
        logger.error(`MQTT: Error processing message on ${topic}:`, error);
      }
    });

    this.client.on('close', () => { this.isConnected = false; });
    this.client.on('error', (err) => { this.isConnected = false; logger.error('MQTT Client Error:', err); });

    // Start background worker for priority queue processing
    this._startQueueWorker();
    
    // Start background worker for feedback monitoring (retries)
    this._startFeedbackMonitor();
  }

  /**
   * Monitor for missing feedback and Offline Status.
   */
  _startFeedbackMonitor() {
    setInterval(async () => {
      const now = Date.now();
      const TIMEOUT = 15000;
      const MAX_RETRIES = 2;
      const db = getDB();

      // Part 1: Handle pending command feedback retries
      for (const [deviceId, pending] of this.pendingFeedback.entries()) {
        if (now - pending.ts > TIMEOUT) {
          if (pending.retry < MAX_RETRIES) {
            logger.warn(`Verification: Timeout for '${deviceId}'. Retrying (${pending.retry + 1}/${MAX_RETRIES})...`);
            this.enqueue(deviceId, pending.payload, PRIORITY.MANUAL);
            pending.ts = now;
            pending.retry++;
          } else {
            logger.error(`Verification: FAILED for '${deviceId}' after ${MAX_RETRIES} retries.`);
            this.pendingFeedback.delete(deviceId);
          }
        }
      }

      // Part 2: Global Offline Monitoring (30-second heart-beat)
      const OFFLINE_THRESHOLD = 30000;
      await db.collection('devices').updateMany(
        { 
          lastSeen: { $lt: now - OFFLINE_THRESHOLD },
          online: { $ne: false } // Only update if currently online
        },
        { $set: { online: false, status: 'offline' } }
      );
    }, 5000); // Check every 5 seconds
  }

  /**
   * Worker to process the command queue sequentially with delays.
   */
  _startQueueWorker() {
    setInterval(async () => {
      if (this.isProcessing || this.commandQueue.length === 0 || !this.isConnected) return;
      
      const now = Date.now();
      if (now - this.lastTransmitted < this.INTER_COMMAND_DELAY) return;

      this.isProcessing = true;
      
      // Sort by priority (ascending, 1 is highest)
      this.commandQueue.sort((a, b) => a.priority - b.priority);
      const task = this.commandQueue.shift();

      try {
        await this._transmitNow(task.topic, task.command);
        this.lastTransmitted = Date.now();
      } catch (err) {
        logger.error(`Queue: Transmission failed for ${task.topic}`, err);
      } finally {
        this.isProcessing = false;
      }
    }, 500); // Check every 500ms
  }

  /**
   * Internal telemetry handler.
   */
  async _handleTelemetry(deviceId, pm2_5, pm10, raw) {
    const db = getDB();
    const device = await db.collection('devices').findOne({ deviceid: deviceId });
    if (!device) return;

    // Save data and mark as ONLINE (lastSeen heartbeat)
    await db.collection('data').insertOne({
      topic: deviceId,
      data: { pm2_5, pm10 },
      type: 'telemetry',
      clusterId: device.clusterId,
      _ts: Date.now(),
    });

    await db.collection('devices').updateOne(
      { deviceid: deviceId },
      { $set: { lastSeen: Date.now(), online: true } }
    );

    // Run threshold logic
    await this._checkThresholdAndQueueActuation(deviceId, device.clusterId, pm2_5, pm10);
  }

  /**
   * Internal feedback handler.
   * Updates state to VERIFIED.
   */
  async _handleFeedback(deviceId, state) {
    const db = getDB();
    logger.info(`Verification: Device '${deviceId}' confirmed state: ${state.toUpperCase()}`);
    
    this.pendingFeedback.delete(deviceId);

    // Update DB status with verification timestamp and lastSeen
    await db.collection('devices').updateOne(
      { deviceid: deviceId },
      { $set: { status: state, verifiedAt: Date.now(), lastSeen: Date.now(), online: true } }
    );

    // Save as command event (historical log)
    await db.collection('data').insertOne({
      topic: deviceId,
      data: { command: 'feedback', state },
      type: 'feedback',
      clusterId: (await db.collection('devices').findOne({ deviceid: deviceId }))?.clusterId,
      _ts: Date.now()
    });
  }

  /**
   * Revised Auto-Actuation: Queues commands for all mapped RCUs and cluster-wide RCUs.
   */
  async _checkThresholdAndQueueActuation(sensorId, clusterId, pm2_5, pm10) {
    const db = getDB();
    const thresholdRecord = await db.collection('thresholds').findOne({ _id: `threshold-${clusterId}` });
    
    const limit25 = thresholdRecord?.pm2_5 ?? 100;
    const limit10 = thresholdRecord?.pm10 ?? 100;

    const shouldBeOn = pm2_5 > limit25 || pm10 > limit10;
    const targetCommand = shouldBeOn ? 'on' : 'off';

    // 1. Get devices specifically mapped to this sensor
    const sensor = await db.collection('devices').findOne({ deviceid: sensorId });
    const mappedIds = sensor?.mappedDeviceIds || [];

    // 2. Get all controllable devices in the cluster (for fallback/cluster-wide control)
    const clusterDevices = await db.collection('devices').find({
      clusterId: parseInt(clusterId),
      $or: [{ isPump: true }, { isSV: true }]
    }).toArray();

    // Combine targets (Union)
    const targetDevices = new Set([...mappedIds]);
    clusterDevices.forEach(d => targetDevices.add(d.deviceid));

    // Queue commands
    for (const deviceId of targetDevices) {
      const device = await db.collection('devices').findOne({ deviceid: deviceId });
      if (device && device.status !== targetCommand) {
        this.enqueue(deviceId, targetCommand, PRIORITY.THRESHOLD);
      }
    }
  }

  /**
   * Enqueue a command to be sent to a device.
   */
  enqueue(topic, command, priority = PRIORITY.MANUAL) {
    // Avoid redundant commands in queue
    const exists = this.commandQueue.find(q => q.topic === topic && q.command === command);
    if (exists) return;

    logger.info(`Queue: Enqueued [${priority===1?'MANUAL':priority===2?'AUTO':'POLL'}] command '${command}' for '${topic}'`);
    this.commandQueue.push({ topic, command, priority, timestamp: Date.now() });
  }

  /**
   * Implementation for manual dashboard control.
   */
  async publishCommand(topic, command) {
    // Topic for Manual Command must follow Master Node request format: factory/req/<NodeID>
    const fullTopic = topic.startsWith('factory/') ? topic : `factory/req/${topic}`;
    this.enqueue(fullTopic, command, PRIORITY.MANUAL);
    return true; 
  }

  /**
   * Polling service wrapper.
   */
  async publishRaw(topic, message) {
    // Ensure correct routing topic
    const fullTopic = topic.startsWith('factory/') ? topic : `factory/req/${topic}`;
    this.enqueue(fullTopic, message, PRIORITY.POLL);
  }

  /**
   * Actual transmission to MQTT.
   */
  async _transmitNow(topic, payload) {
    if (!this.isConnected || !this.client) return;
    
    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) return reject(err);
        logger.info(`MQTT: Sent '${payload}' -> '${topic}' (Waiting for Feedback)`);
        
        // Track for verification in-memory only (Retries handle errors)
        this.pendingFeedback.set(topic, { payload, ts: Date.now(), retry: 0 });
        
        // Removed optimistic DB status update - status now only changes on verified feedback.
        resolve();
      });
    });
  }

  getStatus() {
    return {
      connected: this.isConnected,
      queueSize: this.commandQueue.length,
      pendingVerification: this.pendingFeedback.size
    };
  }

  disconnect() {
    if (this.client) this.client.end();
    this.isConnected = false;
  }
}

export default new MQTTService();
