import { getDB } from '../config/db.js';
import mqttService from './mqttService.js';
import logger from '../utils/logger.js';

/**
 * Polling Service to handle the "Talk When Spoken To" architecture.
 * It sequentially sends a "POLL" command to ALL SCU nodes across ALL clusters.
 * 
 * To avoid LoRa congestion, it uses a single global interval to iterate through 
 * every registered sensor one by one.
 */
class PollingService {
  constructor() {
    this.intervalHandle = null;
    this.currentIndex = 0;
    this.isActive = false;
  }

  /**
   * Initializes the service and starts the global polling loop.
   */
  async start() {
    if (this.isActive) return;
    this.isActive = true;
    logger.info('Initializing System-Wide Polling Service...');
    
    // Slight delay to ensure DB and MQTT are ready
    setTimeout(() => this.startGlobalPolling(), 2000);
  }

  /**
   * Starts a single sequential polling loop for the whole system.
   */
  async startGlobalPolling() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }

    const db = getDB();
    
    // Fetch global configuration (stored in a special threshold record with id 'global')
    const config = await db.collection('thresholds').findOne({ _id: 'global-config' });
    const pollInterval = (config && config.pollInterval) ? config.pollInterval : 5; // Default 5s
    
    logger.info(`[Global Polling] Started. System interval: ${pollInterval}s`);

    this.intervalHandle = setInterval(async () => {
      // Check if MQTT Broker (Master) is available
      if (!mqttService.isConnected) {
        logger.warn('[Poll] Skipping iteration - MQTT Broker (Master) is offline.');
        return;
      }

      try {
        // Fetch ALL sensors across ALL clusters
        const sensors = await db.collection('devices').find({
          isPump: false,
          isSV: false
        }).sort({ clusterId: 1, deviceid: 1 }).toArray();

        if (sensors.length === 0) return;

        // Sequence through the list
        const index = this.currentIndex % sensors.length;
        const target = sensors[index];
        
        // Topic: factory/req/<NodeID>
        const topic = `factory/req/${target.deviceid}`;

        // Send POLL command
        mqttService.publishRaw(topic, "POLL");
        
        logger.debug(`[Poll] ${target.deviceName || target.deviceid} (Cluster ${target.clusterId}) -> POLL`);
        
        this.currentIndex++;
      } catch (err) {
        logger.error('Global Polling iteration error:', err);
      }
    }, pollInterval * 1000);
  }

  /**
   * Forces a refresh of the polling loop (e.g. when interval is updated).
   */
  async refresh() {
    logger.info('Refreshing Global Polling configuration...');
    await this.startGlobalPolling();
  }

  /**
   * No-op for compatibility with mqttService calls that were used for priority.
   * Priority mode is now handled manually or ignored for "all-flow" polling.
   */
  setPriorityMode(clusterId, status) {
    // Polling now continues regardless of priority to avoid blocking other nodes.
    if (status) {
      logger.info(`[Alert] High levels reported in Cluster ${clusterId}. (Loop continues)`);
    }
  }

  /**
   * Stops the polling loop.
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isActive = false;
    logger.info('Polling Service stopped.');
  }
}

export default new PollingService();
