import { useEffect, useState } from "react";
import { get } from "../services";

type DeviceDataObj = {
  _id: string;
  data: string;
  topic: string;
  _ts: number;
  isPump: boolean;
  type: "telemetry" | "command";
};

type DeviceDataResponse = {
  message: string;
  data: DeviceDataObj[];
};

function DeviceData({ cluster }: { cluster?: number }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeviceDataObj[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!isMounted) return;
      try {
        const res = await get(`cluster/${cluster}/get-data`, {});
        if (isMounted) setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cluster]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Live Device Data</h3>
        {loading && <span className="text-sm text-gray-500 animate-pulse">Refreshing...</span>}
      </div>

      <div className="table-container">
        <table className="no-transition">
          <thead>
            <tr>
              <th>Device Id</th>
              <th>Payload</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">No data received yet</td>
              </tr>
            ) : (
              data.map((e: DeviceDataObj, i: number) => (
                <tr key={e._id || i}>
                  <td className="font-medium text-gray-900">{e.topic}</td>
                  <td className="font-mono text-xs">
                    <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={JSON.stringify(e.data)}>
                      {typeof e.data === 'string' ? e.data : JSON.stringify(e.data)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {new Date(e._ts).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DeviceData;
