import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { NotificationProvider } from "../context/NotificationContext";
import ToastContainer from "../components/common/ToastContainer";

/**
 * Root layout for all authenticated pages.
 * Uses semantic HTML landmarks (aside + main) so screen reader users
 * can quickly jump between navigation and page content.
 */
export default function DashboardLayout() {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-surface-900">
        {/* Desktop sidebar — rendered as <aside> inside Sidebar */}
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile top-bar navigation */}
          <Navbar />
          {/* Primary page content — role="main" is the skip-to-content target */}
          <main id="main-content" className="flex-1 p-6 overflow-y-auto" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
      {/* Toast popups — rendered at the root level above all content */}
      <ToastContainer />
    </NotificationProvider>
  );
}


