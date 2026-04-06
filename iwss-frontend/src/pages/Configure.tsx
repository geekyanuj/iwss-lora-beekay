import { Button, Card } from "flowbite-react";
import { useEffect, useState } from "react";
import { get, post } from "../services";
import { useToast } from "../context/ToastContext";

function Configure({ cluster }: { cluster?: number }) {
  const [pm2_5, setPm2_5] = useState("");
  const [pm10, setPm10] = useState("");
  const [pollInterval, setPollInterval] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingThreshold, setLoadingThreshold] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    // 1. Fetch Global System Configuration (Interval)
    const fetchGlobalConfig = async () => {
      try {
        const response = await get(`config/global`, {});
        if (response.data) {
          setPollInterval(response.data.pollInterval || "5");
        }
      } catch (error) {
        console.error("Failed to fetch global config:", error);
      }
    };

    // 2. Fetch Cluster-specific thresholds
    const fetchThresholds = async () => {
      try {
        const response = await get(`cluster/${cluster}/thresholds`, {});
        if (response.data) {
          setPm2_5(response.data.pm2_5 || "");
          setPm10(response.data.pm10 || "");
        } else {
          setPm2_5("");
          setPm10("");
        }
      } catch (error) {
        console.error("Failed to fetch thresholds:", error);
      }
    };

    fetchGlobalConfig();
    fetchThresholds();
  }, [cluster]);

  const handleSaveInterval = () => {
    if (!pollInterval || parseInt(pollInterval) < 1) {
      addToast("Enter a valid interval", "warning");
      return;
    }
    setLoadingConfig(true);
    post(`config/global/update`, { pollInterval: parseInt(pollInterval) })
      .then(() => addToast("Global interval updated", "success"))
      .catch(() => addToast("Failed to update global config", "error"))
      .finally(() => setLoadingConfig(false));
  };

  const handleSaveThresholds = () => {
    if (pm2_5 && pm10 && parseInt(pm2_5) > 0 && parseInt(pm10) > 0) {
      setLoadingThreshold(true);
      post(`cluster/${cluster}/update-threshold`, {
        pm2_5: parseInt(pm2_5),
        pm10: parseInt(pm10),
      })
        .then(() => addToast("Cluster thresholds updated", "success"))
        .catch(() => addToast("Failed to update thresholds", "error"))
        .finally(() => setLoadingThreshold(false));
    } else {
      addToast("Enter valid thresholds", "warning");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 🌏 SYSTEM GLOBAL CONFIGURATION */}
      <Card className="border-0 shadow-sm bg-blue-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-md">
            <h3 className="text-xl font-black text-blue-900 mb-1">System Polling Interval</h3>
            <p className="text-sm text-blue-600 font-medium">
              This sets the sequential iteration time for <strong>ALL</strong> clusters (LoRa Gateway).
              Adjust this if you experience network congestion with 50+ nodes.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1.5 ml-1">Seconds</label>
              <input
                value={pollInterval}
                type="number"
                onChange={(e) => setPollInterval(e.target.value)}
                className="w-24 h-12 text-lg font-black text-center bg-white border-2 border-blue-100 rounded-2xl text-blue-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
              />
            </div>
            <Button 
               onClick={handleSaveInterval}
               disabled={loadingConfig}
               className="h-12 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
               {loadingConfig ? "..." : "Apply Global"}
            </Button>
          </div>
        </div>
      </Card>

      <hr className="border-gray-100" />

      {/* 🏗️ CLUSTER SPECIFIC CONFIGURATION */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Cluster {cluster} Thresholds</h3>
            <p className="text-sm text-gray-500">Manual safety limits for actuators in this cluster.</p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">PM2.5 (µg/m³)</label>
              <input
                value={pm2_5}
                type="number"
                onChange={(e) => setPm2_5(e.target.value)}
                className="w-full h-12 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">PM10 (µg/m³)</label>
              <input
                value={pm10}
                type="number"
                onChange={(e) => setPm10(e.target.value)}
                className="w-full h-12 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleSaveThresholds}
              disabled={loadingThreshold}
              className="w-full h-12 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl shadow-gray-100 transition-all active:scale-95"
            >
              Update cluster thresholds
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 flex flex-col justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">💡</div>
          <h4 className="font-bold text-gray-900">Optimal Polling</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            With 50 nodes, an interval of <strong>5-8 seconds</strong> is recommended to ensure all nodes are read every 5-7 minutes without LoRa collisions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Configure;
