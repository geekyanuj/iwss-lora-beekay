import { Button } from "flowbite-react";
import { useEffect, useState } from "react";
import { get, post } from "../services";
import { useToast } from "../context/ToastContext";

function Configure({ cluster }: { cluster?: number }) {
  const [pm2_5, setPm2_5] = useState("");
  const [pm10, setPm10] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const response = await get(`cluster/${cluster}/thresholds`, {});
        if (response.data) {
          setPm2_5(response?.data?.pm2_5 || "");
          setPm10(response?.data?.pm10 || "");
        } else {
          setPm2_5("");
          setPm10("");
        }
      } catch (error) {
        console.error("Failed to fetch thresholds:", error);
      }
    };
    fetchThresholds();
  }, [cluster]);

  const handleSave = () => {
    if (pm2_5 && pm10 && parseInt(pm2_5) > 0 && parseInt(pm10) > 0) {
      post(`cluster/${cluster}/update-threshold`, {
        pm2_5: parseInt(pm2_5),
        pm10: parseInt(pm10),
      })
        .then(() => {
          addToast("Threshold updated successfully", "success");
        })
        .catch((error) => {
          console.error("Error:", error);
          addToast("Failed to update threshold", "error");
        });
    } else {
      addToast("Please enter valid positive numbers for thresholds", "warning");
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Threshold Settings</h3>
        <p className="text-sm text-gray-600">Set threshold for controlling pump based on air quality</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="pm2.5" className="block text-sm font-medium text-gray-700 mb-1">
            PM2.5 threshold (µg/m³)
          </label>
          <input
            value={pm2_5}
            type="number"
            onChange={(e) => setPm2_5(e.target.value)}
            id="pm2.5"
            placeholder="e.g. 100"
            className="w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="pm10" className="block text-sm font-medium text-gray-700 mb-1">
            PM10 threshold (µg/m³)
          </label>
          <input
            value={pm10}
            type="number"
            onChange={(e) => setPm10(e.target.value)}
            id="pm10"
            placeholder="e.g. 150"
            className="w-full"
            required
          />
        </div>
      </div>

      <div className="pt-2">
        <Button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Update Thresholds
        </Button>
      </div>
    </div>
  );
}

export default Configure;
