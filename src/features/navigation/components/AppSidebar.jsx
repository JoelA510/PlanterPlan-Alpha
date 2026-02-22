import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { createPageUrl, cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { LayoutDashboard, BarChart3, Settings, HelpCircle, ChevronLeft } from 'lucide-react';

const navigationItems = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
      { name: 'Reports', icon: BarChart3, path: 'Reports' },
    ],
  },
  {
    title: 'Tools',
    items: [{ name: 'Settings', icon: Settings, path: 'Settings' }],
  },
];

export default function AppSidebar({ onClose, currentProject, className }) {
  const location = useLocation();

  return (
    <div className={cn('flex flex-col h-full bg-card border-r border-border', className)}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden user-select-none">
          <h2 className="font-semibold text-card-foreground">Navigation</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="app-sidebar-nav">
          {useMemo(() => navigationItems.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  // Optimization: moved isActive check here, could be memoized further but this map buffer is sufficient
                  const active = location.pathname.includes(item.path.toLowerCase());

                  return (
                    <Link
                      key={item.path}
                      to={createPageUrl(item.path)}
                      onClick={() => window.innerWidth < 1024 && onClose()}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-start gap-3 transition-all',
                          active
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/60 font-medium'
                            : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          )), [location.pathname, onClose])}

          {/* Project Context */}
          {currentProject && (
            <div className="pt-4 border-t border-border">
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Project
              </h3>
              <div className="px-3 py-2 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-card-foreground truncate">{currentProject.name}</p>
                <Link to={createPageUrl(`Project?id=${currentProject.id}`)}>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-orange-600 hover:text-orange-700"
                  >
                    View Project →
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Help Section */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-card-foreground hover:bg-muted/50"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help & Support</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
