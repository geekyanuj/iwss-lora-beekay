import { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { Datepicker } from "flowbite-react";
import {
  fetchPMDataByCluster,
  type PMDataType,
  type PumpDataType,
  type RawData,
  type TimePMValue,
  type TimePumpStatus,
} from "./services/apiService.ts";
import { FadeIn, SlideIn } from "./components/Animations/Transitions.tsx";

function jsonToCsv(jsonData: TimePMValue[] | TimePumpStatus[]): string {
  if (!jsonData || jsonData.length === 0) return "";
  const headers: string[] = Object.keys(jsonData[0]);
  const replacer = (_: unknown, value: any) => value === null ? "" : value;
  const csvRows = jsonData.map((row: any) =>
    headers.map((fieldName: string) => JSON.stringify(row[fieldName], replacer)).join(",")
  );
  csvRows.unshift(headers.join(","));
  return csvRows.join("\r\n");
}

function downloadCsv(csvString: string, filename = "data.csv") {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function get30minAgoTimeString(): string {
  const date = new Date();
  date.setTime(date.getTime() - 30 * 60 * 1000);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function addTimeStringToDate(baseDate: Date, timeString: string) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const newDate = new Date(baseDate);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

export default function AnalyticsData() {
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [fromTime, setFromTime] = useState<string>(get30minAgoTimeString());
  const [toTime, setToTime] = useState<string>("23:59");
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [pmData, setPmData] = useState<PMDataType | null>(null);
  const [pumpData, setPumpData] = useState<PumpDataType>({ time: [], status: [] });
  const [selectedCluster, setSelectedCluster] = useState<number>(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const start = new Date();
    start.setTime(start.getTime() - 30 * 60 * 1000);
    const end = new Date();
    end.setHours(23, 59, 0, 0);
    loadAllData(start, end);
  }, [selectedCluster]);

  const loadAllData = async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const data = await fetchPMDataByCluster(selectedCluster, start, end);
      setRawData(data.rawData);
      setPmData(data.timePM);
      setPumpData(data.pumpStatus);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartThemeOptions = useMemo(() => ({
    theme: { mode: 'light' as const },
    chart: {
      background: 'transparent',
      toolbar: { show: true, tools: { download: true } },
      foreColor: '#4b5563'
    },
    grid: { borderColor: '#e5e7eb' },
    tooltip: { theme: 'light' as const }
  }), []);

  const pmOptions = useMemo(() => ({
    ...chartThemeOptions,
    chart: { ...chartThemeOptions.chart, id: "pm-chart" },
    stroke: { curve: "smooth" as const, width: 3 },
    colors: ["#ef4444", "#3b82f6"],
    xaxis: { categories: pmData?.time || [] },
    title: {
      text: "Air Quality Trends (PM10 vs PM2.5)",
      style: { color: '#111827', fontSize: '16px', fontWeight: 600 }
    },
    legend: { position: "top" as const, labels: { colors: '#111827' } }
  }), [pmData, chartThemeOptions]);

  const pmSeries = useMemo(() => [
    { name: "PM10", data: pmData?.pm10 || [] },
    { name: "PM2.5", data: pmData?.pm25 || [] }
  ], [pmData]);

  const pumpOptions = useMemo(() => ({
    ...chartThemeOptions,
    chart: { ...chartThemeOptions.chart, id: "pump-status" },
    stroke: { curve: "stepline" as const, width: 3 },
    colors: ["#22c55e"],
    xaxis: { categories: pumpData.time },
    yaxis: {
      min: 0, max: 1, tickAmount: 1,
      labels: { formatter: (val: number) => (val === 1 ? "ON" : "OFF") }
    },
    title: { 
      text: "Pump Operation Status", 
      style: { color: '#111827', fontSize: '16px', fontWeight: 600 } 
    }
  }), [pumpData, chartThemeOptions]);

  const pumpSeries = useMemo(() => [{ name: "Pump Status", data: pumpData.status }], [pumpData]);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <SlideIn direction="down">
        <div className="flex flex-col md:flex-row md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cluster</label>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full md:w-40 flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium"
            >
              Cluster {selectedCluster}
              <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isDropdownOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-lg shadow-xl py-1">
                {[1, 2, 3].map((id) => (
                  <button
                    key={id}
                    onClick={() => { setSelectedCluster(id); setIsDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Cluster {id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date</label>
              <Datepicker value={fromDate} onChange={(date) => date && setFromDate(date)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Time</label>
              <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date</label>
              <Datepicker value={toDate} onChange={(date) => date && setToDate(date)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Time</label>
              <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className="w-full" />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => loadAllData(addTimeStringToDate(fromDate, fromTime), addTimeStringToDate(toDate, toTime))}
              className="btn-primary whitespace-nowrap"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getTime() - 30 * 60 * 1000);
                setFromDate(start); setToDate(now);
                setFromTime(`${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`);
                setToTime("23:59");
                loadAllData(start, now);
              }}
              className="btn-secondary whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        </div>
      </SlideIn>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <FadeIn className="card-base p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[350px] space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading air quality data...</p>
            </div>
          ) : (
            <>
              <Chart options={pmOptions} series={pmSeries} type="line" height={300} />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => downloadCsv(jsonToCsv(rawData?.time_pm_values || []), `cluster_${selectedCluster}_pm_data.csv`)}
                  className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  Export CSV
                </button>
              </div>
            </>
          )}
        </FadeIn>

        <FadeIn className="card-base p-6" delay={200}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[350px] space-y-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading pump status...</p>
            </div>
          ) : (
            <>
              <Chart options={pumpOptions} series={pumpSeries} type="line" height={300} />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => downloadCsv(jsonToCsv(rawData?.time_pump_onoff || []), `cluster_${selectedCluster}_pump_status.csv`)}
                  className="text-sm text-green-600 font-medium hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  Export CSV
                </button>
              </div>
            </>
          )}
        </FadeIn>
      </div>
    </div>
  );
}
