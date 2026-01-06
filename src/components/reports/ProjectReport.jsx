import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { fetchTaskChildren } from '../../services/taskService';
import { TASK_STATUS } from '../../constants';

// Chart colors
const COLORS = {
  completed: '#22c55e',
  remaining: '#e2e8f0',
  overdue: '#ef4444',
  inProgress: '#3b82f6',
};

const ProjectReport = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0, inProgress: 0 });
  const [monthFilter, setMonthFilter] = useState('all');

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const { data: rawTasks, error } = await fetchTaskChildren(projectId);

        if (error) throw error;

        // Build parent map for DFS
        const parentMap = {};
        if (rawTasks) {
          rawTasks.forEach((t) => {
            const pid = t.parent_task_id;
            if (!parentMap[pid]) parentMap[pid] = [];
            parentMap[pid].push(t);
          });

          // Sort helper
          const sorter = (a, b) => {
            const posA = a.position ?? 0;
            const posB = b.position ?? 0;
            if (posA !== posB) return posA - posB;
            return new Date(a.created_at) - new Date(b.created_at);
          };

          const processedTasks = [];
          const traverse = (currentId, depth) => {
            const children = parentMap[currentId] || [];
            children.sort(sorter);
            children.forEach((child) => {
              processedTasks.push({ ...child, depth });
              traverse(child.id, depth + 1);
            });
          };

          const rootTask = rawTasks.find((t) => t.id === projectId);
          if (rootTask) {
            processedTasks.push({ ...rootTask, depth: 0 });
            traverse(rootTask.id, 1);
          }

          // Calculate Stats
          const total = rawTasks.length;
          const completed = rawTasks.filter(
            (t) => t.status === TASK_STATUS.COMPLETED || t.is_complete
          ).length;
          const inProgress = rawTasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length;
          const overdue = rawTasks.filter((t) => {
            return (
              t.due_date &&
              new Date(t.due_date) < new Date() &&
              t.status !== TASK_STATUS.COMPLETED &&
              !t.is_complete
            );
          }).length;

          setTasks(processedTasks);
          setStats({ total, completed, overdue, inProgress });
        }
      } catch (error) {
        console.error('Failed to load report', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) loadReportData();
  }, [projectId]);

  // Filter tasks by month
  const filteredTasks = useMemo(() => {
    if (monthFilter === 'all') return tasks;
    const now = new Date();
    const targetMonth =
      monthFilter === 'current' ? now.getMonth() : now.getMonth() - parseInt(monthFilter);
    const targetYear = now.getFullYear();

    return tasks.filter((t) => {
      if (!t.due_date) return monthFilter === 'all';
      const dueDate = new Date(t.due_date);
      return dueDate.getMonth() === targetMonth && dueDate.getFullYear() === targetYear;
    });
  }, [tasks, monthFilter]);

  // Donut chart data
  const donutData = [
    { name: 'Completed', value: stats.completed, color: COLORS.completed },
    { name: 'Remaining', value: stats.total - stats.completed, color: COLORS.remaining },
  ];

  // Milestone trend data (group by depth 1 = phases)
  const milestoneTrend = useMemo(() => {
    const phases = tasks.filter((t) => t.depth === 1);
    return phases.map((phase) => {
      const children = tasks.filter((t) => t.parent_task_id === phase.id);
      const phaseCompleted = children.filter(
        (c) => c.status === TASK_STATUS.COMPLETED || c.is_complete
      ).length;
      const phaseTotal = children.length || 1;
      return {
        name: phase.title?.slice(0, 20) || 'Phase',
        completion: Math.round((phaseCompleted / phaseTotal) * 100),
      };
    });
  }, [tasks]);

  if (loading) return <div className="p-8 text-center">Generating Report...</div>;

  const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto bg-white print:p-0">
      {/* Header */}
      <div className="mb-8 border-b pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Status Report</h1>
          <p className="text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
        </div>
        {/* Month Filter */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="print:hidden px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Time</option>
          <option value="current">This Month</option>
          <option value="1">Last Month</option>
          <option value="2">2 Months Ago</option>
          <option value="3">3 Months Ago</option>
        </select>
      </div>

      {/* Stats Grid with Donut Chart */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Donut Chart */}
        <div className="col-span-2 p-4 bg-gray-50 rounded-lg border flex items-center justify-center">
          <div className="relative w-32 h-32" style={{ width: 150, height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{completionPercent}%</span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-600">Completion</div>
            <div className="text-xs text-gray-400">
              {stats.completed} of {stats.total} tasks
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-4 bg-gray-50 rounded-lg text-center border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Tasks</div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg text-center border border-red-100">
          <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
          <div className="text-sm text-red-600">Overdue</div>
        </div>
      </div>

      {/* Milestone Trend Chart */}
      {milestoneTrend.length > 0 && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Milestone Progress</h2>
          <ResponsiveContainer width="100%" height={Math.max(milestoneTrend.length * 40, 120)}>
            <BarChart data={milestoneTrend} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="completion" fill={COLORS.completed} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Task List */}
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
          {filteredTasks.map((task) => (
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
