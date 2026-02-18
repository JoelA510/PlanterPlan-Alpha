import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/shared/db/client'
import { useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

function LoginScreen() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) {
            setMessage('Error: ' + error.message)
        } else {
            setMessage('Check your email for the login link!')
        }
        setLoading(false)
    }

    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white shadow rounded-lg max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">PlanterPlan v2</h2>
                <p className="text-gray-500 mb-6">Sign in with Magic Link</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-2 border rounded"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Send Magic Link'}
                    </button>
                </form>
                {message && <p className="mt-4 text-sm text-blue-600">{message}</p>}

                <div className="mt-8 border-t pt-4">
                    <p className="text-xs text-gray-400">Dev Mode Shortcut:</p>
                    {import.meta.env.VITE_TEST_EMAIL && import.meta.env.VITE_TEST_PASSWORD ? (
                        <button
                            type="button"
                            onClick={async () => {
                                setLoading(true)
                                const { error } = await supabase.auth.signInWithPassword({
                                    email: import.meta.env.VITE_TEST_EMAIL,
                                    password: import.meta.env.VITE_TEST_PASSWORD,
                                })
                                if (error) setMessage('Dev Login Failed: ' + error.message)
                                setLoading(false)
                            }}
                            className="text-xs text-blue-500 underline hover:text-blue-700"
                        >
                            (Auto-Login as Test User)
                        </button>
                    ) : (
                        <span className="text-xs text-gray-300">(Configure .env for Dev Login)</span>
                    )}
                </div>
            </div>
        </div>
    )
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="p-8">Loading session...</div>
    if (!user) return <LoginScreen />
    return <>{children}</>
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AuthWrapper>
                    <RouterProvider router={router} />
                </AuthWrapper>
            </AuthProvider>
        </QueryClientProvider>
    )
}

export default App
