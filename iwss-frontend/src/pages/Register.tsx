import { useState, useEffect } from "react";
import { post, get } from "../services";
import { useToast } from "../context/ToastContext";
import { Button } from "flowbite-react";

type DeviceType = "sensor" | "sv" | "pump";

const DEVICE_TYPE_CONFIG: Record<DeviceType, { label: string; icon: string; description: string; color: string }> = {
  sensor: {
    label: "Sensor",
    icon: "📡",
    description: "Reads environmental data (PM2.5, PM10, etc.)",
    color: "blue",
  },
  sv: {
    label: "Solenoid Valve (SV)",
    icon: "🔧",
    description: "Relay-controlled valve — controlled via MQTT topic",
    color: "orange",
  },
  pump: {
    label: "Pump",
    icon: "💧",
    description: "Relay-controlled pump — controlled via MQTT topic",
    color: "purple",
  },
};

function Register({ cluster }: { cluster?: number }) {
  const [deviceNumber, setDeviceNumber] = useState<string>("1");
  const [deviceType, setDeviceType] = useState<DeviceType>("sensor");
  const [xPlacement, setXPlacement] = useState<number>(Math.floor(Math.random() * 100));
  const [yPlacement, setYPlacement] = useState<number>(Math.floor(Math.random() * 100));
  const [loading, setLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<{ detail: string; existingCluster?: number; existingType?: string } | null>(null);
  
  const [mappedDeviceIds, setMappedDeviceIds] = useState<string[]>([]);
  const [clusterDevices, setClusterDevices] = useState<{ deviceid: string; deviceName?: string }[]>([]);
  
  const { addToast } = useToast();

  const clusterId = cluster || 1;
  const typeCode = deviceType === "sensor" ? 0 : 1; // 0 for sensor/SCU, 1 for SV
  const typeLabel = deviceType === "sensor" ? "SCU" : deviceType === "sv" ? "SV" : "PUMP";
  
  // Fetch existing controllable devices in the cluster for mapping
  useEffect(() => {
    if (deviceType === "sensor") {
      get(`cluster/${clusterId}/get-devices`, {})
        .then(res => {
          const controllable = res.data.filter((d: any) => d.isPump || d.isSV);
          setClusterDevices(controllable);
        })
        .catch(err => console.error("Failed to fetch devices for mapping", err));
    }
  }, [clusterId, deviceType]);

  const toggleMappedDevice = (id: string) => {
    setMappedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  // Calculate Node ID (e.g. 101, 111)
  const calcNodeId = (clusterId * 100) + (typeCode * 10) + (parseInt(deviceNumber) || 1);
  // Calculate Human Name (e.g. C1SCU1)
  const calcHumanName = `C${clusterId}${typeLabel}${deviceNumber}`;

  const handleRegister = async () => {
    setDuplicateError(null);
    setLoading(true);

    try {
      const result = await post("register", {
        topic: String(calcNodeId),
        deviceName: calcHumanName,
        isPump: deviceType === "pump",
        isSV: deviceType === "sv",
        clusterId: clusterId,
        x: xPlacement,
        y: yPlacement,
        mappedDeviceIds: deviceType === "sensor" ? mappedDeviceIds : [],
      });

      if (result?.error) {
        if (result.existingDevice || result.detail?.includes('already')) {
          setDuplicateError({
            detail: result.detail || result.error,
            existingCluster: result.existingDevice?.clusterId,
            existingType: result.existingDevice?.type,
          });
          addToast(`Node ID "${calcNodeId}" is already registered`, "error");
        } else {
          addToast(result.error || "Failed to register device", "error");
        }
        return;
      }

      addToast(`Device "${calcHumanName}" registered successfully`, "success");
      setDeviceNumber(String(parseInt(deviceNumber) + 1));
    } catch (error) {
      console.error(error);
      addToast("Failed to register device", "error");
    } finally {
      setLoading(false);
    }
  };

  const cfg = DEVICE_TYPE_CONFIG[deviceType];

  return (
    <div className="space-y-6 max-w-lg">
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mb-1">LoRa Node ID</p>
          <h2 className="text-4xl font-black text-blue-900 tracking-tight">{calcNodeId}</h2>
        </div>
        <div className="h-12 w-[1px] bg-blue-200"></div>
        <div className="text-right">
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mb-1">Human mapping</p>
          <h2 className="text-4xl font-black text-blue-900 tracking-tight">{calcHumanName}</h2>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="deviceNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Device Number (1-9)
            </label>
            <input
              type="number"
              min="1"
              max="9"
              value={deviceNumber}
              onChange={(e) => {
                setDeviceNumber(e.target.value);
                setDuplicateError(null);
              }}
              id="deviceNumber"
              className="w-full rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Active Cluster</label>
            <input 
              type="text" 
              value={`Cluster ${clusterId}`} 
              disabled 
              className="w-full bg-gray-50 border-gray-200 text-gray-500 italic rounded-xl" 
            />
          </div>
        </div>

        {duplicateError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            <strong>Duplicate ID:</strong> {duplicateError.detail} in Cluster {duplicateError.existingCluster}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Device Type</p>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(DEVICE_TYPE_CONFIG) as [DeviceType, typeof cfg][]).map(([type, config]) => (
              <label
                key={type}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                  deviceType === type
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]"
                    : "bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:bg-blue-50/30"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="deviceType"
                  checked={deviceType === type}
                  onChange={() => {
                    setDeviceType(type);
                    setDuplicateError(null);
                  }}
                />
                <span className="text-3xl mb-2">{config.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{config.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X Coord (0-100%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={xPlacement}
              onChange={(e) => setXPlacement(Number(e.target.value))}
              className="w-full rounded-xl border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y Coord (0-100%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={yPlacement}
              onChange={(e) => setYPlacement(Number(e.target.value))}
              className="w-full rounded-xl border-gray-200"
            />
          </div>
        </div>

        {/* Multi-Mapping Section */}
        {deviceType === "sensor" && clusterDevices.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-gray-800">Assign Action Mappings</span>
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">SCU -&gt; RCUs</span>
             </div>
             <p className="text-xs text-gray-500 mb-2">When this sensor hits threshold, these devices will turn ON automatically.</p>
             <div className="flex flex-wrap gap-2">
                {clusterDevices.map(d => (
                  <button
                    key={d.deviceid}
                    onClick={() => toggleMappedDevice(d.deviceid)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                      mappedDeviceIds.includes(d.deviceid)
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-500 border-gray-100 hover:border-blue-200"
                    }`}
                  >
                    {d.deviceName || d.deviceid}
                  </button>
                ))}
             </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        <Button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-blue-100 hover:shadow-blue-200"
        >
          {loading ? "Processing..." : `Register ${calcHumanName}`}
        </Button>
      </div>
    </div>
  );
}

export default Register;
