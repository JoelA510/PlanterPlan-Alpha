import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import Header from '@/features/navigation/components/Header';
import ProjectSidebarContainer from '@/features/navigation/components/ProjectSidebarContainer';
import { CommandPalette } from '@/shared/ui/CommandPalette';
import { useUserProjects } from '@/features/projects/hooks/useUserProjects';
import { useAuth } from '@/shared/contexts/AuthContext'; // Assuming this exists or similar
import MobileFAB from '@/features/mobile/MobileFAB';

export default function DashboardLayout({ sidebar, children }: { sidebar?: React.ReactNode, children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const { data: projects } = useUserProjects();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  return (
    <>
      <div className="min-h-screen bg-background">
        <CommandPalette projects={projects || []} />
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenuButton={true} />

        <aside
          className={cn(
            'fixed top-16 left-0 bottom-0 w-64 bg-card border-r border-border z-40 transition-transform duration-300 lg:translate-x-0 shadow-lg lg:shadow-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebar ? (
            // If custom sidebar passed (e.g. ProjectSidebar with logic), render it
            sidebar
          ) : (
            // Default Sidebar for static pages
            <ProjectSidebarContainer
              onNavClick={() => setSidebarOpen(false)}
              selectedTaskId={projectId}
            />
          )}
        </aside>
        {/* Mobile Overlay for Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="lg:pl-64 pt-6 h-[calc(100vh-4rem)]">{children || <Outlet />}</main>
        <MobileFAB />
      </div>
    </>
  );
}
