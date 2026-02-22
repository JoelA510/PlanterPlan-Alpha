import PropTypes from 'prop-types';
import SidebarNavItem from '@/features/navigation/components/SidebarNavItem';

const TemplateList = ({ tasks, selectedTaskId, handleTaskClick }) => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Templates</h2>
        <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {tasks.length}
        </span>
      </div>
      {tasks.length > 0 ? (
        <div className="space-y-1">
          {tasks.map((template) => (
            <SidebarNavItem
              key={template.id}
              task={template}
              isSelected={selectedTaskId === template.id}
              onClick={handleTaskClick}
              to={`/project/${template.id}`}
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
