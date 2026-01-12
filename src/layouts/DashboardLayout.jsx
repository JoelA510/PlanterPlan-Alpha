import React, { useState } from 'react';
import Header from '@features/navigation/components/Header';
import Sidebar from '@features/navigation/components/Sidebar';

// Replaced Layout logic to match merge aesthetics
export default function DashboardLayout({ children, currentProject, sidebar }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        showMenuButton={true}
      />

      <div className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-40 transition-transform duration-300 lg:translate-x-0 shadow-lg lg:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebar ? (
          // If custom sidebar passed (e.g. SideNav with logic), render it
          sidebar
        ) : (
          // Default Sidebar for static pages
          <Sidebar
            isOpen={true} // Wrapper handles visibility now
            onClose={() => setSidebarOpen(false)}
            currentProject={currentProject}
          />
        )}
      </div>
      {/* Mobile Overlay for Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:pl-64 pt-6 h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
