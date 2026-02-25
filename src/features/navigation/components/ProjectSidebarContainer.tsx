import { useNavigate } from 'react-router-dom';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import { useUserProjects } from '@/features/projects/hooks/useUserProjects';
import { useAuth } from '@/app/contexts/AuthContext';
import ProjectSidebar from './ProjectSidebar';

export interface ProjectSidebarContainerProps {
    onNavClick?: () => void;
    selectedTaskId?: string | null;
}

export default function ProjectSidebarContainer({ onNavClick, selectedTaskId }: ProjectSidebarContainerProps) {
    const navigate = useNavigate();
    const { data: userProjects, isLoading: projectsLoading } = useUserProjects();
    const {
        tasks = [],
        loading: tasksLoading,
        error,
        joinedError,
        loadMoreProjects,
        hasMore,
        isFetchingMore,
    } = useTaskQuery();

    const templateTasks = tasks.filter((t: any) => t.origin === 'template');

    const { user } = useAuth(); // Need user for filtering

    // Split userProjects into Owned and Joined
    const ownedProjects = userProjects?.filter(p => (p.creator === user?.id || p.owner_id === user?.id)) || [];
    const joinedProjs = userProjects?.filter(p => (p.creator !== user?.id && p.owner_id !== user?.id)) || [];

    const handleSelectProject = (project: Record<string, unknown>) => {
        navigate(`/project/${project.id}`);
    };

    const handleNewProjectClick = () => {
        navigate('/dashboard?action=new-project');
    };

    const handleNewTemplateClick = () => {
        navigate('/dashboard?action=new-template');
    };

    return (
        <ProjectSidebar
            instanceTasks={ownedProjects}
            joinedProjects={joinedProjs}
            templateTasks={templateTasks}
            loading={projectsLoading || tasksLoading}
            error={error}
            joinedError={joinedError}
            handleSelectProject={handleSelectProject}
            selectedTaskId={selectedTaskId}
            onNewProjectClick={handleNewProjectClick}
            onNewTemplateClick={handleNewTemplateClick}
            onNavClick={onNavClick}
            onLoadMore={loadMoreProjects}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
        />
    );
}
