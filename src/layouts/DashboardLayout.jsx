import React, { useState } from 'react';

const DashboardLayout = ({ children, sidebar }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Inject props into sidebar to handle mobile closing
  const sidebarWithProps = React.isValidElement(sidebar)
    ? React.cloneElement(sidebar, { onNavClick: () => setSidebarOpen(false) })
    : sidebar;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden app-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl animate-slide-right side-nav">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="sr-only">Close sidebar</span>
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {/* Mobile Sidebar Content */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto side-nav-content">{sidebarWithProps}</div>
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true">
            {/* Force sidebar to shrink to fit close icon */}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 w-64 border-r border-gray-200 bg-white side-nav">
        <div className="flex flex-col flex-1 h-full side-nav-content">{sidebarWithProps}</div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden main-content">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center">
            <span className="font-bold text-lg text-slate-800">PlanterPlan</span>
          </div>
          <button
            type="button"
            className="-mr-3 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto focus:outline-none relative bg-slate-50">
          <div className="min-h-full flex flex-col px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
