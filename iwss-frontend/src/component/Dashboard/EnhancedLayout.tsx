import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useToast } from "../../context/ToastContext";
import { FadeIn, SlideIn } from "../../components/Animations/Transitions";

function isAuthenticated() {
  const isLoggedIn = localStorage.getItem("logged-in");
  return isLoggedIn === "true";
}

const NavItem = ({
  href,
  icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) => (
  <a
    href={href}
    className={`flex items-center p-3 rounded-lg transition-all duration-300 ${isActive
      ? "bg-blue-700 text-white"
      : "text-gray-900 hover:bg-gray-100"
      } group`}
  >
    <div className={`transition-all duration-300 ${isActive ? "scale-110" : ""}`}>
      {icon}
    </div>
    <span className="flex-1 ms-3 whitespace-nowrap">{label}</span>
    {isActive && (
      <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
    )}
  </a>
);

function EnhancedDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("logged-in");
    addToast("Logged out successfully", "success");
    navigate("/login");
  };

  const navItems = [
    {
      href: "/",
      icon: (
        <svg
          className="w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9.75L12 3l9 6.75V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V9.75z"
          />
        </svg>
      ),
      label: "Home",
    },
    {
      href: "/report",
      icon: (
        <svg
          className="w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3v18h18M7 14l3-3 4 4 5-5"
          />
        </svg>
      ),
      label: "Reports",
    },
    {
      href: "/manage-data",
      icon: (
        <svg
          className="w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6c0-1.105 3.582-2 8-2s8 .895 8 2-3.582 2-8 2-8-.895-8-2zm16 0v12c0 1.105-3.582 2-8 2s-8-.895-8-2V6m16 6c0 1.105-3.582 2-8 2s-8-.895-8-2"
          />
        </svg>
      ),
      label: "Manage Data",
    },
    {
      href: "/analytic-data",
      icon: (
        <svg
          className="w-6 h-6 text-gray-700 transition duration-75 group-hover:text-gray-900"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M4 3h2v18H4V3zm7 7h2v11h-2V10zm7-4h2v15h-2V6z" />
        </svg>
      ),
      label: "Analytics",
    },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        data-drawer-target="default-sidebar"
        data-drawer-toggle="default-sidebar"
        aria-controls="default-sidebar"
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-300"
      >
        <span className="sr-only">Open sidebar</span>
        <svg
          className="w-6 h-6"
          aria-hidden="true"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
          ></path>
        </svg>
      </button>

      {/* Navigation Bar */}
      <nav className="bg-white fixed w-full z-20 top-0 start-0 border-b border-gray-200 transition-colors duration-300">
        <div className="max-w-full flex flex-wrap p-2 w-full items-center justify-between">
          <SlideIn direction="left" duration={400}>
            <div className="flex items-center gap-4">
              <img
                className="h-auto w-40 rounded-lg pt-2 pl-2 pr-1 hover:opacity-80 transition-opacity duration-300"
                src="/beekay_logo.png"
                alt="Beekay"
              />
              <div className="hidden md:flex flex-col">
                <h2 className="text-lg font-bold text-gray-900">
                  Water Sprinkler
                </h2>
                <p className="text-xs text-gray-600">
                  Industrial Dust Control System
                </p>
              </div>
            </div>
          </SlideIn>

          <SlideIn direction="right" duration={400} className="hidden md:flex">
            <article className="text-center">
              <h4 className="text-sm md:text-xl font-semibold text-gray-900">
                INTELLIGENT WATER SPRINKLER SYSTEM
              </h4>
            </article>
          </SlideIn>

          <SlideIn direction="right" duration={400}>
            <div className="flex items-center gap-4">
              {/* Make in India Logo */}
              <img
                className="h-8 w-auto rounded-lg pt-1 pl-1 pr-1 hover:opacity-80 transition-opacity duration-300"
                src="/makeinindia.png"
                alt="Make in India"
              />

              {/* TE Logo */}
              <img
                className="h-16 w-auto rounded-lg pt-1 pl-1 pr-1 hover:opacity-80 transition-opacity duration-300"
                src="/tetech-logo.png"
                alt="TE"
                title="Powered by TE TECH SOLUTION"
              />
            </div>
          </SlideIn>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        id="default-sidebar"
        className={`fixed top-0 left-0 z-40 w-64 pt-20 h-screen transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
          }`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 flex flex-col justify-between transition-colors duration-300">
          <FadeIn duration={500}>
            <ul className="space-y-2 font-medium">
              {navItems.map((item, idx) => (
                <SlideIn key={item.href} direction="left" delay={100 + idx * 50}>
                  <li>
                    <NavItem
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isActive={location.pathname === item.href}
                    />
                  </li>
                </SlideIn>
              ))}
            </ul>
          </FadeIn>

          {/* Logout Button */}
          <SlideIn direction="up">
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all duration-300 transform hover:scale-105"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 17l5-5m0 0l-5-5m5 5H9"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5V4a2 2 0 00-2-2H5a2 2 0 00-2 2v16a2 2 0 002 2h6a2 2 0 002-2v-1"
                />
              </svg>
              <span className="flex-1 ms-3 font-medium">Logout</span>
            </button>
          </SlideIn>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="sm:ml-64 mt-24 min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300">
        <main className="p-4 md:p-6 lg:p-8">
          <FadeIn duration={500}>
            <Outlet />
          </FadeIn>
        </main>
      </div>
    </>
  );
}

export default EnhancedDashboardLayout;
