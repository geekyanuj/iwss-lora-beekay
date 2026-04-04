import { useState } from "react";
import { post } from "../services";
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
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceType, setDeviceType] = useState<DeviceType>("sensor");
  const [xPlacement, setXPlacement] = useState<number>(Math.floor(Math.random() * 100));
  const [yPlacement, setYPlacement] = useState<number>(Math.floor(Math.random() * 100));
  const [loading, setLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<{ detail: string; existingCluster?: number; existingType?: string } | null>(null);
  const { addToast } = useToast();

  const handleRegister = async () => {
    if (!deviceId.trim()) return;

    // Clear any previous duplicate error when user tries again
    setDuplicateError(null);
    setLoading(true);

    try {
      const result = await post("register", {
        topic: deviceId.trim(),
        isPump: deviceType === "pump",
        isSV: deviceType === "sv",
        clusterId: cluster,
        x: xPlacement,
        y: yPlacement,
      });

      // The post() helper doesn't throw on HTTP errors — check the response payload
      if (result?.error) {
        // Duplicate MQTT topic (HTTP 409)
        if (result.existingDevice || result.detail?.includes('already')) {
          setDuplicateError({
            detail: result.detail || result.error,
            existingCluster: result.existingDevice?.clusterId,
            existingType: result.existingDevice?.type,
          });
          addToast(`Topic "${deviceId}" is already registered`, "error");
        } else {
          addToast(result.error || "Failed to register device", "error");
        }
        return;
      }

      addToast(`Device "${deviceId}" registered as ${DEVICE_TYPE_CONFIG[deviceType].label}`, "success");
      setDeviceId("");
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
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Register New Device</h3>
        <p className="text-sm text-gray-600">
          Add sensor, solenoid valve, or pump with placement coordinate to cluster {cluster}.
          {" "}<span className="font-medium text-blue-600">Pumps & SVs</span> use relay modules and are controlled via their MQTT topic ID.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="deviceid" className="block text-sm font-medium text-gray-700 mb-1">
            Device ID / MQTT Topic
          </label>
          <input
            type="text"
            value={deviceId}
            onChange={(e) => {
              setDeviceId(e.target.value);
              // Clear duplicate error as soon as user edits the field
              if (duplicateError) setDuplicateError(null);
            }}
            id="deviceid"
            placeholder="e.g. pump/01 or sv/01 or sensor/01"
            className={`w-full ${duplicateError ? 'border-2 border-red-400 focus:ring-red-400 bg-red-50' : ''}`}
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            This must match the MQTT topic configured on the ESP32 device.
          </p>

          {/* Duplicate topic error banner */}
          {duplicateError && (
            <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <span className="text-red-500 text-lg mt-0.5 flex-shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-700">MQTT Topic Already Registered</p>
                <p className="text-xs text-red-600 mt-0.5">{duplicateError.detail}</p>
                {duplicateError.existingCluster && (
                  <p className="text-xs text-red-500 mt-1">
                    In use by a{' '}
                    <span className="font-semibold">{duplicateError.existingType}</span>
                    {' '}in{' '}
                    <span className="font-semibold">Cluster {duplicateError.existingCluster}</span>.
                    Choose a different unique topic for this device.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X Placement (0-100%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={xPlacement}
              onChange={(e) => setXPlacement(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y Placement (0-100%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={yPlacement}
              onChange={(e) => setYPlacement(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Device Type</p>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(DEVICE_TYPE_CONFIG) as [DeviceType, typeof cfg][]).map(([type, config]) => (
              <label
                key={type}
                className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  deviceType === type
                    ? config.color === "blue"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : config.color === "orange"
                      ? "bg-orange-50 border-orange-500 text-orange-700"
                      : "bg-purple-50 border-purple-500 text-purple-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="deviceType"
                  checked={deviceType === type}
                  onChange={() => setDeviceType(type)}
                />
                <span className="text-2xl mb-1">{config.icon}</span>
                <span className="text-xs font-bold text-center leading-tight">{config.label}</span>
              </label>
            ))}
          </div>
          {/* Device type description */}
          <div className={`p-3 rounded-lg text-xs text-gray-600 border ${
            cfg.color === "blue" ? "bg-blue-50 border-blue-100" :
            cfg.color === "orange" ? "bg-orange-50 border-orange-100" :
            "bg-purple-50 border-purple-100"
          }`}>
            {cfg.icon} <span className="font-semibold">{cfg.label}:</span> {cfg.description}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={handleRegister}
          disabled={!deviceId.trim() || loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "Registering..." : `Register as ${cfg.label}`}
        </Button>
      </div>
    </div>
  );
}

export default Register;
