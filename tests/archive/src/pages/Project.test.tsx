
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Project from './Project';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useProjectData } from '@/features/projects/hooks/useProjectData';
import { useProjectBoard } from '@/features/projects/hooks/useProjectBoard';
import '@testing-library/jest-dom';

// Mocks
vi.mock('lucide-react', async () => {
 const actual = await vi.importActual('lucide-react');
 return {
 ...actual,
 Loader2: () => <div data-testid="loader">Loading...</div>,
 };
});
vi.mock('react-router-dom', () => ({
 useParams: vi.fn(),
}));

vi.mock('@/shared/contexts/AuthContext', () => ({
 useAuth: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
 useQueryClient: vi.fn(() => ({
 invalidateQueries: vi.fn(),
 })),
 useMutation: vi.fn(() => ({
 mutateAsync: vi.fn(),
 })),
}));

vi.mock('@/shared/db/client', () => ({
 supabase: {
 channel: vi.fn(() => ({
 on: vi.fn().mockReturnThis(),
 subscribe: vi.fn().mockReturnThis(),
 })),
 removeChannel: vi.fn(),
 },
}));

vi.mock('@/features/projects/hooks/useProjectData', () => ({
 useProjectData: vi.fn(),
}));

vi.mock('@/features/projects/hooks/useProjectBoard', () => ({
 useProjectBoard: vi.fn(),
}));

// Mock child components to keep it a unit test
vi.mock('@/features/projects/components/ProjectHeader', () => ({
 default: () => <div data-testid="project-header">Header</div>,
}));

vi.mock('@/features/projects/components/ProjectTabs', () => ({
 default: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
 <div data-testid="project-tabs">
 <button onClick={() => onTabChange('board')}>Board</button>
 <button onClick={() => onTabChange('people')}>People</button>
 <span>Active: {activeTab}</span>
 </div>
 ),
}));

describe('Project Page', () => {
 const mockProject = { id: 'p1', title: 'Test Project', creator: 'u1' };
 const mockUser = { id: 'u1', email: 'test@example.com' };

 beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(useParams).mockReturnValue({ projectId: 'p1' });
 vi.mocked(useAuth).mockReturnValue({ user: mockUser } as ReturnType<typeof useAuth>);
 vi.mocked(useProjectData).mockReturnValue({
 project: mockProject,
 loadingProject: false,
 phases: [],
 milestones: [],
 tasks: [],
 teamMembers: [],
 } as unknown as ReturnType<typeof useProjectData>);
 vi.mocked(useProjectBoard).mockReturnValue({
 state: { activeTab: 'board', selectedPhase: null, selectedTask: null },
 actions: {
 setActiveTab: vi.fn(),
 setSelectedPhase: vi.fn(),
 setSelectedTask: vi.fn(),
 },
 handlers: {},
 computed: { mapTaskWithState: <T,>(t: T) => t },
 } as unknown as ReturnType<typeof useProjectBoard>);
 });

 it('renders loader when project is loading', () => {
 vi.mocked(useProjectData).mockReturnValue({ loadingProject: true } as unknown as ReturnType<typeof useProjectData>);
 render(<Project />);
 expect(screen.getByTestId('loader')).toBeInTheDocument();
 });

 it('renders project content when data is loaded', () => {
 render(<Project />);
 expect(screen.getByTestId('project-header')).toBeInTheDocument();
 expect(screen.getByTestId('project-tabs')).toBeInTheDocument();
 });

 it('switches tabs correctly', () => {
 const setActiveTab = vi.fn();
 vi.mocked(useProjectBoard).mockReturnValue({
 state: { activeTab: 'board' },
 actions: { setActiveTab },
 handlers: {},
 computed: { mapTaskWithState: <T,>(t: T) => t },
 } as unknown as ReturnType<typeof useProjectBoard>);

 render(<Project />);
 fireEvent.click(screen.getByText('People'));
 expect(setActiveTab).toHaveBeenCalledWith('people');
 });

 it('renders phases and empty state when no milestones exist', () => {
 vi.mocked(useProjectData).mockReturnValue({
 project: mockProject,
 loadingProject: false,
 phases: [{ id: 'ph1', title: 'Phase 1', position: 1 }],
 milestones: [],
 tasks: [],
 teamMembers: [],
 } as unknown as ReturnType<typeof useProjectData>);

 // We need to ensure the board state has selectedPhase set to mock rendering details
 vi.mocked(useProjectBoard).mockReturnValue({
 state: { activeTab: 'board', selectedPhase: { id: 'ph1', title: 'Phase 1', position: 1 } },
 actions: { setActiveTab: vi.fn() },
 handlers: {},
 computed: { mapTaskWithState: <T,>(t: T) => t },
 } as unknown as ReturnType<typeof useProjectBoard>);

 render(<Project />);
 expect(screen.getByText(/Phase 1: Phase 1/i)).toBeInTheDocument();
 expect(screen.getByText(/No milestones in this phase yet/i)).toBeInTheDocument();
 });
});
