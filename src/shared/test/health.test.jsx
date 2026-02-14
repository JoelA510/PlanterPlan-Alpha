import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { useContext } from 'react';
import { renderWithProviders } from './utils';
import { createMockUser, createMockTask, createMockProject } from './factories';
import { AuthContext } from '../../app/contexts/AuthContext';

describe('Testing Strategy Phase 1: Health Check', () => {

    describe('Factories', () => {
        it('should generate a valid Mock User', () => {
            const user = createMockUser();
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('email');
            expect(user.role).toBe('owner'); // Default
        });

        it('should generate a valid Mock Project', () => {
            const project = createMockProject();
            expect(project).toHaveProperty('id');
            expect(project).toHaveProperty('title');
            expect(project.status).toBe('active');
        });

        it('should generate a valid Mock Task', () => {
            const task = createMockTask();
            expect(task).toHaveProperty('id');
            expect(task).toHaveProperty('title');
            expect(task.status).toBe('todo');
        });

        it('should allow overrides', () => {
            const specializedUser = createMockUser({ role: 'admin', email: 'admin@test.com' });
            expect(specializedUser.role).toBe('admin');
            expect(specializedUser.email).toBe('admin@test.com');
        });
    });

    describe('renderWithProviders', () => {
        it('should render a component wrapped in contexts', () => {
            const TestComponent = () => <div>Test Content</div>;

            renderWithProviders(<TestComponent />);

            expect(screen.getByText('Test Content')).toBeInTheDocument();
        });

        it('should provide default auth context', () => {
            const AuthConsumer = () => {
                const context = useContext(AuthContext);
                if (!context) return <div>No Context</div>;
                return <div>Auth Loaded: {context.user?.email}</div>;
            }

            renderWithProviders(<AuthConsumer />);
            expect(screen.getByText(/Auth Loaded/)).toBeInTheDocument();
        });
    });
});
