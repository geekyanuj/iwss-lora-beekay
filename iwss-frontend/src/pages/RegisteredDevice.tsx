import { useEffect, useState } from "react";
import { get, post, del } from "../services";
import { useToast } from "../context/ToastContext";

type Device = {
  _id: string;
  deviceid: string;
  _ts: number;
  isPump: boolean;
  isSV: boolean;
  isFan?: boolean;
  status?: string;
};

type GetDeviceResponse = {
  message: string;
  data: Device[];
};

function getDeviceType(device: Device): "sensor" | "sv" | "pump" {
  if (device.isPump) return "pump";
  if (device.isSV) return "sv";
  return "sensor";
}

const DEVICE_TYPE_META = {
  sensor: { label: "Sensor", icon: "📡", badgeClass: "bg-blue-100 text-blue-800", pillClass: "bg-blue-500" },
  sv: { label: "Solenoid Valve", icon: "🔧", badgeClass: "bg-orange-100 text-orange-800", pillClass: "bg-orange-500" },
  pump: { label: "Pump", icon: "💧", badgeClass: "bg-purple-100 text-purple-800", pillClass: "bg-purple-500" },
};

function RegisteredDevices({ cluster }: { cluster?: number }) {
  const [loading, setLoading] = useState(false);
  const [regdDevices, setRegdDevices] = useState<Device[]>([]);
  const [sendingCommand, setSendingCommand] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchDevices = () => {
    setLoading(true);
    get(`cluster/${cluster}/get-devices`, {})
      .then((response: GetDeviceResponse) => {
        setRegdDevices(response.data);
      })
      .catch(err => {
        console.error(err);
        addToast("Failed to fetch devices", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevices();
  }, [cluster]);

  const sendCommand = (deviceid: string, command: "on" | "off") => {
    setSendingCommand(prev => ({ ...prev, [deviceid]: true }));
    post("send-command", { topic: deviceid, command })
      .then(() => {
        addToast(`${deviceid.split('/').pop()} turned ${command.toUpperCase()}`, "success");
        // Update status locally for immediate feedback
        setRegdDevices(prev => prev.map(d => 
          d.deviceid === deviceid ? { ...d, status: command } : d
        ));
      })
      .catch(err => {
        console.error(err);
        addToast(`Failed to turn ${command.toUpperCase()} ${deviceid.split('/').pop()}`, "error");
      })
      .finally(() => {
        setSendingCommand(prev => ({ ...prev, [deviceid]: false }));
      });
  };

  const handleDeleteClick = (deviceid: string) => {
    setConfirmDelete(deviceid);
  };

  const handleDeleteConfirm = async (deviceid: string) => {
    setDeletingId(deviceid);
    setConfirmDelete(null);
    try {
      const result = await del(`device/${encodeURIComponent(deviceid)}`);
      if (result?.message) {
        addToast(`Device "${deviceid}" deleted successfully`, "success");
        setRegdDevices(prev => prev.filter(d => d.deviceid !== deviceid));
      } else {
        addToast("Failed to delete device", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to delete device", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };

  const sensorCount = regdDevices.filter(d => !d.isPump && !d.isSV).length;
  const svCount = regdDevices.filter(d => d.isSV).length;
  const pumpCount = regdDevices.filter(d => d.isPump).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Registered Devices</h3>
        <div className="flex items-center gap-3">
          {loading && <span className="text-sm text-gray-500 animate-pulse">Loading...</span>}
          {!loading && (
            <button
              onClick={fetchDevices}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ↺ Refresh
            </button>
          )}
        </div>
      </div>

      {/* Summary Chips */}
      {regdDevices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            📡 {sensorCount} Sensor{sensorCount !== 1 ? 's' : ''}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            🔧 {svCount} Solenoid Valve{svCount !== 1 ? 's' : ''}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            💧 {pumpCount} Pump{pumpCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl">
                🗑️
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">Delete Device?</h4>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-sm font-mono font-bold text-gray-800">{confirmDelete}</p>
              <p className="text-xs text-gray-500 mt-0.5">All device data will be retained in history.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(confirmDelete)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="no-transition">
          <thead>
            <tr>
              <th>#</th>
              <th>Device ID</th>
              <th>Type</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {regdDevices.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">No devices found</td>
              </tr>
            ) : (
              regdDevices.map((device: Device, i: number) => {
                const deviceType = getDeviceType(device);
                const meta = DEVICE_TYPE_META[deviceType];
                const isControllable = device.isPump || device.isSV;
                const isDeleting = deletingId === device.deviceid;

                return (
                  <tr key={device._id || i} className={isDeleting ? "opacity-40" : ""}>
                    <td className="text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta.icon}</span>
                        <span className="font-mono text-sm">{device.deviceid}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      {isControllable ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          device.status === 'on' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {device.status || 'off'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Read-only</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isControllable ? (
                          <>
                            <button
                              onClick={() => sendCommand(device.deviceid, "on")}
                              disabled={isDeleting || sendingCommand[device.deviceid] || device.status === 'on'}
                              className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-1.5 ${
                                device.status === 'on' 
                                  ? 'bg-green-200 text-green-700 cursor-not-allowed' 
                                  : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg active:scale-95'
                              } disabled:opacity-50`}
                            >
                              {sendingCommand[device.deviceid] && device.status !== 'on' ? (
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              ) : null}
                              ON
                            </button>
                            <button
                              onClick={() => sendCommand(device.deviceid, "off")}
                              disabled={isDeleting || sendingCommand[device.deviceid] || device.status === 'off'}
                              className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-1.5 ${
                                device.status === 'off' || !device.status
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                  : 'bg-gray-600 hover:bg-gray-700 shadow-md hover:shadow-lg active:scale-95'
                              } disabled:opacity-50`}
                            >
                              {sendingCommand[device.deviceid] && device.status !== 'off' ? (
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              ) : null}
                              OFF
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => handleDeleteClick(device.deviceid)}
                          disabled={isDeleting}
                          title="Delete device"
                          className="px-2 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                        >
                          {isDeleting ? (
                            <span className="animate-spin">⟳</span>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RegisteredDevices;
