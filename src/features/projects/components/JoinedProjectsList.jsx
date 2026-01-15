import PropTypes from 'prop-types';
import SidebarNavItem from '@features/navigation/components/SidebarNavItem';

const JoinedProjectsList = ({ projects, error, handleTaskClick, selectedTaskId }) => {
  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Joined Projects</h2>
          <span className="section-count">{projects.length}</span>
        </div>
      </div>
      {error ? (
        <div className="text-sm text-rose-400 px-3 py-4">{error}</div>
      ) : projects.length > 0 ? (
        <div className="sidebar-nav-list">
          {projects.map((project) => (
            <SidebarNavItem
              key={project.id}
              task={project}
              isSelected={selectedTaskId === project.id}
              onClick={handleTaskClick}
              showRole={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-400 px-3 py-4">
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
