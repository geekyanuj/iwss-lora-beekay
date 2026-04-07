import { useEffect, useState } from "react";
import { get, post } from "../services";
import { useToast } from "../context/ToastContext";
import { CLUSTERS } from "../constants";
import { FadeIn, SlideIn, ScaleIn, HoverScale } from "../components/Animations/Transitions";

export type HomePageData = {
  allDevices: DeviceObj[];
  disableControl: boolean;
  lastReceivedTs: number;
  isOffline: boolean;
  sprinkler: {
    on: number;
    off: number;
  };
  devices: {
    sprinkler: number;
    pump: number;
  };
  pump: {
    on: number;
    off: number;
  };
  pm10: number;
  pm2_5: number;
  primaryDeviceId: string | null;
};

type DeviceObj = {
  clusterId: number;
  deviceid: string;
  isPump: boolean;
  isSV?: boolean;
  status: string;
  x?: number;
  y?: number;
};

export type ApiResponse = {
  message: string;
  data: HomePageData;
};

export type ApiResponse2 = {
  message: string;
  data: {
    pm2_5: number;
    pm10: number;
  };
};

export type HealthResponse = {
  mqtt: {
    connected: boolean;
    host: string;
    port: number;
  }
};

function EnhancedHome() {
  const [selectedClusterData, setSelectedClusterData] = useState<{ id: number; name: string; description: string } | null>(null);
  const [mqttStatus, setMqttStatus] = useState<HealthResponse['mqtt'] | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const health = await get("health", {}) as HealthResponse;
      if (health?.mqtt) setMqttStatus(health.mqtt);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FadeIn className="p-4 space-y-6 relative">
      {/* Broker Error Banner */}
      {mqttStatus && !mqttStatus.connected && (
        <SlideIn direction="down" className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-center gap-4 text-red-800 shadow-sm">
          <div className="bg-red-500 p-2 rounded-full text-white animate-bounce">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-lg">MQTT Broker Offline</h3>
            <p className="text-sm opacity-90">Cannot receive live sensor data. Please check if the broker at <code className="bg-red-100 px-1 rounded font-bold">{mqttStatus.host}:{mqttStatus.port}</code> is running.</p>
          </div>
        </SlideIn>
      )}

      <SlideIn direction="down">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor all clusters in real-time. Click a cluster for map & details.
          </p>
        </div>
      </SlideIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {CLUSTERS.map((cluster, i) => (
          <SlideIn key={i} direction="up" delay={100 + i * 50}>
            <div onClick={() => setSelectedClusterData(cluster)} className="cursor-pointer">
              <EnhancedClusterCard cluster={cluster} />
            </div>
          </SlideIn>
        ))}
      </div>

      {selectedClusterData && (
        <ClusterDetailModal 
          cluster={selectedClusterData} 
          onClose={() => setSelectedClusterData(null)} 
        />
      )}
    </FadeIn>
  );
}

export default EnhancedHome;

