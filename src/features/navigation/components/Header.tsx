import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { CheckCircle2, User, Settings, LogOut, Menu, ChevronRight } from 'lucide-react';

import { useUser } from '@/shared/hooks/useUser';
import { useAuth } from '@/shared/contexts/AuthContext';


interface HeaderProps {
 onMenuToggle?: () => void;
 showMenuButton?: boolean;
}

export default function Header({ onMenuToggle, showMenuButton = false }: HeaderProps) {
 const { data: userData } = useUser();
  const user = userData as { user_metadata?: { full_name?: string } } | null; // Temporary cast to resolve persistent inference issues in Header
 const location = useLocation();


 // Simple Breadcrumb Logic
 const pathSegments = location.pathname.split('/').filter(Boolean);
 const currentSection = pathSegments[0]
 ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
 : 'Home';

 const navigate = useNavigate();

 const { signOut } = useAuth();

 const handleLogout = async () => {
 await signOut();
 navigate('/auth/login');
 };

 const getInitials = (name: string | null | undefined) => {
 if (!name) return 'U';
 return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
 };

 return (
 <nav className="bg-card text-card-foreground border-b border-border sticky top-0 z-50 shadow-sm">
 <div className="px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between h-16">
 <div className="flex items-center gap-3">
 {showMenuButton && (
 <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden" aria-label="Menu">
 <Menu className="w-5 h-5" />
 </Button>
 )}

 <Link to="/Dashboard" className="flex items-center gap-2" aria-label="PlanterPlan Home">
 <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shadow-sm">
 <CheckCircle2 className="w-5 h-5 text-white" />
 </div>
 <span className="font-bold text-orange-600 text-lg hidden sm:block">PlanterPlan</span>
 </Link>

 {/* Breadcrumb Separator for Context */}
 {user && (
 <div className="hidden md:flex items-center gap-2 ml-2 text-slate-400">
 <ChevronRight className="w-4 h-4" />
 <span className="font-medium text-orange-600 ">{currentSection}</span>
 </div>
 )}
 </div>

 <div className="flex items-center gap-2">
 {user && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" className="relative h-9 w-9 rounded-full">
 <Avatar className="h-9 w-9 border-2 border-slate-200 ">
 <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-sm ">
 {getInitials(user.full_name || user.email)}
 </AvatarFallback>
 </Avatar>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent className="w-56" align="end">
 <div className="flex items-center justify-start gap-2 p-2">
 <div className="flex flex-col space-y-1">
 <p className="text-sm font-medium leading-none">{user.full_name || 'User'}</p>
 <p className="text-xs leading-none text-slate-500 ">{user.email}</p>
 </div>
 </div>
 <DropdownMenuSeparator />
 <DropdownMenuItem>
 <User className="mr-2 h-4 w-4" />
 <span>Profile</span>
 </DropdownMenuItem>
 <Link to="/Settings">
 <DropdownMenuItem>
 <Settings className="mr-2 h-4 w-4" />
 <span>Settings</span>
 </DropdownMenuItem>
 </Link>
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={handleLogout} className="text-red-600 ">
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

