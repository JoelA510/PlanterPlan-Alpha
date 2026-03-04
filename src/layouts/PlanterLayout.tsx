import { useState, type ReactNode } from 'react';
import Header from '@/features/navigation/components/Header';
import AppSidebar from '@/features/navigation/components/AppSidebar';
import { cn } from '@/shared/lib/utils';

interface LayoutProps {
 children: ReactNode;
 currentPageName: string;
}

const DASHBOARD_PAGES = ['Dashboard', 'Project', 'Reports', 'Team', 'Settings'] as const;

export default function Layout({ children, currentPageName }: LayoutProps): JSX.Element {
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const isLandingPage = currentPageName === 'Home';
 const isDashboardPage = (DASHBOARD_PAGES as readonly string[]).includes(currentPageName);

 if (isLandingPage) {
 return <>{children}</>;
 }

 return (
 <div className="min-h-screen bg-slate-50">
 <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenuButton={isDashboardPage} />

 {isDashboardPage && (
 <aside className={cn(
 'fixed top-16 left-0 bottom-0 w-64 bg-card border-r border-border z-40 transition-transform duration-300 lg:translate-x-0',
 sidebarOpen ? 'translate-x-0' : '-translate-x-full'
 )}>
 <AppSidebar currentProject={null} onClose={() => setSidebarOpen(false)} />
 </aside>
 )}

 <main className={isDashboardPage ? 'lg:pl-64 flex flex-col h-[calc(100vh-4rem)]' : ''}>{children}</main>
 </div>
 );
}
