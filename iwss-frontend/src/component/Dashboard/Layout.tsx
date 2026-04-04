import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";

function isAuthenticated() {
  const isLoggedIn = localStorage.getItem("logged-in");
  return isLoggedIn === "true";
}

function DashboardLayout() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <>
      <button
        data-drawer-target="default-sidebar"
        data-drawer-toggle="default-sidebar"
        aria-controls="default-sidebar"
        type="button"
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
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
            clip-rule="evenodd"
            fill-rule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
          ></path>
        </svg>
      </button>
      <nav className="bg-white fixed w-full z-20 top-0 start-0 border-b border-gray-200">
        <div className="max-w-full flex flex-wrap p-2 w-full">
          <div className="w-61 border-r-1 border-r-gray-200">
            <img
              className="h-auto w-45 rounded-lg pt-2 pl-2 pr-1"
              src="/beekay_logo.png"
              alt="Beekay"
            />
          </div>
          <div
            className="items-center justify-between hidden w-full grow md:flex md:w-auto md:order-1 ml-10"
            id="navbar-sticky"
          >
            <article className="format text-4xl">
              <h4>INTELLIGENT WATER SPRINKLER SYSTEM FOR MINES</h4>
            </article>
            <div className="flex flex-row justify-end items-center">
              <img
                className="h-10 w-auto rounded-lg pt-1 pl-1 pr-1"
                src="/makeinindia.png"
                alt="Make in india"
              />
              <img
                className="h-auto w-20 rounded-lg pt-1 pl-1 pr-1"
                src="/tetech-logo.png"
                alt="TE"
                title="Powered by TE TECH SOLUTION"
              />
            </div>
          </div>
        </div>
      </nav>

      <aside
        id="default-sidebar"
        className="fixed top-0 left-0 z-40 w-64 pt-20 h-screen transition-transform -translate-x-full sm:translate-x-0"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-2 overflow-y-auto bg-gray-50 flex flex-col justify-between">
          <ul className="space-y-2 font-medium">
            <li className="pt-3">
              <a
                href="/"
                className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group"
              >
                <svg
                  className="w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V9.75z" />
                </svg>
                <span className="flex-1 ms-3 whitespace-nowrap">Home</span>
              </a>
            </li>
            <li>
              <a
                href="report"
                className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group"
              >
                <svg
                  className="shrink-0 w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
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
                <span className="flex-1 ms-3 whitespace-nowrap">Telemetry</span>
              </a>
            </li>

            <li>
              <a
                href="manage-data"
                className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group"
              >
                <svg
                  className="shrink-0 w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6c0-1.105 3.582-2 8-2s8 .895 8-2-3.582 2-8 2-8-.895-8-2zm16 0v12c0 1.105-3.582 2-8 2s-8-.895-8-2V6m16 6c0 1.105-3.582 2-8 2s-8-.895-8-2"
                  />
                </svg>
                <span className="flex-1 ms-3 whitespace-nowrap">Manage</span>
              </a>
            </li>
            <li>
              <a
                href="analytic-data"
                className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group"
              >
                <svg
                  className="shrink-0 w-6 h-6 text-gray-700 transition duration-75 group-hover:text-gray-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 3h2v18H4V3zm7 7h2v11h-2V10zm7-4h2v15h-2V6z" />
                </svg>
                <span className="flex-1 ms-3 whitespace-nowrap">Analytics</span>
              </a>
            </li>
          </ul>
          <div className="items-center text-gray-800">
            <h3
              className="hover:cursor-pointer items-center"
              onClick={() => {
                localStorage.removeItem("logged-in");
                navigate("/login");
              }}
            >
              Logout
            </h3>
          </div>
        </div>
      </aside>
      <div className="sm:ml-64 mt-25">
        <div className="p-4">
          <Outlet />
        </div>
      </div>
    </>
  );
}

export default DashboardLayout;
