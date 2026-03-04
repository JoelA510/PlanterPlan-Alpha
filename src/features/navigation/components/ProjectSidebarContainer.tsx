import { useNavigate } from 'react-router-dom';
import { useTaskQuery } from '@/features/tasks';
import { useUserProjects } from '@/features/projects';
import { useAuth } from '@/shared/contexts/AuthContext';
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

    const templateTasks = tasks.filter((t) => t.origin === 'template');

    const { user } = useAuth(); // Need user for filtering

    // Split userProjects into Owned and Joined
    const ownedProjects = userProjects?.filter(p => p.creator === user?.id) || [];
    const joinedProjs = userProjects?.filter(p => p.creator !== user?.id) || [];

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
