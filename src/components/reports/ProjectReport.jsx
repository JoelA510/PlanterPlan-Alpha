import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchTaskChildren } from '../../services/taskService';

const ProjectReport = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0 });

  useEffect(() => {
    const loadReportData = async () => {
      try {
        // 1. Fetch the full optimized tree
        const rawTasks = await fetchTaskChildren(projectId);

        // 2. Data Processing & DFS Sorting
        // Map children by parent_task_id for efficient traversal
        const parentMap = {};
        rawTasks.forEach((t) => {
          const pid = t.parent_task_id; // Explicitly capture null
          if (!parentMap[pid]) parentMap[pid] = [];
          parentMap[pid].push(t);
        });

        // Sort helper: Position -> CreatedAt
        const sorter = (a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          return new Date(a.created_at) - new Date(b.created_at);
        };

        const processedTasks = [];

        // Recursive DFS traversal
        const traverse = (currentId, depth) => {
          const children = parentMap[currentId] || [];
          children.sort(sorter);

          children.forEach((child) => {
            processedTasks.push({ ...child, depth });
            traverse(child.id, depth + 1);
          });
        };

        // Start with the Project Root
        const rootTask = rawTasks.find((t) => t.id === projectId);
        if (rootTask) {
          processedTasks.push({ ...rootTask, depth: 0 });
          traverse(rootTask.id, 1);
        } else {
          // Fallback: If no single root found (unlikely), valid children might exist if projectId is actually a subtree root?
          // But fetchTaskChildren logic implies it returns the set.
          // If main root is missing from array, check for orphans?
          // For now, assume rootTask exists.
        }

        // 3. Calculate Stats
        const total = rawTasks.length;
        const completed = rawTasks.filter((t) => t.status === 'completed' || t.is_complete).length;
        const overdue = rawTasks.filter((t) => {
          return (
            t.due_date &&
            new Date(t.due_date) < new Date() &&
            t.status !== 'completed' &&
            !t.is_complete
          );
        }).length;

        setTasks(processedTasks);
        setStats({ total, completed, overdue });
      } catch (error) {
        console.error('Failed to load report', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) loadReportData();
  }, [projectId]);

  if (loading) return <div>Generating Report...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white print:p-0">
      {/* Header */}
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Project Status Report</h1>
        <p className="text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* High-Level Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg text-center border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Tasks</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center border border-green-100">
          <div className="text-2xl font-bold text-green-700">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </div>
          <div className="text-sm text-green-600">Completion</div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg text-center border border-red-100">
          <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
          <div className="text-sm text-red-600">Overdue Items</div>
        </div>
      </div>

      {/* Task List (Print Friendly) */}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task) => (
            <tr
              key={task.id}
              className={
                task.depth === 0
                  ? 'bg-gray-100 font-bold'
                  : task.depth === 1
                    ? 'bg-gray-50 font-semibold'
                    : 'bg-white'
              }
            >
              <td
                className="px-6 py-4 text-sm text-gray-900"
                style={{ paddingLeft: `${(task.depth || 0) * 1.5 + 1}rem` }}
              >
                {task.title}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                {task.status || (task.is_complete ? 'Completed' : 'Todo')}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectReport;
