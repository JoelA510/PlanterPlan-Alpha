import { useNavigate } from 'react-router-dom';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';
import { useUserProjects } from '@features/projects/hooks/useUserProjects';
import { useAuth } from '@app/contexts/AuthContext';
import ProjectSidebar from './ProjectSidebar';

export default function ProjectSidebarContainer({ onNavClick, selectedTaskId }) {
    const navigate = useNavigate();
    const { data: userProjects, isLoading: projectsLoading } = useUserProjects();
    const {
        // templateTasks from useTaskOperations (Manual) - REPLACING with userProjects
        templateTasks = [],
        loading: tasksLoading,
        error,
        joinedError,
        loadMoreProjects,
        hasMore,
        isFetchingMore,
    } = useTaskOperations();

    // useUserProjects returns ALL projects (owned + joined).
    // ProjectSidebar expects `instanceTasks` (Owned) and `joinedProjects` (Joined) SEPARATELY?
    // Let's check ProjectSidebar.jsx again.
    // It renders InstanceList (instanceTasks) then JoinedProjectsList (joinedProjects).
    // If useUserProjects returns ALL, we need to split them if we want to maintain the UI distinction.
    // useUserProjects maps them into a single Map to dedup.
    // Implementation:
    // const { data: owned } = await getUserProjects(user.id);
    // const { data: joined } = await getJoinedProjects(user.id);
    // return Array.from(projectMap.values());

    // So userProjects is a MIXED list.
    // ProjectSidebar might need refactoring if it expects split.
    // Or we filter here.
    // We need currentUserId to filter 'owned' vs 'joined'.
    // useTaskOperations exposes currentUserId!

    // But wait, useUserProjects is cleaner. 
    // If I use userProjects, I need to know which are owned vs joined.
    // Project objects have `creator` (owner_id).
    // I can filter userProjects by `creator === user.id`.


    const { user } = useAuth(); // Need user for filtering

    if (userProjects?.length > 0) {
        console.warn('[DEBUG_UI] Sidebar Render - User:', user?.id ? 'Present' : 'MISSING', 'Project Count:', userProjects.length);
        if (userProjects[0]) console.warn('[DEBUG_UI] First Project Creator:', userProjects[0].creator, 'User ID:', user?.id);
    }

    // Split userProjects into Owned and Joined
    const ownedProjects = userProjects?.filter(p => (p.creator === user?.id || p.owner_id === user?.id)) || [];
    const joinedProjs = userProjects?.filter(p => (p.creator !== user?.id && p.owner_id !== user?.id)) || [];

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
