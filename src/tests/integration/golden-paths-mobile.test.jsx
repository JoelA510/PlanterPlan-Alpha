import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@app/contexts/AuthContext';
import { ToastProvider } from '@app/contexts/ToastContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@app/contexts/ThemeContext';
import { ViewAsProvider } from '@app/contexts/ViewAsContext';
import { ROLES } from '@app/constants/index';


// --- Mocks ---
vi.mock('@app/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
    },
}));

// Mock Project Service
vi.mock('@features/projects/services/projectService', () => ({
    useUserProjects: vi.fn(() => ({ projects: [], loading: false })),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};


// --- Helper: Render ---
const renderWithProviders = (ui) => {

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const mockUser = { id: 'user-123' };

    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthContext.Provider value={{ user: mockUser }}>
                    <ViewAsProvider userRole={ROLES.ADMIN}>
                        <ToastProvider>
                            <MemoryRouter>{ui}</MemoryRouter>
                        </ToastProvider>
                    </ViewAsProvider>
                </AuthContext.Provider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

describe('Browser Verification: Golden Paths (Mobile)', () => {
    // Mobile Viewport
    beforeAll(() => {
        global.innerWidth = 375;
        global.dispatchEvent(new Event('resize'));
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('hides sidebar by default and shows Mobile FAB', async () => {

        // 1. Sidebar should be hidden (check class)
        // The sidebar container is the direct parent of the sidebar prop content or ProjectSidebarContainer
        // We didn't pass sidebar prop, so it renders ProjectSidebarContainer wrapper.
        // We look for the fixed sidebar container div.
        // It has classes: "fixed top-16 left-0 ... -translate-x-full"

        // Attempt to find the sidebar container. It usually has "w-64".
        // Or we can look for "ProjectSidebarContainer" mock if we mocked it, but we didn't mock the layout internals fully.
        // Real DashboardLayout renders.

        // Let's find the sidebar wrapper by its role or content. 
        // Since we didn't mock sidebar content, it tries to render ProjectSidebarContainer.
        // That might crash if we don't mock it or providing data.
        // Let's check if ProjectSidebarContainer needs data. Yes useUserProjects.
        // We mocked useUserProjects above.

        // Better strategy: Pass a simple sidebar mock to DashboardLayout to avoid complexity
        renderWithProviders(
            <DashboardLayout sidebar={<div data-testid="sidebar">Sidebar</div>}>
                <div data-testid="content">Main Content</div>
            </DashboardLayout>
        );

        const sidebar = screen.getByTestId('sidebar').parentElement;
        expect(sidebar).toHaveClass('-translate-x-full'); // Hidden on mobile default

        // 2. Mobile Header/Menu Button should be visible
        const menuBtn = screen.getByRole('button', { name: /menu/i });
        expect(menuBtn).toBeVisible();

        // 3. Click Menu -> Sidebar should show
        fireEvent.click(menuBtn);
        expect(sidebar).toHaveClass('translate-x-0');
        expect(sidebar).not.toHaveClass('-translate-x-full');

        // 4. Mobile FAB should be present
        // MobileFAB renders button "Add Task" or similar icon
        // It's usually an icon button with +
        // Let's look for the FAB button.
        const fab = screen.getByRole('button', { name: /add task/i });
        expect(fab).toBeVisible();
    });
});
