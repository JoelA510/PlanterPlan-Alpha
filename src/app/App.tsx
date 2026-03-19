import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/shared/contexts/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import Dashboard from '../pages/Dashboard';
import Reports from '../pages/Reports';
import Project from '../pages/Project';
import Settings from '../pages/Settings';
import TasksPage from '../pages/TasksPage';
import DailyTasks from '../pages/DailyTasks';
import LoginForm from '@/pages/components/LoginForm';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
 const { user, loading } = useAuth();
 if (loading) return null;
 return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
 return (
 <QueryClientProvider client={queryClient}>
 <AuthProvider>
 <Router>
 <Routes>
 <Route path="/login" element={<LoginForm />} />
 <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
 <Route index element={<Navigate to="/dashboard" replace />} />
 <Route path="dashboard" element={<Dashboard />} />
 <Route path="reports" element={<Reports />} />
 <Route path="Project/:projectId" element={<Project />} />
 <Route path="tasks" element={<TasksPage />} />
 <Route path="daily" element={<DailyTasks />} />
 <Route path="settings" element={<Settings />} />
 </Route>
 </Routes>
 </Router>
 <Toaster richColors position="top-right" />
 </AuthProvider>
 </QueryClientProvider >
 );
}
