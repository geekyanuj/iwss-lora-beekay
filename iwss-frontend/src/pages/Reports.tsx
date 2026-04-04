import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Card, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { CLUSTERS } from '../constants';
import { useToast } from '../context/ToastContext';
import { FadeIn, SlideIn } from '../components/Animations/Transitions';
import { get } from '../services';

interface TelemetryRecord {
  _ts: number;
  topic: string;
  clusterId: number;
  data: {
    pm2_5?: number;
    pm10?: number;
    [key: string]: unknown;
  };
}

interface DailyAggregation {
  date: string;
  clusterId: number;
  clusterName: string;
  recordCount: number;
  avgPM25: number;
  avgPM10: number;
  maxPM25: number;
  maxPM10: number;
  devices: Set<string>;
}

interface PaginatedResponse {
  data: TelemetryRecord[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}

const PAGE_LIMIT = 500; // Fetch enough for daily aggregation

const EnhancedReports: React.FC = () => {
  const { addToast } = useToast();

  // Filters
  const [selectedCluster, setSelectedCluster] = useState<number>(0); // 0 = all
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Tabs
  const [activeTab, setActiveTab] = useState<'daily' | 'detailed'>('daily');

  // Data
  const [allRecords, setAllRecords] = useState<TelemetryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Modal
  const [selectedDay, setSelectedDay] = useState<DailyAggregation | null>(null);
  const [showModal, setShowModal] = useState(false);

  const clusterName = (id: number) => CLUSTERS.find(c => c.id === id)?.name || `Cluster ${id}`;

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const promises = selectedCluster === 0
        ? CLUSTERS.map(c =>
            get(`cluster/${c.id}/get-data`, {
              fromTime: new Date(startDate).getTime().toString(),
              toTime: (new Date(endDate).getTime() + 86399999).toString(),
              limit: PAGE_LIMIT.toString(),
              page: page.toString(),
            }) as Promise<PaginatedResponse>
          )
        : [
            get(`cluster/${selectedCluster}/get-data`, {
              fromTime: new Date(startDate).getTime().toString(),
              toTime: (new Date(endDate).getTime() + 86399999).toString(),
              limit: PAGE_LIMIT.toString(),
              page: page.toString(),
            }) as Promise<PaginatedResponse>,
          ];

      const responses = await Promise.all(promises);
      const merged: TelemetryRecord[] = [];
      let total = 0;
      let pages = 1;

      responses.forEach(res => {
        if (res?.data) {
          merged.push(...res.data);
          total += res.totalItems || 0;
          pages = Math.max(pages, res.totalPages || 1);
        }
      });

      setAllRecords(merged);
      setTotalItems(total);
    } catch (err) {
      addToast('Failed to load reports data', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCluster, startDate, endDate, addToast]);

  useEffect(() => {
    fetchData(1);
  }, []);

