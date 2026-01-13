import React, { useState } from 'react';
import Header from '@features/navigation/components/Header';
import Sidebar from '@features/navigation/components/Sidebar';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLandingPage = currentPageName === 'Home';
  const isDashboardPage = ['Dashboard', 'Project', 'Reports', 'Team', 'Settings'].includes(
    currentPageName
  );

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenuButton={isDashboardPage} />

      {isDashboardPage && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <main className={isDashboardPage ? 'lg:pl-64' : ''}>{children}</main>
    </div>
  );
}
