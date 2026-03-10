import { useNavigate } from 'react-router-dom';
import { useTaskQuery } from '@/features/tasks/hooks/useTaskQuery';
import ProjectSidebar from './ProjectSidebar';

export interface ProjectSidebarContainerProps {
 onNavClick?: () => void;
 selectedTaskId?: string | null;
}

export default function ProjectSidebarContainer({ onNavClick, selectedTaskId }: ProjectSidebarContainerProps) {
 const navigate = useNavigate();
 const {
 tasks = [],
 joinedProjects,
 projectsLoading,
 joinedLoading,
 templatesLoading,
 error,
 joinedError,
 loadMoreProjects,
 hasMore,
 isFetchingMore,
 } = useTaskQuery();

 const instanceTasks = tasks.filter((t) => t.origin === 'instance');
 const templateTasks = tasks.filter((t) => t.origin === 'template');

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
 instanceTasks={instanceTasks}
 joinedProjects={joinedProjects}
 templateTasks={templateTasks}
 projectsLoading={projectsLoading}
 joinedLoading={joinedLoading}
 templatesLoading={templatesLoading}
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
