import { get } from "../services";

// src/services/apiService.ts
export type PMDataType = {
  time: string[];
  pm10: number[];
  pm25: number[];
};

export type PumpDataType = {
  time: string[];
  status: number[];
};

export type WaterUsageType = {
  day: string[];
  liters: number[];
};

export type TimePMValue = {
  time: number;
  pm10: number;
  pm2_5: number;
  cluster: number;
  deviceId: number;
  [key: string]: string | number;
};

export type TimePumpStatus = {
  time: number;
  state: string;
  cluster: number;
  deviceId: number;
  [key: string]: string | number;
};

export type RawData = {
  time_pm_values: TimePMValue[];
  time_pump_onoff: TimePumpStatus[];
};

export type AnalyticsDataType = {
  timePM: PMDataType;
  pumpStatus: PumpDataType;
  rawData: RawData;
};

/**
 * Fetch PM and Pump analytics data for a specific cluster within a time range.
 */
export async function fetchPMDataByCluster(
  clusterId: number,
  from: Date | null = null,
  to: Date | null = null
): Promise<AnalyticsDataType> {
  const queryParams: Record<string, string> = {};
  if (from) queryParams.fromTime = from.getTime().toString();
  if (to) queryParams.toTime = to.getTime().toString();

  try {
    const response = await get(`cluster/${clusterId}/analytics`, queryParams);
    if (!response) throw new Error("No response from server");

    const { time_pm_values: pmvalues, time_pump_onoff: pumpStatus } = response.data;

    // Convert timestamps to readable times
    const time = pmvalues.map((entry: { time: number }) =>
      new Date(entry.time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );

    const pm10Values = pmvalues.map((entry: { pm10: number }) => entry.pm10);
    const pm25Values = pmvalues.map((entry: { pm2_5: number }) => entry.pm2_5);

    const pumpTimes = pumpStatus.map((entry: { time: number }) =>
      new Date(entry.time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );

    const pumpStatuses = pumpStatus.map((entry: { state: string }) =>
      entry.state === "on" ? 1 : 0
    );

    return {
      timePM: { time, pm10: pm10Values, pm25: pm25Values },
      pumpStatus: { time: pumpTimes, status: pumpStatuses },
      rawData: response.data,
    };
  } catch (error) {
    console.error("Error fetching PM data:", error);
    throw error;
  }
}
