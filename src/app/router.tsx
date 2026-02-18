import { createBrowserRouter } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import { Layout } from '@/shared/layout/Layout'
import { supabase } from '@/shared/db/client'


// Loader to protect routes
const protectedLoader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        // return redirect('/login') // For now, let AuthProvider handle it or use redirect
        // Actually, AuthProvider handles the "loading" state and "user" state.
        // If we use loaders, we can block navigation. 
        // But AuthProvider is already wrapping everything.
        // Let's keep it simple: Routes are just components, AuthProvider protects them.
        return null
    }
    return null
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        loader: protectedLoader,
        children: [
            {
                index: true,
                element: <Dashboard />
            },
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
