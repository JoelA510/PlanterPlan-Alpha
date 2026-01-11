import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from 'utils';
import { Button } from '@/components/ui/button';
import { cn } from 'lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  ChevronLeft,
  Home,
  FileText,
} from 'lucide-react';

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

export default function Sidebar({ isOpen, onClose, currentProject }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname.includes(path.toLowerCase());
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-40 transition-transform duration-300 lg:translate-x-0 shadow-lg lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Navigation</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {navigationItems.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

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
                              ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
            ))}

            {/* Project Context */}
            {currentProject && (
              <div className="pt-4 border-t border-slate-200">
                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Current Project
                </h3>
                <div className="px-3 py-2 rounded-lg bg-slate-50">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {currentProject.name}
                  </p>
                  <Link to={createPageUrl(`Project?id=${currentProject.id}`)}>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-brand-600 hover:text-brand-700"
                    >
                      View Project →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </nav>

          {/* Help Section */}
          <div className="p-4 border-t border-slate-200">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-600 hover:text-slate-900"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Help & Support</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
