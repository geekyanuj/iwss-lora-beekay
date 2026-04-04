import express from 'express';
import deviceController from '../controllers/deviceController.js';

const router = express.Router();

/**
 * Device Registry and Management Routes.
 * These endpoints manage device registration, status updates, and cluster grouping.
 * Supported device types: sensor, pump, sv (solenoid valve).
 */

// Get all registered devices
router.get('/devices', deviceController.getDevices);

// Get devices associated with a specific cluster
router.get('/cluster/:clusterId/devices', deviceController.getDevicesByCluster);
// Support for legacy frontend requests using 'get-devices' path
router.get('/cluster/:clusterId/get-devices', deviceController.getDevicesByCluster);

// Control device operational state (relay module for pump/sv)
router.post('/device/:deviceId/status', deviceController.updateDeviceStatus);

// Register new smart hardware to the system
router.post('/register', deviceController.registerDevice);

// Delete a registered device by deviceid (MQTT topic)
router.delete('/device/:deviceId', deviceController.deleteDevice);

export default router;