function EnhancedClusterCard({
  cluster,
}: {
  cluster: { id: number; name: string; description: string };
}) {
  const [homepageData, setHomepageData] = useState<HomePageData | null>(null);
  const fetchData = async () => {
    try {
      const response = await get(`cluster/${cluster.id}/home-page-data`, {}) as ApiResponse;
      setHomepageData(response.data);
    } catch (error) {
      console.error("Error fetching cluster data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [cluster.id]);

  const isDanger = homepageData?.pump.on === 1;
  const isOffline = homepageData?.isOffline ?? true;
  
  let cardGradient = "card-gradient-green";
  let statusColor = "bg-green-500";
  let borderColor = "border-green-500";

  if (isOffline) {
    cardGradient = "bg-gray-100";
    statusColor = "bg-gray-400";
    borderColor = "border-gray-400";
  } else if (isDanger) {
    cardGradient = "card-gradient-red";
    statusColor = "bg-red-500";
    borderColor = "border-red-500";
  }

  return (
    <HoverScale scale={1.02} className={`${cardGradient} rounded-xl border-2 ${borderColor} shadow-lg overflow-hidden transition-all duration-300 h-full`}>
      <div className="p-6 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {cluster.name}
            </h2>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
              {cluster.description}
            </p>
            <p className={`text-sm font-medium transition-colors duration-300 ${isOffline ? "text-gray-500" : "text-green-600"}`}>
              {isOffline ? "🔴 Offline" : "🟢 Online"}
            </p>
          </div>
          <div className={`${statusColor} rounded-full p-3`}>
            <div className={`w-6 h-6 bg-white rounded-full ${!isOffline ? 'animate-pulse' : ''}`}></div>
          </div>
        </div>

        <ScaleIn delay={100}>
          <div className="grid grid-cols-2 gap-3 bg-white rounded-lg p-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase">Sensors</p>
              <p className="text-2xl font-bold text-blue-600">{homepageData?.devices.sprinkler || 0}</p>
            </div>
            <div className="text-center border-l">
              <p className="text-xs font-semibold text-gray-400 uppercase">Pumps</p>
              <p className="text-2xl font-bold text-purple-600">{homepageData?.devices.pump || 0}</p>
            </div>
          </div>
        </ScaleIn>

        <div className="bg-white/50 rounded-lg p-3">
          {homepageData?.primaryDeviceId && (
            <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Source: {homepageData.primaryDeviceId}</p>
          )}
          <div className="flex justify-between text-xs font-medium text-gray-500">
            <span>PM2.5: <span className="text-gray-900">{isOffline ? "-" : homepageData?.pm2_5}</span></span>
            <span>PM10: <span className="text-gray-900">{isOffline ? "-" : homepageData?.pm10}</span></span>
          </div>
        </div>
      </div>
    </HoverScale>
  );
}

function ClusterDetailModal({ 
  cluster, 
  onClose 
}: { 
  cluster: { id: number; name: string; description: string }; 
  onClose: () => void 
}) {
  const { addToast } = useToast();
  const [data, setData] = useState<HomePageData | null>(null);
  const [sendingCommand, setSendingCommand] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchFull = async () => {
      const res = await get(`cluster/${cluster.id}/home-page-data`, {}) as ApiResponse;
      setData(res.data);
    };
    fetchFull();
  }, [cluster.id]);

  const sendCommand = (deviceid: string, command: "on" | "off") => {
    setSendingCommand(prev => ({ ...prev, [deviceid]: true }));
    post("send-command", { topic: deviceid, command })
      .then(() => {
        addToast(`${deviceid.split('/').pop()} turned ${command.toUpperCase()}`, "success");
        // Update local state for immediate feedback
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            allDevices: prev.allDevices.map(d => 
              d.deviceid === deviceid ? { ...d, status: command } : d
            )
          };
        });
      })
      .catch(err => {
        console.error(err);
        addToast(`Failed up turn ${command.toUpperCase()} ${deviceid.split('/').pop()}`, "error");
      })
      .finally(() => {
        setSendingCommand(prev => ({ ...prev, [deviceid]: false }));
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <FadeIn className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{cluster.name} Detail View</h2>
            <p className="text-sm text-gray-500">Live deployment map and device status</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Cluster Infrastructure Map</h3>
            <div className="relative aspect-video bg-emerald-50 rounded-2xl border-4 border-emerald-100 overflow-hidden shadow-inner group">
              {/* Grid Lines for reference */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(#059669 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              </div>
              
              {data?.allDevices.map((device, idx) => (
                <div 
                  key={idx}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-300"
                  style={{ left: `${device.x || 50}%`, top: `${device.y || 50}%` }}
                >
                  <div className={`p-2 rounded-xl shadow-lg border-2 flex flex-col items-center ${
                    device.isPump ? 'bg-purple-100 border-purple-400' : device.isSV ? 'bg-orange-100 border-orange-400' : 'bg-blue-100 border-blue-400'
                  }`}>
                    {device.isPump ? (
                       <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    ) : device.isSV ? (
                       <span className="text-lg">🔧</span>
                    ) : (
                       <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                    )}
                    <span className="text-[8px] font-bold mt-1 text-gray-700 truncate max-w-[40px]">{device.deviceid.split('/').pop()}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 text-xs font-medium text-gray-500 justify-center">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></div> Sensors</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-400 rounded"></div> Solenoid Valves</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-100 border border-purple-400 rounded"></div> Pumps</span>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Device Inventory</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {data?.allDevices.map((device, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${device.isPump ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{device.deviceid}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">
                        {device.isPump ? 'Pump' : device.isSV ? 'Solenoid Valve' : 'Sensor'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(device.isPump || device.isSV) ? (
                      <>
                        <button
                          onClick={() => sendCommand(device.deviceid, "on")}
                          disabled={sendingCommand[device.deviceid] || device.status === 'on'}
                          className={`px-2 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${
                            device.status === 'on' 
                              ? 'bg-green-100 text-green-700 cursor-not-allowed opacity-50' 
                              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm active:scale-95'
                          }`}
                        >
                          {sendingCommand[device.deviceid] && device.status !== 'on' && (
                            <span className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          )}
                          ON
                        </button>
                        <button
                          onClick={() => sendCommand(device.deviceid, "off")}
                          disabled={sendingCommand[device.deviceid] || device.status === 'off'}
                          className={`px-2 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${
                            device.status === 'off' || !device.status
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-50' 
                              : 'bg-gray-600 text-white hover:bg-gray-700 shadow-sm active:scale-95'
                          }`}
                        >
                          {sendingCommand[device.deviceid] && device.status !== 'off' && (
                            <span className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          )}
                          OFF
                        </button>
                      </>
                    ) : (
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        device.status === 'on' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {device.status || 'off'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!data?.allDevices || data.allDevices.length === 0) && (
                <div className="text-center py-12 text-gray-400">
                  No devices registered in this cluster
                </div>
              )}
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
