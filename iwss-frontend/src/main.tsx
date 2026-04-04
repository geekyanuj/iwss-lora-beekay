// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/Toast/ToastContainer";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element. Make sure index.html has a <div id='root'></div>");
}

createRoot(rootElement).render(
  // <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
      <ToastContainer />
    </ToastProvider>
  // </StrictMode>
);
