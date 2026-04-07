import { useState, useEffect } from "react";
import { get, post } from "../services";
import { useToast } from "../context/ToastContext";
import { FadeIn } from "../components/Animations/Transitions";

type Device = {
  _id: string;
  deviceid: string;
  deviceName?: string;
  isPump: boolean;
  isSV: boolean;
  mappedDeviceIds?: string[];
};

export default function Mapping({ cluster }: { cluster?: number }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await get(`cluster/${cluster}/get-devices`, {});
      setDevices(res.data);
    } catch (error) {
      console.error(error);
      addToast("Failed to fetch devices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [cluster]);

  const scus = devices.filter(d => !d.isPump && !d.isSV);
  const rcus = devices.filter(d => d.isPump || d.isSV);

  const toggleMapping = async (scuId: string, rcuId: string) => {
    const scu = scus.find(d => d.deviceid === scuId);
    if (!scu) return;

    const currentMappings = scu.mappedDeviceIds || [];
    const newMappings = currentMappings.includes(rcuId)
      ? currentMappings.filter(id => id !== rcuId)
      : [...currentMappings, rcuId];

    try {
      await post(`device/${scuId}/status`, { mappedDeviceIds: newMappings });
      addToast("Mapping updated successfully", "success");
      // Update local state
      setDevices(prev => prev.map(d => 
        d.deviceid === scuId ? { ...d, mappedDeviceIds: newMappings } : d
      ));
    } catch (error) {
      console.error(error);
      addToast("Failed to update mapping", "error");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading devices...</div>;

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Device Mapping</h3>
          <p className="text-sm text-gray-500">Link Sensor Control Units (SCU) to Relay Control Units (RCU) for automated actions.</p>
        </div>
        <button 
          onClick={fetchDevices}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          ↻ Refresh List
        </button>
      </div>

      {scus.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <span className="text-4xl mb-4 block">📡</span>
          <p className="text-gray-500 font-medium">No Sensor Control Units found in this cluster.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {scus.map(scu => (
            <div key={scu.deviceid} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 uppercase tracking-tight">{scu.deviceName || scu.deviceid}</h4>
                    <p className="text-[10px] font-mono text-gray-400">SENSOR CONTROL UNIT • ID: {scu.deviceid}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase">
                    {(scu.mappedDeviceIds?.length || 0)} Mapped RCUs
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">Control these Relay Control Units (RCU):</p>
                {rcus.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No RCUs available in this cluster for mapping.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {rcus.map(rcu => {
                      const isMapped = scu.mappedDeviceIds?.includes(rcu.deviceid);
                      return (
                        <button
                          key={rcu.deviceid}
                          onClick={() => toggleMapping(scu.deviceid, rcu.deviceid)}
                          className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 ${
                            isMapped
                              ? "bg-blue-600 border-blue-600 text-white shadow-md scale-[1.02]"
                              : "bg-white border-gray-100 text-gray-500 hover:border-blue-200 hover:bg-blue-50"
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            isMapped ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500"
                          }`}>
                            {rcu.isPump ? "💧" : "🔧"}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black uppercase tracking-tight leading-none">{rcu.deviceName || rcu.deviceid}</p>
                            <p className={`text-[8px] font-mono mt-0.5 ${isMapped ? "text-blue-200" : "text-gray-400"}`}>
                              RCU • {rcu.deviceid}
                            </p>
                          </div>
                          <div className={`ml-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isMapped ? "bg-white text-blue-600 scale-100" : "bg-gray-100 text-transparent scale-50"
                          }`}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </FadeIn>
  );
}
