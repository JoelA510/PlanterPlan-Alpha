import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from 'utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, Home, LayoutDashboard, User, Settings, LogOut, Menu } from 'lucide-react';
import { planter } from 'api/planterClient';

export default function Header({ onMenuToggle, showMenuButton = false }) {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    planter.auth
      .me()
      .then(setUser)
      .catch(() => { });
  }, []);

  const handleLogout = async () => {
    await planter.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {showMenuButton && (
              <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            )}

            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-lg">PlanterPlan</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                <Home className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>

            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-slate-200">
                      <AvatarFallback className="bg-brand-100 text-brand-700 font-semibold text-sm">
                        {getInitials(user.full_name || user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.full_name || 'User'}</p>
                      <p className="text-xs leading-none text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <Link to={createPageUrl('Settings')}>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-rose-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
