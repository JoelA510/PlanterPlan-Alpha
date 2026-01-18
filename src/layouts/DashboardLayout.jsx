import { useState } from 'react';
import Header from '@features/navigation/components/Header';
import ProjectSidebarContainer from '@features/navigation/components/ProjectSidebarContainer';
import { CommandPalette } from '@shared/ui/CommandPalette';
import { useUserProjects } from '@features/projects/hooks/useUserProjects';
import { useAuth } from '@app/contexts/AuthContext'; // Assuming this exists or similar
import MobileFAB from '@features/mobile/MobileFAB';

export default function DashboardLayout({ children, sidebar, selectedTaskId }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { projects } = useUserProjects(user?.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <CommandPalette projects={projects || []} />
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} showMenuButton={true} />

      <div
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-40 transition-transform duration-300 lg:translate-x-0 shadow-lg lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebar ? (
          // If custom sidebar passed (e.g. ProjectSidebar with logic), render it
          sidebar
        ) : (
          // Default Sidebar for static pages
          <ProjectSidebarContainer
            onNavClick={() => setSidebarOpen(false)}
            selectedTaskId={selectedTaskId}
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

      <main className="lg:pl-64 pt-6 h-[calc(100vh-4rem)]">{children}</main>
      <MobileFAB onAddTask={() => {/* Handler logic to open modal if global */ }} />
    </div>
  );
}
