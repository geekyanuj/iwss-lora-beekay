import { getDB } from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Data Controller managing sensor readings and historical data.
 * Interacts with 'data' and 'devices' collections.
 */
class DataController {
  /**
   * Fetch sensor data with pagination and flexible filtering.
   */
  async getClusterData(req, res, next) {
    try {
      const db = getDB();
      const { clusterId } = req.params;
      const { topic, page = 1, limit = 10, type = 'telemetry', fromTime, toTime } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = { clusterId: parseInt(clusterId), type };
      if (topic) query.topic = topic;
      if (fromTime || toTime) {
        query._ts = {};
        if (fromTime) query._ts.$gte = parseInt(fromTime);
        if (toTime) query._ts.$lte = parseInt(toTime);
      }

      const results = await db
        .collection('data')
        .find(query)
        .sort({ _ts: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const totalItems = await db.collection('data').countDocuments(query);
      const totalPages = Math.ceil(totalItems / parseInt(limit));

      res.json({
        message: 'Data fetched successfully',
        data: results,
        currentPage: parseInt(page),
        totalPages,
        totalItems,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get analytics data for specific cluster, including PM trends and pump status.
   * Expects time_pm_values and time_pump_onoff in response for the frontend.
   */
  async getAnalytics(req, res, next) {
    try {
      const db = getDB();
      const { clusterId } = req.params;
      const { fromTime, toTime } = req.query;

      const query = { clusterId: parseInt(clusterId), type: 'telemetry' };
      if (fromTime || toTime) {
        query._ts = {};
        if (fromTime) query._ts.$gte = parseInt(fromTime);
        if (toTime) query._ts.$lte = parseInt(toTime);
      }

      // Fetch telemetry data (PM values)
      const telemetry = await db
        .collection('data')
        .find(query)
        .sort({ _ts: 1 })
        .toArray();

      // For pump status, we might look at both data collection (historical) or device status (current)
      // Here we assume pump status is recorded in the data collection as type: 'status' or similar
      // or we extract it from telemetry data where 'sprinkler' or 'pump' key exists

      const time_pm_values = telemetry.map(d => ({
        time: d._ts,
        pm10: d.data?.pm10 || 0,
        pm2_5: d.data?.pm2_5 || 0,
        cluster: d.clusterId,
        deviceId: d.topic
      }));

      // Find pump state changes or logged statuses
      const time_pump_onoff = telemetry.map(d => ({
        time: d._ts,
        state: d.data?.sprinkler || d.data?.pump || 'off',
        cluster: d.clusterId,
        deviceId: d.topic
      }));

      res.json({
        message: 'Analytics data fetched',
        data: {
          time_pm_values,
          time_pump_onoff
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch data formatted for the dashboard home page.
   * Includes cluster individual status (online/offline) based on a 20-second timeout.
   */
  async getHomepageData(req, res, next) {
    try {
      const db = getDB();
      const { clusterId } = req.params;

      const devices = await db.collection('devices')
        .find({ clusterId: parseInt(clusterId) })
        .toArray();

      // Find all SCU (Sensor Control Units) - excluding pumps and solenoid valves
      const scus = devices.filter(d => !d.isPump && !d.isSV);
      const rcus = devices.filter(d => d.isPump || d.isSV);

      // Fetch global config to determine appropriate offline timeout
      const configRecord = await db.collection('thresholds').findOne({ _id: 'global-config' });
      const pollInterval = configRecord?.pollInterval || 5; 
      const timeoutMs = pollInterval * 1000 * 3; // 3x buffer
      const currentTime = Date.now();

      // Get latest signal timestamps for all devices in this cluster to determine online/offline status
      const latestHeartbeats = await db.collection('data').aggregate([
        { $match: { topic: { $in: devices.map(d => d.deviceid) }, type: 'telemetry' } },
        { $group: { _id: "$topic", lastSeen: { $max: "$_ts" } } }
      ]).toArray();

      const heartbeatMap = latestHeartbeats.reduce((acc, curr) => {
        acc[curr._id] = curr.lastSeen;
        return acc;
      }, {});

      // Determine which SCUs are online and find the most descriptive latest data
      const onlineScus = scus.filter(s => {
        const lastSeen = heartbeatMap[s.deviceid] || 0;
        return (currentTime - lastSeen) < timeoutMs;
      });

      // Sort online SCUs by latest seen to pick the "best" source
      onlineScus.sort((a, b) => (heartbeatMap[b.deviceid] || 0) - (heartbeatMap[a.deviceid] || 0));

      const primaryScu = onlineScus.length > 0 ? onlineScus[0] : (scus.sort((a,b) => (b._ts || 0) - (a._ts || 0))[0] || null);
      
      let latestData = null;
      if (primaryScu) {
        latestData = await db.collection('data')
          .findOne({ topic: primaryScu.deviceid, type: 'telemetry' }, { sort: { _ts: -1 } });
      }

      const clusterIsOnline = onlineScus.length > 0;
      const lastReceivedTs = latestData?._ts || 0;

      const updatedDevices = devices.map(d => {
        const lastSeen = heartbeatMap[d.deviceid] || 0;
        const isActive = (currentTime - lastSeen) < timeoutMs;

        // For SCUs, status is simply active or not
        if (!d.isPump && !d.isSV) {
          return { ...d, status: isActive ? 'on' : 'off' };
        }
        return d;
      });

      const pumpStats = {
        on: rcus.filter(d => updatedDevices.find(ud => ud.deviceid === d.deviceid)?.status === 'on').length,
        off: rcus.filter(d => updatedDevices.find(ud => ud.deviceid === d.deviceid)?.status !== 'on').length
      };

      const scuStats = {
        on: onlineScus.length,
        off: scus.length - onlineScus.length
      };

      res.json({
        message: 'Homepage data fetched',
        data: {
          allDevices: updatedDevices,
          primaryDeviceId: primaryScu?.deviceid || null,
          disableControl: false,
          lastReceivedTs,
          isOffline: !clusterIsOnline,
          sprinkler: scuStats,
          devices: {
            sprinkler: scus.length,
            pump: rcus.length
          },
          pump: pumpStats,
          pm10: latestData?.data?.pm10 || 0,
          pm2_5: latestData?.data?.pm2_5 || 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record new telemetry or command data from sensors.
   */
  async recordData(req, res, next) {
    try {
      const db = getDB();
      const { topic, data, type = 'telemetry', clusterId } = req.body;

      if (!topic || !clusterId) {
        return res.status(400).json({ error: 'topic and clusterId are required' });
      }

      const result = await db.collection('data').insertOne({
        topic,
        data,
        type,
        clusterId: parseInt(clusterId),
        _ts: Date.now(),
      });

      res.json({ message: 'Data saved successfully', data: { _id: result.insertedId } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate synthetic sensor data for testing.
   */
  /**
   * Fetch pump and solenoid valve ON/OFF command history for analytics.
   *
   * Since pumps/SVs do NOT send feedback from the ESP32, device status is tracked
   * entirely server-side. Events are written to the data collection as type: 'command'
   * every time a command is published via MQTT (see mqttService.publishCommand).
   *
   * Fallback: if no command history exists yet, returns the current DB status of
   * each device as a single synthetic data point so the chart is never empty.
   */
  async getPumpSvStatusHistory(req, res, next) {
    try {
      const db = getDB();
      const { clusterId } = req.params;
      const { fromTime, toTime, topic, limit = 500 } = req.query;

      // Fetch controllable devices (pumps + SVs) in this cluster
      const deviceQuery = { clusterId: parseInt(clusterId), $or: [{ isPump: true }, { isSV: true }] };
      if (topic) deviceQuery.deviceid = topic;
      const controllableDevices = await db.collection('devices').find(deviceQuery).toArray();
      const deviceIds = controllableDevices.map(d => d.deviceid);

      if (deviceIds.length === 0) {
        return res.json({
          message: 'No pump/SV devices in this cluster',
          data: { events: [], devices: [] }
        });
      }

      // Query only 'command' events — these are written by publishCommand() when
      // the server sends an ON/OFF command. No device feedback is involved.
      const commandQuery = {
        clusterId: parseInt(clusterId),
        topic: topic ? topic : { $in: deviceIds },
        type: 'command',
      };

      if (fromTime || toTime) {
        commandQuery._ts = {};
        if (fromTime) commandQuery._ts.$gte = parseInt(fromTime);
        if (toTime) commandQuery._ts.$lte = parseInt(toTime);
      }

      const commandEvents = await db
        .collection('data')
        .find(commandQuery)
        .sort({ _ts: 1 })
        .limit(parseInt(limit))
        .toArray();

      const events = commandEvents.map(e => ({
        time: e._ts,
        topic: e.topic,
        state: e.data?.command || e.data?.state || 'off',
        clusterId: e.clusterId,
      }));

      res.json({
        message: 'Pump/SV command history fetched',
        data: {
          events,
          devices: controllableDevices.map(d => ({
            deviceid: d.deviceid,
            isPump: d.isPump,
            isSV: d.isSV,
            status: d.status || 'off',
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DataController();
