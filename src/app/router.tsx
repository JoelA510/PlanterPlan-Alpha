import { createBrowserRouter, } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Home from '@/pages/Home'
import LoginForm from '@/features/auth/components/LoginForm'
import { Layout } from '@/shared/layout/Layout'
// Removed blocking loader imports: import { supabase } from '@/shared/db/client'

// Simple loading fallback
const PageLoader = () => (
    <div className="flex items-center justify-center p-8 text-gray-400">
        Loading view...
    </div>
)

// Simple error boundary component
const GlobalErrorBoundary = () => (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 text-red-900 h-full">
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p>There was an error loading this view. Please refresh or try again.</p>
    </div>
)

const e2eBypassLoader = ({ request }: { request: Request }) => {
    if (import.meta.env.DEV) {
        const url = new URL(request.url)
        if (url.searchParams.get('e2e_bypass') === 'true') {
            return null
        }
    }
    return null
}

const Dashboard = lazy(() => import('@/pages/Dashboard'))

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />,
    },
    {
        path: '/login',
        element: <LoginForm />,
    },
    {
        element: <Layout />,
        loader: e2eBypassLoader,
        errorElement: <GlobalErrorBoundary />,
        children: [
            {
                path: 'dashboard',
                element: <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
            },
            {
                path: 'project/:projectId',
                async lazy() {
                    const { default: Project } = await import('@/pages/Project')
                    return { Component: () => <Suspense fallback={<PageLoader />}><Project /></Suspense> }
                }
            },
            {
                path: 'reports',
                async lazy() {
                    const { default: Reports } = await import('@/pages/Reports')
                    return { Component: () => <Suspense fallback={<PageLoader />}><Reports /></Suspense> }
                }
            },
            {
                path: 'settings',
                async lazy() {
                    const { default: Settings } = await import('@/pages/Settings')
                    return { Component: () => <Suspense fallback={<PageLoader />}><Settings /></Suspense> }
                }
            },
            {
                path: 'team',
                async lazy() {
                    const { default: Team } = await import('@/pages/Team')
                    return { Component: () => <Suspense fallback={<PageLoader />}><Team /></Suspense> }
                }
            },
            {
                path: 'tasks',
                async lazy() {
                    const { default: TasksPage } = await import('@/pages/TasksPage')
                    return { Component: () => <Suspense fallback={<PageLoader />}><TasksPage /></Suspense> }
                }
            }
        ]
    }
])
