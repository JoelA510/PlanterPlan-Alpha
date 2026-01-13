import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@shared/lib/utils';
import { Button } from "@shared/ui/button";
import { cn } from "@shared/lib/utils";
import {
    LayoutDashboard,
    BarChart3,
    Settings,
    HelpCircle,
    ChevronLeft,
} from 'lucide-react';

const navigationItems = [
    {
        title: 'Main',
        items: [
            { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
            { name: 'Reports', icon: BarChart3, path: 'Reports' }
        ]
    },
    {
        title: 'Tools',
        items: [
            { name: 'Settings', icon: Settings, path: 'Settings' }
        ]
    }
];

export default function AppSidebar({ onClose, currentProject, className }) {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname.includes(path.toLowerCase());
    };

    return (
        <div className={cn("flex flex-col h-full bg-white border-r border-slate-200", className)}>
            <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 lg:hidden user-select-none">
                    <h2 className="font-semibold text-slate-900">Navigation</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden"
                    >
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
                                                    "w-full justify-start gap-3 transition-all",
                                                    active
                                                        ? "bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium"
                                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
        </div>
    );
}
