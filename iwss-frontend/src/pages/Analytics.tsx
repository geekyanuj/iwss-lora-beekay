import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Spinner } from 'flowbite-react';
import Chart from 'react-apexcharts';
import { CLUSTERS } from '../constants';
import { get } from '../services';
import { useToast } from '../context/ToastContext';
import { FadeIn, SlideIn } from '../components/Animations/Transitions';

type MetricTab = 'pm25' | 'pm10' | 'both';

interface TelemetryRecord {
  _ts: number;
  topic: string;
  data: {
    pm2_5?: number;
    pm10?: number;
    [key: string]: unknown;
  };
  clusterId: number;
}

interface PumpSvEvent {
  time: number;
  topic: string;
  state: string;
  clusterId: number;
}

interface PumpSvDevice {
  deviceid: string;
  isPump: boolean;
  isSV: boolean;
  status: string;
}

interface PaginatedResponse {
  data: TelemetryRecord[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}

interface PumpSvHistoryResponse {
  data: {
    events: PumpSvEvent[];
    devices: PumpSvDevice[];
  };
}

const PAGE_SIZE = 200;
const REALTIME_INTERVAL_MS = 5000; // 5-second real-time refresh

const EnhancedAnalytics: React.FC = () => {
  const { addToast } = useToast();

  // --- Sensor Analytics filters ---
  const [selectedCluster, setSelectedCluster] = useState<number>(CLUSTERS[0]?.id || 1);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('00:00');
  const [endTime, setEndTime] = useState<string>('23:59');
  const [activeTab, setActiveTab] = useState<MetricTab>('both');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Sensor data state
  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Table pagination
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 20;

  // --- Pump/SV ON-OFF Graph state ---
  const [pumpSvEvents, setPumpSvEvents] = useState<PumpSvEvent[]>([]);
  const [pumpSvDevices, setPumpSvDevices] = useState<PumpSvDevice[]>([]);
  const [pumpSvLoading, setPumpSvLoading] = useState(false);
  const [selectedPumpDevice, setSelectedPumpDevice] = useState<string>(''); // filter by device
  const [pumpSvCluster, setPumpSvCluster] = useState<number>(CLUSTERS[0]?.id || 1);
  const [pumpSvStartDate, setPumpSvStartDate] = useState<string>(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [pumpSvEndDate, setPumpSvEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [realtimeActive, setRealtimeActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const realtimeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const toTimestamp = (dateStr: string, timeStr: string) => {
    return new Date(`${dateStr}T${timeStr}:00`).getTime();
  };

  // ─── Sensor data fetch ───
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const fromTs = toTimestamp(startDate, startTime);
      const toTs = toTimestamp(endDate, endTime);

      const params: Record<string, string> = {
        fromTime: fromTs.toString(),
        toTime: toTs.toString(),
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
      };
      if (selectedTopic) params.topic = selectedTopic;

      const res = await get(`cluster/${selectedCluster}/get-data`, params) as PaginatedResponse;
      if (res?.data) {
        setRecords(res.data);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.totalItems || 0);
        setCurrentPage(res.currentPage || 1);

        const uniqueTopics = [...new Set(res.data.map(r => r.topic))];
        setTopics(prev => [...new Set([...prev, ...uniqueTopics])]);
        setTablePage(1);
      }
    } catch (err) {
      addToast('Failed to load analytics data', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCluster, startDate, endDate, startTime, endTime, selectedTopic, addToast]);

  useEffect(() => {
    fetchData(1);
  }, [selectedCluster]);

  // ─── Pump/SV History fetch ───
  const fetchPumpSvHistory = useCallback(async () => {
    setPumpSvLoading(true);
    try {
      const fromTs = new Date(`${pumpSvStartDate}T00:00:00`).getTime();
      const toTs = new Date(`${pumpSvEndDate}T23:59:59`).getTime();

      const params: Record<string, string> = {
        fromTime: fromTs.toString(),
        toTime: toTs.toString(),
        limit: '500',
      };
      if (selectedPumpDevice) params.topic = selectedPumpDevice;

      const res = await get(`cluster/${pumpSvCluster}/pump-sv-history`, params) as PumpSvHistoryResponse;
      if (res?.data) {
        setPumpSvEvents(res.data.events || []);
        setPumpSvDevices(res.data.devices || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load pump/SV history', err);
    } finally {
      setPumpSvLoading(false);
    }
  }, [pumpSvCluster, pumpSvStartDate, pumpSvEndDate, selectedPumpDevice]);

  // Initial fetch
  useEffect(() => {
    fetchPumpSvHistory();
  }, [pumpSvCluster]);

  // Real-time auto-refresh every 5 seconds
  useEffect(() => {
    if (realtimeTimer.current) clearInterval(realtimeTimer.current);
    
    if (realtimeActive) {
      realtimeTimer.current = setInterval(() => {
        fetchPumpSvHistory();
      }, REALTIME_INTERVAL_MS);
    }

    return () => {
      if (realtimeTimer.current) clearInterval(realtimeTimer.current);
    };
  }, [realtimeActive, fetchPumpSvHistory]);

  // ─── Sensor stats ───
  const stats = useMemo(() => {
    const pm25Values = records.map(r => r.data?.pm2_5 || 0).filter(v => v > 0);
    const pm10Values = records.map(r => r.data?.pm10 || 0).filter(v => v > 0);
    const calcStats = (vals: number[]) => vals.length > 0
      ? {
          min: Math.round(Math.min(...vals) * 100) / 100,
          max: Math.round(Math.max(...vals) * 100) / 100,
          avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
          latest: Math.round((vals[vals.length - 1] || 0) * 100) / 100,
        }
      : { min: 0, max: 0, avg: 0, latest: 0 };

    return { pm25: calcStats(pm25Values), pm10: calcStats(pm10Values) };
  }, [records]);

  // ─── Sensor chart ───
  const chartSeries = useMemo(() => {
    const sorted = [...records].sort((a, b) => a._ts - b._ts);
    const timestamps = sorted.map(r =>
      new Date(r._ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    );

    const series: { name: string; data: number[]; color: string }[] = [];
    if (activeTab === 'pm25' || activeTab === 'both') {
      series.push({
        name: 'PM2.5 (µg/m³)',
        color: '#ef4444',
        data: sorted.map(r => Math.round((r.data?.pm2_5 || 0) * 100) / 100),
      });
    }
    if (activeTab === 'pm10' || activeTab === 'both') {
      series.push({
        name: 'PM10 (µg/m³)',
        color: '#f59e0b',
        data: sorted.map(r => Math.round((r.data?.pm10 || 0) * 100) / 100),
      });
    }
    return { series, timestamps };
  }, [records, activeTab]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'area' as const,
      toolbar: { show: true },
      background: 'transparent',
      foreColor: '#4b5563',
      zoom: { enabled: true },
      animations: { enabled: false },
    },
    stroke: { curve: 'smooth' as const, width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
    grid: { borderColor: '#e5e7eb' },
    dataLabels: { enabled: false },
    tooltip: { theme: 'light' as const, x: { show: true } },
    xaxis: {
      categories: chartSeries.timestamps,
      labels: {
        rotate: -30,
        style: { fontSize: '10px' },
        formatter: (_: string, index: number) => {
          const step = Math.ceil(chartSeries.timestamps.length / 20);
          return index % step === 0 ? chartSeries.timestamps[index] : '';
        },
      },
      tickAmount: 20,
    },
    yaxis: {
      labels: { formatter: (v: number) => `${v.toFixed(1)}` },
    },
    colors: chartSeries.series.map(s => s.color),
    legend: { position: 'top' as const, horizontalAlign: 'left' as const },
  }), [chartSeries]);

  // ─── Pump/SV chart data ───
  const pumpSvChartData = useMemo(() => {
    if (pumpSvEvents.length === 0) return { series: [], categories: [] };

    // Get unique devices from events
    const uniqueDevices = [...new Set(pumpSvEvents.map(e => e.topic))];

    // Build a step-line series per device
    const series = uniqueDevices.map((deviceId, colorIdx) => {
      const deviceEvents = pumpSvEvents
        .filter(e => e.topic === deviceId)
        .sort((a, b) => a.time - b.time);

      const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
      const color = COLORS[colorIdx % COLORS.length];

      const data = deviceEvents.map(e => ({
        x: new Date(e.time).getTime(),
        y: e.state === 'on' ? 1 : 0,
      }));

      return { name: deviceId, data, color };
    });

    return { series, categories: [] };
  }, [pumpSvEvents]);

  const pumpSvChartOptions = useMemo(() => ({
    chart: {
      type: 'line' as const,
      toolbar: { show: true },
      background: 'transparent',
      foreColor: '#4b5563',
      zoom: { enabled: true, type: 'x' as const },
      animations: {
        enabled: true,
        easing: 'linear' as const,
        speed: 300,
        animateGradually: { enabled: false },
        dynamicAnimation: { enabled: true, speed: 300 },
      },
    },
    stroke: {
      curve: 'stepline' as const,
      width: 3,
    },
    fill: { opacity: 1 },
    grid: { borderColor: '#e5e7eb' },
    dataLabels: { enabled: false },
    tooltip: {
      theme: 'light' as const,
      x: { format: 'dd MMM HH:mm:ss' },
      y: {
        formatter: (val: number) => val === 1 ? '🟢 ON' : '🔴 OFF',
      },
    },
    xaxis: {
      type: 'datetime' as const,
      labels: {
        datetimeUTC: false,
        style: { fontSize: '10px' },
      },
    },
    yaxis: {
      min: -0.1,
      max: 1.1,
      tickAmount: 1,
      labels: {
        formatter: (val: number) => {
          if (Math.round(val) === 1) return 'ON';
          if (Math.round(val) === 0) return 'OFF';
          return '';
        },
        style: { fontWeight: 600 },
      },
    },
    colors: pumpSvChartData.series.map(s => s.color),
    legend: { position: 'top' as const, horizontalAlign: 'left' as const },
    markers: {
      size: 4,
      strokeWidth: 0,
      hover: { size: 6 },
    },
  }), [pumpSvChartData]);

  const exportCSV = () => {
    if (records.length === 0) return;
    const rows = [...records]
      .sort((a, b) => a._ts - b._ts)
      .map(r => [
        new Date(r._ts).toLocaleString(),
        r.topic,
        r.data?.pm2_5?.toFixed(2) || 0,
        r.data?.pm10?.toFixed(2) || 0,
      ]);
    const csv = [
      ['Timestamp', 'Device ID', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)'].join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-cluster${selectedCluster}-${Date.now()}.csv`;
    a.click();
    addToast('CSV exported successfully', 'success');
  };

  // Table data
  const sortedRecords = useMemo(() => [...records].sort((a, b) => b._ts - a._ts), [records]);
  const tableRecords = sortedRecords.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
  const tableTotalPages = Math.ceil(sortedRecords.length / TABLE_PAGE_SIZE);

  const statCards = [
    { label: 'PM2.5 Min', value: stats.pm25.min, unit: 'µg/m³', color: 'blue' },
    { label: 'PM2.5 Max', value: stats.pm25.max, unit: 'µg/m³', color: 'red' },
    { label: 'PM2.5 Avg', value: stats.pm25.avg, unit: 'µg/m³', color: 'green' },
    { label: 'PM10 Avg', value: stats.pm10.avg, unit: 'µg/m³', color: 'yellow' },
  ];

  const svCount = pumpSvDevices.filter(d => d.isSV).length;
  const pumpCount = pumpSvDevices.filter(d => d.isPump).length;
  const onlineCount = pumpSvDevices.filter(d => d.status === 'on').length;

  return (
    <FadeIn className="space-y-6">
      {/* Header */}
      <SlideIn direction="down">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Advanced Analytics</h1>
          <p className="text-gray-500 text-sm">Real-time and historical air quality trends + pump/SV status history.</p>
        </div>
      </SlideIn>

      {/* ═══════════════════════════════════════════════════════
          PUMP / SOLENOID VALVE ON-OFF vs TIME GRAPH (Real-time)
          ═══════════════════════════════════════════════════════ */}
      <SlideIn direction="up" delay={30}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">⚡</div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Pump & Solenoid Valve — ON/OFF Timeline</h3>
                  <p className="text-xs text-gray-400">Real-time status tracking · Updates every 5 seconds</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Realtime indicator */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  realtimeActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${realtimeActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  {realtimeActive ? 'Live' : 'Paused'}
                </div>
                {lastUpdated && (
                  <span className="text-xs text-gray-400">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={() => setRealtimeActive(v => !v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    realtimeActive
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {realtimeActive ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button
                  onClick={fetchPumpSvHistory}
                  disabled={pumpSvLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {pumpSvLoading ? <Spinner size="xs" /> : '↻ Refresh'}
                </button>
              </div>
            </div>

            {/* Pump/SV Graph Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cluster */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cluster</label>
                <select
                  value={pumpSvCluster}
                  onChange={e => {
                    setPumpSvCluster(parseInt(e.target.value));
                    setSelectedPumpDevice('');
                    setPumpSvDevices([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {CLUSTERS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Device filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Device</label>
                <select
                  value={selectedPumpDevice}
                  onChange={e => setSelectedPumpDevice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">All Pumps & SVs</option>
                  {pumpSvDevices.map(d => (
                    <option key={d.deviceid} value={d.deviceid}>
                      {d.isSV ? '🔧' : '💧'} {d.deviceid}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date</label>
                <input
                  type="date"
                  value={pumpSvStartDate}
                  onChange={e => setPumpSvStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date</label>
                <input
                  type="date"
                  value={pumpSvEndDate}
                  onChange={e => setPumpSvEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Filter Apply */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <button
                onClick={fetchPumpSvHistory}
                disabled={pumpSvLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {pumpSvLoading ? <Spinner size="sm" /> : '🔍'} Apply Filters
              </button>
              <button
                onClick={() => {
                  setPumpSvStartDate(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                  setPumpSvEndDate(new Date().toISOString().split('T')[0]);
                  setSelectedPumpDevice('');
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                ↺ Reset
              </button>

              {/* Device Summary Pills */}
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {pumpCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                    💧 {pumpCount} Pump{pumpCount !== 1 ? 's' : ''}
                  </span>
                )}
                {svCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                    🔧 {svCount} SV{svCount !== 1 ? 's' : ''}
                  </span>
                )}
                {onlineCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    🟢 {onlineCount} ON
                  </span>
                )}
                <span className="text-xs text-gray-400">{pumpSvEvents.length} events</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="p-6">
            {pumpSvLoading ? (
              <div className="flex flex-col justify-center items-center h-56 space-y-3">
                <Spinner size="xl" />
                <p className="text-gray-500 text-sm animate-pulse">Fetching pump/SV status history...</p>
              </div>
            ) : pumpSvChartData.series.length > 0 ? (
              <Chart
                key={`pumpsv-${pumpSvCluster}-${selectedPumpDevice}`}
                options={pumpSvChartOptions}
                series={pumpSvChartData.series.map(s => ({ name: s.name, data: s.data, color: s.color }))}
                type="line"
                height={300}
              />
            ) : (
              <div className="flex flex-col justify-center items-center h-56 text-gray-400 gap-3">
                <span className="text-5xl">⚡</span>
                <p className="text-sm font-medium">No pump/SV events found</p>
                <p className="text-xs text-gray-400 text-center">
                  Register pump or solenoid valve devices and send ON/OFF commands to see the timeline.
                  <br />Data refreshes automatically every 5 seconds.
                </p>
              </div>
            )}
          </div>

          {/* Current Device Status Table */}
          {pumpSvDevices.length > 0 && (
            <div className="border-t border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Current Device Status</p>
              <div className="flex flex-wrap gap-2">
                {pumpSvDevices.map(d => (
                  <div key={d.deviceid} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
                    d.status === 'on' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <span>{d.isSV ? '🔧' : '💧'}</span>
                    <span className="font-mono">{d.deviceid}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      d.status === 'on' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {d.status || 'off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SlideIn>

      {/* ═════════════════════════════
          AIR QUALITY (SENSOR) SECTION
          ═════════════════════════════ */}
      <SlideIn direction="left" delay={50}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Air Quality Filters & Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
            {/* Cluster */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cluster</label>
              <select
                value={selectedCluster}
                onChange={e => { setSelectedCluster(parseInt(e.target.value)); setSelectedTopic(''); setTopics([]); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {CLUSTERS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Device */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Device</label>
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">All Devices</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => fetchData(1)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {loading ? <Spinner size="sm" /> : '🔍'} Apply Filters
            </button>
            <button
              onClick={() => {
                setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
                setStartTime('00:00');
                setEndTime('23:59');
                setSelectedTopic('');
              }}
              className="px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              ↺ Reset
            </button>
            <button
              onClick={exportCSV}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              📥 Export CSV
            </button>
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
              <span className="font-semibold text-gray-600">{totalItems.toLocaleString()}</span> total records in range
              {totalItems > PAGE_SIZE && (
                <span className="text-orange-500 font-medium">(showing latest {PAGE_SIZE})</span>
              )}
            </div>
          </div>
        </div>
      </SlideIn>

      {/* Metric Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['both', 'pm25', 'pm10'] as MetricTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab === 'both' ? 'PM2.5 + PM10' : tab === 'pm25' ? 'PM2.5' : 'PM10'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <SlideIn key={stat.label} direction="up" delay={idx * 50}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value}
                <span className="text-xs font-normal text-gray-500 ml-1">{stat.unit}</span>
              </p>
            </div>
          </SlideIn>
        ))}
      </div>

      {/* Air Quality Chart */}
      <SlideIn direction="down" delay={100}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">Air Quality Trend</h3>
            <span className="text-xs text-gray-400">{records.length} data points rendered</span>
          </div>
          {loading ? (
            <div className="flex flex-col justify-center items-center h-80 space-y-3">
              <Spinner size="xl" />
              <p className="text-gray-500 text-sm animate-pulse">Fetching data from database...</p>
            </div>
          ) : records.length > 0 ? (
            <Chart
              options={chartOptions}
              series={chartSeries.series}
              type="area"
              height={380}
            />
          ) : (
            <div className="flex justify-center items-center h-80 text-gray-400 flex-col gap-2">
              <span className="text-4xl">📭</span>
              <p className="text-sm">No data found for the selected filters</p>
              <p className="text-xs text-gray-400">Try adjusting the date range or cluster</p>
            </div>
          )}
        </div>
      </SlideIn>

      {/* Raw Data Table */}
      <SlideIn direction="down" delay={150}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-800">Raw Telemetry Records</h3>
              <p className="text-xs text-gray-400 mt-0.5">{records.length} records loaded · Page {tablePage} of {tableTotalPages}</p>
            </div>
            {/* Server-side page navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>DB Page:</span>
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => fetchData(currentPage - 1)}
                  className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                >←</button>
                <span className="font-semibold">{currentPage} / {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => fetchData(currentPage + 1)}
                  className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                >→</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">#</th>
                  <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold">Device</th>
                  <th className="text-left px-4 py-3 font-semibold">PM2.5 (µg/m³)</th>
                  <th className="text-left px-4 py-3 font-semibold">PM10 (µg/m³)</th>
                  <th className="text-left px-4 py-3 font-semibold">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : tableRecords.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No records to show</td></tr>
                ) : (
                  tableRecords.map((r, idx) => {
                    const pm25 = r.data?.pm2_5 || 0;
                    const pm10 = r.data?.pm10 || 0;
                    const quality = pm25 > 150 || pm10 > 250 ? 'Hazardous' : pm25 > 55 || pm10 > 154 ? 'Unhealthy' : pm25 > 35 || pm10 > 54 ? 'Moderate' : 'Good';
                    const qualityColor = quality === 'Good' ? 'bg-green-100 text-green-700' : quality === 'Moderate' ? 'bg-yellow-100 text-yellow-700' : quality === 'Unhealthy' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                    return (
                      <tr key={r._ts + idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{(tablePage - 1) * TABLE_PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{new Date(r._ts).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{r.topic}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${pm25 > 35 ? 'text-red-600' : 'text-green-600'}`}>{pm25.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${pm10 > 54 ? 'text-orange-500' : 'text-green-600'}`}>{pm10.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${qualityColor}`}>{quality}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Client-side table pagination */}
          {tableTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
              <button
                disabled={tablePage <= 1}
                onClick={() => setTablePage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-medium border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: tableTotalPages }, (_, i) => i + 1).filter(p => Math.abs(p - tablePage) <= 2 || p === 1 || p === tableTotalPages).map((p, i, arr) => (
                <React.Fragment key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-400">…</span>}
                  <button
                    onClick={() => setTablePage(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tablePage === p ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
              <button
                disabled={tablePage >= tableTotalPages}
                onClick={() => setTablePage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-medium border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </SlideIn>
    </FadeIn>
  );
};

export default EnhancedAnalytics;
