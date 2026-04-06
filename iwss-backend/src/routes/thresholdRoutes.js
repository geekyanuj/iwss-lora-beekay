import express from 'express';
import thresholdController from '../controllers/thresholdController.js';

const router = express.Router();

/**
 * Safety Configuration and Threshold Management.
 */

// Global system configuration (Poll Interval)
router.get('/config/global', thresholdController.getGlobalConfig);
router.post('/config/global/update', thresholdController.updateGlobalInterval);

// Get current PM2.5 and PM10 safety limits for a cluster
router.get('/cluster/:clusterId/thresholds', thresholdController.getThresholdsByCluster);

// Update or set safety limits for specific environments
router.post('/cluster/:clusterId/update-threshold', thresholdController.updateThreshold);

export default router;
