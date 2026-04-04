import { useState } from "react";
import RegisteredDevices from "./pages/RegisteredDevice";
import DeviceData from "./pages/DeviceData";
import Register from "./pages/Register";
import Configure from "./pages/Configure";
import { CLUSTERS, type ClusterType } from "./constants";
import { FadeIn, SlideIn } from "./components/Animations/Transitions";

const TABS = ["Registered device list", "Device Data", "Register", "Configure"];

export default function Cluster() {
  const [clusterTab, setClusterTab] = useState<ClusterType | null>(CLUSTERS[0]);
  const isOffline = false;

  return (
    <FadeIn className="space-y-6">
      <SlideIn direction="down">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage System</h1>
        <p className="text-gray-600">Configure clusters and manage devices</p>
      </SlideIn>

      <div className="card-base p-1">
        <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200">
          {CLUSTERS.map((e: ClusterType) => {
            const isActive = e.id === clusterTab?.id;
            return (
              <li key={e.id} className="me-2">
                <button
                  onClick={() => setClusterTab(e)}
                  className={`inline-block p-4 rounded-t-lg transition-all duration-200 ${
                    isActive
                      ? "text-blue-600 bg-gray-50 active border-b-2 border-blue-600"
                      : "hover:text-gray-600 hover:bg-gray-50 border-b-2 border-transparent"
                  }`}
                >
                  {e.name}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="p-4 md:p-6 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {clusterTab?.name} Settings
            </h2>
            {isOffline && (
              <span className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">
                Offline
              </span>
            )}
          </div>
          
          {!isOffline && clusterTab && <ManageDataContent cluster={clusterTab} />}
        </div>
      </div>
    </FadeIn>
  );
}

function ManageDataContent({ cluster }: { cluster: ClusterType }) {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
          {TABS.map((e: string, i: number) => {
            const isActive = i === currentTab;
            return (
              <li key={i} className="me-2">
                <button
                  onClick={() => setCurrentTab(i)}
                  className={`inline-block p-4 border-b-2 rounded-t-lg transition-all duration-200 ${
                    isActive
                      ? "text-blue-600 border-blue-600"
                      : "border-transparent hover:text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {e}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <FadeIn key={currentTab} duration={300}>
        <div className="bg-gray-50 rounded-xl p-4 md:p-6 border border-gray-100">
          {currentTab === 0 && <RegisteredDevices cluster={cluster?.id} />}
          {currentTab === 1 && <DeviceData cluster={cluster?.id} />}
          {currentTab === 2 && <Register cluster={cluster?.id} />}
          {currentTab === 3 && <Configure cluster={cluster?.id} />}
        </div>
      </FadeIn>
    </div>
  );
}
