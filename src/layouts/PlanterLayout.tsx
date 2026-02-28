import { useState, type ReactNode } from 'react';
import Header from '@/features/navigation/components/Header';
import AppSidebar from '@/features/navigation/components/AppSidebar';

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

            {isDashboardPage && <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

            <main className={isDashboardPage ? 'lg:pl-64' : ''}>{children}</main>
        </div>
    );
}
