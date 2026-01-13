import { useNavigate } from 'react-router-dom';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import ProjectSidebar from './ProjectSidebar';

export default function ProjectSidebarContainer({ onNavClick, selectedTaskId }) {
    const navigate = useNavigate();
    const {
        joinedProjects = [],
        instanceTasks = [],
        templateTasks = [],
        loading,
        error,
        joinedError,
        loadMoreProjects,
        hasMore,
        isFetchingMore,
    } = useTaskOperations();

    const handleSelectProject = (project) => {
        navigate(`/project/${project.id}`);
    };

    const handleNewProjectClick = () => {
        navigate('/dashboard');
        // In a real app, this might open the create modal on the dashboard
        // For now, we redirect to dashboard where the FAB/Button is.
    };

    const handleNewTemplateClick = () => {
        navigate('/dashboard');
    };

    return (
        <ProjectSidebar
            joinedProjects={joinedProjects}
            instanceTasks={instanceTasks}
            templateTasks={templateTasks}
            loading={loading}
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
