import express from 'express';
import dataController from '../controllers/dataController.js';

const router = express.Router();

/**
 * Sensor Telemetry and Analytics Data Routes.
 * Provides historical readings and real-time dashboard data for the frontend.
 */

// Fetch historical telemetry with optional pagination
router.get('/cluster/:clusterId/get-data', dataController.getClusterData);

// Fetch time-series data for analytics charts
router.get('/cluster/:clusterId/analytics', dataController.getAnalytics);

// Fetch current dashboard summary for a specific cluster
router.get('/cluster/:clusterId/home-page-data', dataController.getHomepageData);

// Record incoming telemetry from devices
router.post('/data', dataController.recordData);


// Fetch pump/SV ON-OFF status history for analytics graph (real-time with 5s refresh)
router.get('/cluster/:clusterId/pump-sv-history', dataController.getPumpSvStatusHistory);

export default router;
