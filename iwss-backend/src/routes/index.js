import express from 'express';
import deviceRoutes from './deviceRoutes.js';
import dataRoutes from './dataRoutes.js';
import thresholdRoutes from './thresholdRoutes.js';

const router = express.Router();

/**
 * Root Router for IWSS API.
 * Consolidates modular routes from various sub-resources.
 * 
 * Each module handles its own resource pathing to maintain clean separation.
 */

import mqttService from '../services/mqttService.js';

// Basic health check for production monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'IWSS API Server reached correctly',
    mqtt: mqttService.getStatus()
  });
});

/**
 * Resource Routes
 * Mounted at the root level of /api/ to match frontend expectations.
 */
router.use('/', deviceRoutes);
router.use('/', dataRoutes);
router.use('/', thresholdRoutes);

/**
 * Send MQTT command to a pump or solenoid valve device.
 * The topic must match the device ID registered in the ESP32.
 * Command is published to the device's relay module topic.
 * The event is persisted to DB for pump/SV ON-OFF analytics tracking.
 */
router.post('/send-command', async (req, res) => {
  const { topic, command } = req.body;

  if (!topic || !command) {
    return res.status(400).json({ error: 'topic and command are required' });
  }

  if (!['on', 'off'].includes(command.toLowerCase())) {
    return res.status(400).json({ error: "command must be 'on' or 'off'" });
  }

  try {
    await mqttService.publishCommand(topic, command.toLowerCase());
    res.json({ 
      message: `Command '${command}' sent to '${topic}' successfully`,
      topic,
      command 
    });
  } catch (error) {
    res.status(503).json({ 
      error: 'Failed to send command. MQTT broker may be offline.',
      detail: error.message 
    });
  }
});

export default router;
