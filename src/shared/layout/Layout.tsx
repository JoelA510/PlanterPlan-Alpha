import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { ViewAsProvider } from '@/app/contexts/ViewAsContext'
import { useEffect } from 'react'

export function Layout() {
    const { user, signOut, loading } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login')
        }
    }, [user, loading, navigate])

    if (loading) return <div className="flex h-screen items-center justify-center">Loading session...</div>

    const userRole = user?.app_metadata?.role || user?.user_metadata?.role || 'viewer'

    return (
        <ViewAsProvider userRole={userRole}>
            <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-6 border-b border-gray-100">
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <span className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">P</span>
                            PlanterPlan
                        </h1>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === '/'} />
                        {/* <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" active={location.pathname === '/settings'} /> */}
                    </nav>

                    <div className="p-4 border-t border-gray-100">
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                {user?.email?.[0].toUpperCase() ?? 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user?.email}</p>
                                <p className="text-xs text-gray-500">Free Plan</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </ViewAsProvider>
    )
}

function NavItem({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${active
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </Link>
    )
}
