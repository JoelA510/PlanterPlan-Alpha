import React, { useState, useMemo } from 'react';
import { useOrganization } from '../contexts/OrganizationProvider';
import { useTasks } from '../contexts/TaskContext';
import ProgressDonutChart from './ProgressDonutChart';
import MonthSelector from './MonthSelector';
import MilestonesList from './MilestonesList';

const ProjectStatusReport = () => {
  const { organization } = useOrganization();
  const { instanceTasks, loading, error } = useTasks();
  
  // Current month as default
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return {
      month: now.getMonth(), // 0-11
      year: now.getFullYear()
    };
  });

  const [selectedProject, setSelectedProject] = useState('all'); // 'all' or specific project ID

  // Get available projects for filtering
  const availableProjects = useMemo(
    () =>
      instanceTasks
        .filter((task) => !task.parent_task_id && !task.is_archived)
        .map((project) => ({
          id: project.id,
          title: project.title || 'Untitled Project',
        })),
    [instanceTasks]
  );

  // Helper function to check if a date falls within a specific month
  const isDateInMonth = (dateString, month, year) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getMonth() === month && date.getFullYear() === year;
  };

  // Helper function to check if a date is in the month after the selected month
  const isDateInNextMonth = (dateString, month, year) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    return date.getMonth() === nextMonth && date.getFullYear() === nextYear;
  };

  // Filter tasks based on selected project
  const filteredTasks = useMemo(() => {
    if (selectedProject === 'all') {
      return instanceTasks;
    }
    
    // Get all tasks that belong to the selected project (including children)
    const getProjectTasks = (projectId) => {
      const projectTasks = [projectId];
      const addChildren = (parentId) => {
        instanceTasks.forEach(task => {
          if (task.parent_task_id === parentId && !projectTasks.includes(task.id)) {
            projectTasks.push(task.id);
            addChildren(task.id);
          }
        });
      };
      addChildren(projectId);
      return projectTasks;
    };
    
    const projectTaskIds = getProjectTasks(selectedProject);
    return instanceTasks.filter(task => projectTaskIds.includes(task.id));
  }, [instanceTasks, selectedProject]);

  // Calculate report data based on selected month and filtered tasks
  const reportData = useMemo(() => {
    const { month, year } = selectedMonth;
    
    // Tasks completed during the reporting month
    const completedThisMonth = filteredTasks.filter(task => 
      task.is_complete && isDateInMonth(task.last_modified, month, year)
    );

    // Tasks that were overdue as of the end of the reporting month
    const overdueEndOfMonth = filteredTasks.filter(task => {
      if (task.is_complete) return false;
      if (!task.due_date) return false;
      
      const dueDate = new Date(task.due_date);
      const endOfReportingMonth = new Date(year, month + 1, 0);
      
      return dueDate < endOfReportingMonth;
    });

    // Tasks due in the month after the reporting month
    const dueNextMonth = filteredTasks.filter(task => 
      !task.is_complete && isDateInNextMonth(task.due_date, month, year)
    );

    // All tasks for total count (exclude completed tasks that were completed before the reporting period)
    const totalRelevantTasks = filteredTasks.filter(task => {
      // Include incomplete tasks
      if (!task.is_complete) return true;
      
      // Include completed tasks that were completed during or after the reporting period
      if (task.last_modified) {
        const completedDate = new Date(task.last_modified);
        const startOfReportingMonth = new Date(year, month, 1);
        return completedDate >= startOfReportingMonth;
      }
      
      return true;
    });

    return {
      completedThisMonth,
      overdueEndOfMonth,
      dueNextMonth,
      totalTasks: totalRelevantTasks.length,
      completionRate: totalRelevantTasks.length > 0 
        ? (completedThisMonth.length / totalRelevantTasks.length) * 100 
        : 0
    };
  }, [filteredTasks, selectedMonth]);

  // Format month name for display
  const formatMonthYear = (month, year) => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading project data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <strong>Error loading project data:</strong> {error}
        </div>
      </div>
    );
  }

  // Empty state
  if (instanceTasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
        <p className="text-gray-500">Create your first project to see reporting data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Project Status Report
        </h1>
        <p className="text-gray-600">
          {organization?.organization_name || 'Your Organization'} • {formatMonthYear(selectedMonth.month, selectedMonth.year)}
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <label htmlFor="month-selector" className="block text-sm font-medium text-gray-700 mb-2">
              Reporting Period
            </label>
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          </div>
          
          <div className="flex-1">
            <label htmlFor="project-selector" className="block text-sm font-medium text-gray-700 mb-2">
              Project Filter
            </label>
            <select
              id="project-selector"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Projects</option>
              {availableProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Progress Overview</h2>
        <ProgressDonutChart
          completedTasks={reportData.completedThisMonth.length}
          overdueTasks={reportData.overdueEndOfMonth.length}
          upcomingTasks={reportData.dueNextMonth.length}
          totalTasks={reportData.totalTasks}
          size={280}
        />
      </div>

      {/* Milestone Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completed Milestones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Completed This Month
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {reportData.completedThisMonth.length} milestones completed in {formatMonthYear(selectedMonth.month, selectedMonth.year)}
            </p>
          </div>
          <MilestonesList 
            tasks={reportData.completedThisMonth}
            type="completed"
            emptyMessage="No milestones completed this month"
          />
        </div>

        {/* Overdue Milestones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Overdue Milestones
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {reportData.overdueEndOfMonth.length} milestones overdue as of end of {formatMonthYear(selectedMonth.month, selectedMonth.year)}
            </p>
          </div>
          <MilestonesList 
            tasks={reportData.overdueEndOfMonth}
            type="overdue"
            emptyMessage="No overdue milestones"
          />
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
              Due Next Month
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {reportData.dueNextMonth.length} milestones due in {formatMonthYear((selectedMonth.month + 1) % 12, selectedMonth.month === 11 ? selectedMonth.year + 1 : selectedMonth.year)}
            </p>
          </div>
          <MilestonesList 
            tasks={reportData.dueNextMonth}
            type="upcoming"
            emptyMessage="No milestones due next month"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{reportData.completedThisMonth.length}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{reportData.overdueEndOfMonth.length}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{reportData.dueNextMonth.length}</div>
            <div className="text-sm text-gray-600">Due Next Month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{reportData.completionRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatusReport;