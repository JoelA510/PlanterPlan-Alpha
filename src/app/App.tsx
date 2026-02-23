import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import localforage from 'localforage'
import { AuthProvider } from '@/app/contexts/AuthContext'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ThemeProvider } from '@/app/contexts/ThemeContext'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes standard cache
            gcTime: 24 * 60 * 60 * 1000, // 24 hours garbage collection for offline mode
        },
    },
})

const asyncStoragePersister = createAsyncStoragePersister({
    storage: localforage,
    key: 'planterplan-react-query-v1'
})

function App() {
    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
        >
            <ThemeProvider>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </ThemeProvider>
        </PersistQueryClientProvider>
    )
}

export default App
