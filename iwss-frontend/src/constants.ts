export const CLUSTERS = [
  { id: 1, name: "Cluster 1", description: "Main Gate -> T-Point" },
  { id: 2, name: "Cluster 2", description: "T-Point -> MRSS -> MCC Room" },
  { id: 3, name: "Cluster 3", description: "T-Point -> Product Strage Building" },
  { id: 4, name: "Cluster 4", description: "Main Road -> Guest House" },
  { id: 5, name: "Cluster 5", description: "Main Road -> Admin Block -> Weighbridge" },
];

export const TABS = [
  "Registered device list",
  "Device Data",
  "Register",
  "Configure",
];
export const API_BASE_URL = "http://localhost:3001/api/"; // Change this to your backend URL
export type ClusterType = { id: number; name: string };
