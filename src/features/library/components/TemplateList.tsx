import SidebarNavItem from '@/shared/ui/SidebarNavItem';

interface TemplateTask {
    id: string;
    title?: string;
    [key: string]: unknown;
}

interface TemplateListProps {
    tasks: TemplateTask[];
    selectedTaskId?: string | null;
    handleTaskClick: (task: TemplateTask) => void;
}

const TemplateList = ({ tasks, selectedTaskId, handleTaskClick }: TemplateListProps) => {
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
                            task={{ ...template, title: template.title || 'Untitled' }}
                            isSelected={selectedTaskId === template.id}
                            onClick={handleTaskClick as any}
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

export default TemplateList;
