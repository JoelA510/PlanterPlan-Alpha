
import PropTypes from 'prop-types';
import SidebarNavItem from '@/features/navigation/components/SidebarNavItem';

const JoinedProjectsList = ({ projects, error, handleTaskClick, selectedTaskId }) => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Joined Projects</h2>
        <span className="bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {projects.length}
        </span>
      </div>
      {error ? (
        <div className="text-sm text-rose-400 px-3 py-4">{error}</div>
      ) : projects.length > 0 ? (
        <div className="space-y-1">
          {projects.map((project) => (
            <SidebarNavItem
              key={project.id}
              task={project}
              isSelected={selectedTaskId === project.id}
              onClick={handleTaskClick}
              showRole={true}
              to={`/ project / ${project.id} `}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground px-3 py-4">
          You haven&apos;t joined any projects yet.
        </div>
      )}
    </div>
  );
};

JoinedProjectsList.propTypes = {
  projects: PropTypes.array.isRequired,
  error: PropTypes.string,
  handleTaskClick: PropTypes.func.isRequired,
  selectedTaskId: PropTypes.string,
};

export default JoinedProjectsList;
