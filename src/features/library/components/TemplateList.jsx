
import PropTypes from 'prop-types';
import SidebarNavItem from '@features/navigation/components/SidebarNavItem';

const TemplateList = ({ tasks, selectedTaskId, handleTaskClick }) => {
  return (
    <div className="task-section">
      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Templates</h2>
          <span className="section-count">{tasks.length}</span>
        </div>
      </div>
      {tasks.length > 0 ? (
        <div className="sidebar-nav-list">
          {tasks.map((template) => (
            <SidebarNavItem
              key={template.id}
              task={template}
              isSelected={selectedTaskId === template.id}
              onClick={handleTaskClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-400 px-3 py-4">
          No templates yet. Click &quot;New Template&quot; to start building.
        </div>
      )}
    </div>
  );
};

TemplateList.propTypes = {
  tasks: PropTypes.array.isRequired,
  selectedTaskId: PropTypes.string,
  handleTaskClick: PropTypes.func.isRequired,
};

export default TemplateList;