  // Aggregate records by date per cluster → DailyAggregation
  const dailyAggregations = useMemo<DailyAggregation[]>(() => {
    const map = new Map<string, DailyAggregation>();

    allRecords.forEach(r => {
      const date = new Date(r._ts).toISOString().split('T')[0];
      const key = `${date}-${r.clusterId}`;

      if (!map.has(key)) {
        map.set(key, {
          date,
          clusterId: r.clusterId,
          clusterName: clusterName(r.clusterId),
          recordCount: 0,
          avgPM25: 0,
          avgPM10: 0,
          maxPM25: 0,
          maxPM10: 0,
          devices: new Set(),
        });
      }

      const agg = map.get(key)!;
      const pm25 = r.data?.pm2_5 || 0;
      const pm10 = r.data?.pm10 || 0;
      agg.recordCount++;
      agg.avgPM25 = (agg.avgPM25 * (agg.recordCount - 1) + pm25) / agg.recordCount;
      agg.avgPM10 = (agg.avgPM10 * (agg.recordCount - 1) + pm10) / agg.recordCount;
      agg.maxPM25 = Math.max(agg.maxPM25, pm25);
      agg.maxPM10 = Math.max(agg.maxPM10, pm10);
      agg.devices.add(r.topic);
    });

    return Array.from(map.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allRecords]);

  // Paginated daily records
  const DAILY_PAGE_SIZE = 15;
  const [dailyPage, setDailyPage] = useState(1);
  const pagedDailyItems = useMemo(() => {
    const start = (dailyPage - 1) * DAILY_PAGE_SIZE;
    return dailyAggregations.slice(start, start + DAILY_PAGE_SIZE);
  }, [dailyAggregations, dailyPage]);
  const dailyTotalPages = Math.ceil(dailyAggregations.length / DAILY_PAGE_SIZE);

  // Paginated raw records
  const DETAIL_PAGE_SIZE = 20;
  const [detailPage, setDetailPage] = useState(1);
  const sortedRecords = useMemo(() => [...allRecords].sort((a, b) => b._ts - a._ts), [allRecords]);
  const pagedDetailItems = useMemo(() => {
    const start = (detailPage - 1) * DETAIL_PAGE_SIZE;
    return sortedRecords.slice(start, start + DETAIL_PAGE_SIZE);
  }, [sortedRecords, detailPage]);
  const detailTotalPages = Math.ceil(sortedRecords.length / DETAIL_PAGE_SIZE);

  const pm25Badge = (val: number) => val > 150 ? 'failure' : val > 55 ? 'warning' : 'success';
  const pm10Badge = (val: number) => val > 250 ? 'failure' : val > 154 ? 'warning' : 'success';

  const exportCSV = () => {
    const rows = dailyAggregations.map(d => [
      d.date,
      d.clusterName,
      d.recordCount,
      d.avgPM25.toFixed(2),
      d.avgPM10.toFixed(2),
      d.maxPM25.toFixed(2),
      d.maxPM10.toFixed(2),
      d.devices.size,
    ]);
    const csv = [
      ['Date', 'Cluster', 'Records', 'Avg PM2.5', 'Avg PM10', 'Max PM2.5', 'Max PM10', 'Active Devices'].join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${Date.now()}.csv`;
    a.click();
    addToast('Report exported as CSV', 'success');
  };

  const exportDetailCSV = () => {
    const rows = sortedRecords.map(r => [
      new Date(r._ts).toLocaleString(),
      clusterName(r.clusterId),
      r.topic,
      (r.data?.pm2_5 || 0).toFixed(2),
      (r.data?.pm10 || 0).toFixed(2),
    ]);
    const csv = [
      ['Timestamp', 'Cluster', 'Device', 'PM2.5', 'PM10'].join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed-report-${Date.now()}.csv`;
    a.click();
    addToast('Detailed report exported', 'success');
  };

  const PaginationBar = ({
    page, total, onPageChange,
  }: { page: number; total: number; onPageChange: (p: number) => void }) => {
    if (total <= 1) return null;
    const pages = Array.from({ length: total }, (_, i) => i + 1)
      .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === total);
    return (
      <div className="flex items-center justify-center gap-1 pt-4 pb-2">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
        {pages.map((p, i, arr) => (
          <React.Fragment key={p}>
            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-300 text-xs px-1">…</span>}
            <button onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${page === p ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}>
              {p}
            </button>
          </React.Fragment>
        ))}
        <button disabled={page >= total} onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
      </div>
    );
  };

  return (
    <FadeIn className="p-4 space-y-6">
      {/* Header */}
      <SlideIn direction="down">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Reports</h1>
          <p className="text-gray-500 text-sm">All data is fetched live from the database. Use filters to scope your report.</p>
        </div>
      </SlideIn>

      {/* Tabs */}
      <SlideIn direction="left" delay={25}>
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {(['daily', 'detailed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 font-semibold text-sm border-b-2 transition-all duration-200 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab === 'daily' ? '📊 Daily Summary' : '📋 Detailed Records'}
            </button>
          ))}
        </div>
      </SlideIn>

      {/* Filters */}
      <SlideIn direction="left" delay={50}>
        <Card className="bg-white shadow-sm">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cluster</label>
                <select
                  value={selectedCluster}
                  onChange={e => setSelectedCluster(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                >
                  <option value={0}>All Clusters</option>
                  {CLUSTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => { fetchData(1); setDailyPage(1); setDetailPage(1); }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? '⏳ Loading...' : '🔍 Apply Filters'}
              </Button>
              <Button
                onClick={activeTab === 'daily' ? exportCSV : exportDetailCSV}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading || allRecords.length === 0}
              >
                📥 Export CSV
              </Button>
              <div className="flex items-center text-xs text-gray-400 ml-auto">
                <span className="font-semibold text-gray-600">{totalItems.toLocaleString()}</span>&nbsp;total records
              </div>
            </div>
          </div>
        </Card>
      </SlideIn>

      {/* Content */}
      <SlideIn direction="down" delay={100}>
        <Card className="shadow-sm overflow-hidden">
          {activeTab === 'daily' ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">
                  Daily Aggregations
                  <span className="text-sm font-normal text-gray-400 ml-2">({dailyAggregations.length} day-cluster entries)</span>
                </h3>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading data...</div>
              ) : dailyAggregations.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No data found for the selected period and cluster. Adjust your filters and try again.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeadCell>Date</TableHeadCell>
                          <TableHeadCell>Cluster</TableHeadCell>
                          <TableHeadCell>Records</TableHeadCell>
                          <TableHeadCell>Avg PM2.5</TableHeadCell>
                          <TableHeadCell>Max PM2.5</TableHeadCell>
                          <TableHeadCell>Avg PM10</TableHeadCell>
                          <TableHeadCell>Max PM10</TableHeadCell>
                          <TableHeadCell>Devices</TableHeadCell>
                          <TableHeadCell>Actions</TableHeadCell>
                        </TableRow>
                      </TableHead>
                      <TableBody className="divide-y divide-gray-100">
                        {pagedDailyItems.map(day => (
                          <TableRow key={`${day.date}-${day.clusterId}`} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                              {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell>{day.clusterName}</TableCell>
                            <TableCell>
                              <Badge color="blue">{day.recordCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge color={pm25Badge(day.avgPM25)}>{day.avgPM25.toFixed(1)} µg/m³</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge color={pm25Badge(day.maxPM25)}>{day.maxPM25.toFixed(1)} µg/m³</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge color={pm10Badge(day.avgPM10)}>{day.avgPM10.toFixed(1)} µg/m³</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge color={pm10Badge(day.maxPM10)}>{day.maxPM10.toFixed(1)} µg/m³</Badge>
                            </TableCell>
                            <TableCell>{day.devices.size}</TableCell>
                            <TableCell>
                              <Button size="xs" className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => { setSelectedDay(day); setShowModal(true); }}>
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationBar page={dailyPage} total={dailyTotalPages} onPageChange={setDailyPage} />
                </>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">
                  Individual Records
                  <span className="text-sm font-normal text-gray-400 ml-2">({allRecords.length} loaded)</span>
                </h3>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading records...</div>
              ) : sortedRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No records found. Apply filters and try again.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeadCell>#</TableHeadCell>
                          <TableHeadCell>Timestamp</TableHeadCell>
                          <TableHeadCell>Cluster</TableHeadCell>
                          <TableHeadCell>Device</TableHeadCell>
                          <TableHeadCell>PM2.5 (µg/m³)</TableHeadCell>
                          <TableHeadCell>PM10 (µg/m³)</TableHeadCell>
                          <TableHeadCell>Quality</TableHeadCell>
                        </TableRow>
                      </TableHead>
                      <TableBody className="divide-y divide-gray-100">
                        {pagedDetailItems.map((r, idx) => {
                          const pm25 = r.data?.pm2_5 || 0;
                          const pm10 = r.data?.pm10 || 0;
                          const quality = pm25 > 150 || pm10 > 250 ? 'Hazardous' : pm25 > 55 || pm10 > 154 ? 'Unhealthy' : pm25 > 35 || pm10 > 54 ? 'Moderate' : 'Good';
                          return (
                            <TableRow key={r._ts + idx} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="text-xs text-gray-400 font-mono">
                                {(detailPage - 1) * DETAIL_PAGE_SIZE + idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs whitespace-nowrap">
                                {new Date(r._ts).toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell>{clusterName(r.clusterId)}</TableCell>
                              <TableCell className="font-semibold">{r.topic}</TableCell>
                              <TableCell>
                                <Badge color={pm25Badge(pm25)}>{pm25.toFixed(2)}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge color={pm10Badge(pm10)}>{pm10.toFixed(2)}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge color={quality === 'Good' ? 'success' : quality === 'Moderate' ? 'warning' : 'failure'}>
                                  {quality}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationBar page={detailPage} total={detailTotalPages} onPageChange={setDetailPage} />
                </>
              )}
            </>
          )}
        </Card>
      </SlideIn>

      {/* Day Detail Modal */}
      <Modal show={showModal} onClose={() => { setShowModal(false); setSelectedDay(null); }} size="md">
        <ModalHeader>
          📊 {selectedDay?.date} — {selectedDay?.clusterName}
        </ModalHeader>
        <ModalBody>
          {selectedDay && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Records', value: selectedDay.recordCount, color: 'text-blue-600' },
                  { label: 'Active Devices', value: selectedDay.devices.size, color: 'text-purple-600' },
                  { label: 'Avg PM2.5', value: `${selectedDay.avgPM25.toFixed(1)} µg/m³`, color: 'text-red-600' },
                  { label: 'Avg PM10', value: `${selectedDay.avgPM10.toFixed(1)} µg/m³`, color: 'text-orange-500' },
                  { label: 'Max PM2.5', value: `${selectedDay.maxPM25.toFixed(1)} µg/m³`, color: 'text-red-800' },
                  { label: 'Max PM10', value: `${selectedDay.maxPM10.toFixed(1)} µg/m³`, color: 'text-orange-700' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Quality Assessment</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>• PM2.5 status: {selectedDay.avgPM25 < 35 ? '✅ Good' : selectedDay.avgPM25 < 55 ? '⚠️ Moderate' : '🔴 Unhealthy'}</p>
                  <p>• PM10 status: {selectedDay.avgPM10 < 54 ? '✅ Good' : selectedDay.avgPM10 < 154 ? '⚠️ Moderate' : '🔴 Unhealthy'}</p>
                  <p>• Devices active: {[...selectedDay.devices].join(', ')}</p>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-end">
          <Button className="bg-gray-600 hover:bg-gray-700" onClick={() => setShowModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </FadeIn>
  );
};

export default EnhancedReports;
