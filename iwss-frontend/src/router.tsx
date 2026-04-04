import { createBrowserRouter } from "react-router";
import EnhancedHome from "./pages/Home";
import EnhancedDashboardLayout from "./component/Dashboard/EnhancedLayout";
import ManageData from "./ManageData";
import EnhancedReports from "./pages/Reports";
import LoginPage from "./pages/Login/Login";
import EnhancedAnalytics from "./pages/Analytics";

const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",

    Component: EnhancedDashboardLayout,
    children: [
      { index: true, Component: EnhancedHome },
      { path: "manage-data", Component: ManageData },
      { path: "report", Component: EnhancedReports },
      { path: "analytic-data", Component: EnhancedAnalytics },
    ],
  },
]);

export { router };
