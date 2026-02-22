import { createBrowserRouter, redirect } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import { Layout } from '@/shared/layout/Layout'
import { supabase } from '@/shared/db/client'

const protectedLoader = async ({ request }: { request: Request }) => {
    // E2E Bypass Check
    const url = new URL(request.url)
    if (url.searchParams.get('e2e_bypass') === 'true') {
        return null
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        return redirect('/login')
    }
    return null
}

const publicLoader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        return redirect('/dashboard')
    }
    return null
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />,
    },
    {
        path: '/login',
        element: <Login />,
        loader: publicLoader
    },
    {
        element: <Layout />,
        loader: protectedLoader,
        children: [
            {
                path: 'dashboard',
                element: <Dashboard />
            },
            {
                path: 'project/:projectId',
                async lazy() {
                    const { default: Project } = await import('@/pages/Project')
                    return { Component: Project }
                }
            },
            {
                path: 'reports',
                async lazy() {
                    const { default: Reports } = await import('@/pages/Reports')
                    return { Component: Reports }
                }
            },
            {
                path: 'settings',
                async lazy() {
                    const { default: Settings } = await import('@/pages/Settings')
                    return { Component: Settings }
                }
            },
            {
                path: 'team',
                async lazy() {
                    const { default: Team } = await import('@/pages/Team')
                    return { Component: Team }
                }
            },
            {
                path: 'tasks',
                async lazy() {
                    const { default: TasksPage } = await import('@/pages/TasksPage')
                    return { Component: TasksPage }
                }
            }
        ]
    }
])
