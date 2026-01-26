/**
 * ViewAsSelector.jsx
 * 
 * Dropdown selector for privileged users to preview app as different roles.
 * Only renders if user has permission to view-as.
 * 
 * Placement: Header, between breadcrumb and user avatar.
 */

import { Eye, ChevronDown, Check } from 'lucide-react';
import { useViewAs } from '@app/contexts/ViewAsContext';
import { Button } from '@shared/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';

export default function ViewAsSelector() {
    const {
        actualRole,
        viewingAs,
        effectiveRole,
        canViewAs,
        availableRoles,
        setViewingAs,
        resetViewAs
    } = useViewAs();

    // Don't render if user cannot view-as
    if (!canViewAs) {
        return null;
    }

    const isViewing = viewingAs !== null;
    const currentLabel = availableRoles.find(r => r.value === effectiveRole)?.label || effectiveRole;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={isViewing ? 'default' : 'ghost'}
                    size="sm"
                    className={`
            flex items-center gap-2 text-sm font-medium
            ${isViewing
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-800/50'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                        }
          `}
                >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">
                        {isViewing ? `Viewing as ${currentLabel}` : 'View As'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Preview as role
                </div>
                <DropdownMenuSeparator />

                {/* Reset to actual role */}
                <DropdownMenuItem
                    onClick={resetViewAs}
                    className={!isViewing ? 'bg-slate-100 dark:bg-slate-700' : ''}
                >
                    <div className="flex items-center gap-2 w-full">
                        <span className="flex-1">
                            {actualRole.charAt(0).toUpperCase() + actualRole.slice(1)}
                            <span className="text-xs text-slate-400 ml-1">(You)</span>
                        </span>
                        {!isViewing && <Check className="w-4 h-4 text-brand-600" />}
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Available roles to view as */}
                {availableRoles
                    .filter(role => role.value !== actualRole)
                    .map((role) => (
                        <DropdownMenuItem
                            key={role.value}
                            onClick={() => setViewingAs(role.value)}
                            className={viewingAs === role.value ? 'bg-amber-50 dark:bg-amber-900/30' : ''}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <span className="flex-1">{role.label}</span>
                                {viewingAs === role.value && <Check className="w-4 h-4 text-amber-600" />}
                            </div>
                        </DropdownMenuItem>
                    ))
                }
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
