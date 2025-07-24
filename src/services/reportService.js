// src/services/reportService.js
import { supabase } from '../supabaseClient';
import { formatDisplayDate } from '../utils/taskUtils';

/**
 * Service for handling report-specific database operations and data processing
 * Provides optimized queries for report generation and data export
 */

/**
 * Fetch tasks with optimized queries for reporting
 * @param {Object} params - Query parameters
 * @param {string|null} params.organizationId - Organization ID filter
 * @param {string|null} params.userId - User ID filter
 * @param {string} params.origin - Task origin ('instance' or 'template')
 * @param {Date|null} params.startDate - Start date filter
 * @param {Date|null} params.endDate - End date filter
 * @param {string} params.dateField - Date field to filter on
 * @param {Array} params.projectIds - Specific project IDs to include
 * @param {boolean} params.includeCompleted - Include completed tasks
 * @param {boolean} params.includeIncomplete - Include incomplete tasks
 * @returns {Promise<{data: Array, error: string}>}
 */
export const fetchTasksForReporting = async ({
  organizationId = null,
  userId = null,
  origin = 'instance',
  startDate = null,
  endDate = null,
  dateField = 'due_date',
  projectIds = [],
  includeCompleted = true,
  includeIncomplete = true
}) => {
  try {
    console.log('Fetching tasks for reporting with params:', {
      organizationId, userId, origin, startDate, endDate, dateField, projectIds
    });

    // Build the base query
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        purpose,
        actions,
        resources,
        duration_days,
        parent_task_id,
        position,
        is_complete,
        start_date,
        due_date,
        created_at,
        last_modified,
        creator,
        assigned_users,
        tags,
        white_label_id
      `)
      .eq('origin', origin);

    // Apply organization filter
    if (organizationId !== undefined) {
      if (organizationId === null) {
        query = query.is('white_label_id', null);
      } else {
        query = query.eq('white_label_id', organizationId);
      }
    }

    // Apply user filter for owned tasks
    if (userId) {
      query = query.eq('creator', userId);
    }

    // Apply project filter
    if (projectIds.length > 0) {
      query = query.in('id', projectIds);
    }

    // Apply completion status filters
    if (!includeCompleted && includeIncomplete) {
      query = query.eq('is_complete', false);
    } else if (includeCompleted && !includeIncomplete) {
      query = query.eq('is_complete', true);
    }

    // Apply date range filter
    if (startDate || endDate) {
      if (startDate) {
        query = query.gte(dateField, startDate.toISOString());
      }
      if (endDate) {
        query = query.lte(dateField, endDate.toISOString());
      }
    }

    // Execute query with ordering
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching tasks for reporting:', error);
      return { data: null, error: error.message };
    }

    console.log(`Fetched ${data?.length || 0} tasks for reporting`);
    return { data: data || [], error: null };

  } catch (err) {
    console.error('Error in fetchTasksForReporting:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Fetch project membership data for team reporting
 * @param {string} userId - User ID
 * @param {string|null} organizationId - Organization ID filter
 * @returns {Promise<{data: Array, error: string}>}
 */
export const fetchUserProjectMemberships = async (userId, organizationId = null) => {
  try {
    console.log('Fetching user project memberships:', { userId, organizationId });

    let query = supabase
      .from('project_memberships')
      .select(`
        id,
        project_id,
        role,
        status,
        invited_at,
        accepted_at,
        project:project_id (
          id,
          title,
          description,
          created_at,
          white_label_id,
          creator
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching project memberships:', error);
      return { data: null, error: error.message };
    }

    // Filter by organization if specified
    let filteredData = data || [];
    if (organizationId !== undefined) {
      filteredData = filteredData.filter(membership => {
        const project = membership.project;
        return organizationId === null 
          ? project.white_label_id === null 
          : project.white_label_id === organizationId;
      });
    }

    console.log(`Found ${filteredData.length} project memberships`);
    return { data: filteredData, error: null };

  } catch (err) {
    console.error('Error in fetchUserProjectMemberships:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Fetch aggregated task statistics for reporting dashboard
 * @param {Object} params - Query parameters
 * @returns {Promise<{data: Object, error: string}>}
 */
export const fetchTaskStatistics = async ({
  organizationId = null,
  userId = null,
  startDate = null,
  endDate = null,
  projectIds = []
}) => {
  try {
    console.log('Fetching task statistics:', { organizationId, userId, startDate, endDate });

    // We'll use multiple queries to get different statistics
    const queries = [];

    // Base query builder
    const buildBaseQuery = () => {
      let query = supabase
        .from('tasks')
        .select('id, is_complete, due_date, created_at, last_modified, duration_days')
        .eq('origin', 'instance');

      if (organizationId !== undefined) {
        if (organizationId === null) {
          query = query.is('white_label_id', null);
        } else {
          query = query.eq('white_label_id', organizationId);
        }
      }

      if (userId) {
        query = query.eq('creator', userId);
      }

      if (projectIds.length > 0) {
        query = query.in('id', projectIds);
      }

      return query;
    };

    // Query 1: All tasks in date range
    let allTasksQuery = buildBaseQuery();
    if (startDate) {
      allTasksQuery = allTasksQuery.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      allTasksQuery = allTasksQuery.lte('created_at', endDate.toISOString());
    }

    // Query 2: Completed tasks in date range
    let completedTasksQuery = buildBaseQuery()
      .eq('is_complete', true);
    if (startDate) {
      completedTasksQuery = completedTasksQuery.gte('last_modified', startDate.toISOString());
    }
    if (endDate) {
      completedTasksQuery = completedTasksQuery.lte('last_modified', endDate.toISOString());
    }

    // Query 3: Overdue tasks (current)
    const now = new Date();
    const overdueTasksQuery = buildBaseQuery()
      .eq('is_complete', false)
      .lt('due_date', now.toISOString());

    // Execute all queries
    const [allTasksResult, completedTasksResult, overdueTasksResult] = await Promise.all([
      allTasksQuery,
      completedTasksQuery,
      overdueTasksQuery
    ]);

    // Check for errors
    if (allTasksResult.error) throw new Error(allTasksResult.error.message);
    if (completedTasksResult.error) throw new Error(completedTasksResult.error.message);
    if (overdueTasksResult.error) throw new Error(overdueTasksResult.error.message);

    const allTasks = allTasksResult.data || [];
    const completedTasks = completedTasksResult.data || [];
    const overdueTasks = overdueTasksResult.data || [];

    // Calculate statistics
    const totalTasks = allTasks.length;
    const totalCompleted = completedTasks.length;
    const totalOverdue = overdueTasks.length;
    const totalIncomplete = allTasks.filter(task => !task.is_complete).length;

    const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

    // Calculate average duration
    const tasksWithDuration = allTasks.filter(task => task.duration_days > 0);
    const averageDuration = tasksWithDuration.length > 0 
      ? tasksWithDuration.reduce((sum, task) => sum + task.duration_days, 0) / tasksWithDuration.length 
      : 0;

    // Calculate tasks due in next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const tasksDueSoon = allTasks.filter(task => {
      if (task.is_complete || !task.due_date) return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    }).length;

    const statistics = {
      totalTasks,
      completedTasks: totalCompleted,
      incompleteTasks: totalIncomplete,
      overdueTasks: totalOverdue,
      tasksDueSoon,
      completionRate: Math.round(completionRate * 100) / 100,
      averageDuration: Math.round(averageDuration * 100) / 100,
      periodStart: startDate ? startDate.toISOString() : null,
      periodEnd: endDate ? endDate.toISOString() : null,
      generatedAt: new Date().toISOString()
    };

    console.log('Task statistics calculated:', statistics);
    return { data: statistics, error: null };

  } catch (err) {
    console.error('Error fetching task statistics:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Fetch project-wise statistics for reporting
 * @param {Object} params - Query parameters
 * @returns {Promise<{data: Array, error: string}>}
 */
export const fetchProjectStatistics = async ({
  organizationId = null,
  userId = null,
  startDate = null,
  endDate = null
}) => {
  try {
    console.log('Fetching project statistics:', { organizationId, userId });

    // First, get all top-level projects
    let projectsQuery = supabase
      .from('tasks')
      .select('id, title, created_at, creator')
      .eq('origin', 'instance')
      .is('parent_task_id', null);

    if (organizationId !== undefined) {
      if (organizationId === null) {
        projectsQuery = projectsQuery.is('white_label_id', null);
      } else {
        projectsQuery = projectsQuery.eq('white_label_id', organizationId);
      }
    }

    if (userId) {
      projectsQuery = projectsQuery.eq('creator', userId);
    }

    const { data: projects, error: projectsError } = await projectsQuery;

    if (projectsError) {
      throw new Error(projectsError.message);
    }

    if (!projects || projects.length === 0) {
      return { data: [], error: null };
    }

    // Now get all tasks for these projects (including children)
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        parent_task_id,
        is_complete,
        due_date,
        created_at,
        last_modified,
        duration_days
      `)
      .eq('origin', 'instance');

    if (organizationId !== undefined) {
      if (organizationId === null) {
        tasksQuery = tasksQuery.is('white_label_id', null);
      } else {
        tasksQuery = tasksQuery.eq('white_label_id', organizationId);
      }
    }

    const { data: allTasks, error: tasksError } = await tasksQuery;

    if (tasksError) {
      throw new Error(tasksError.message);
    }

    // Helper function to find all descendants of a project
    const findProjectTasks = (projectId, tasks) => {
      const projectTasks = [projectId];
      const visited = new Set();
      
      const addChildren = (parentId) => {
        if (visited.has(parentId)) return;
        visited.add(parentId);
        
        tasks.forEach(task => {
          if (task.parent_task_id === parentId && !projectTasks.includes(task.id)) {
            projectTasks.push(task.id);
            addChildren(task.id);
          }
        });
      };
      
      addChildren(projectId);
      return tasks.filter(task => projectTasks.includes(task.id));
    };

    // Calculate statistics for each project
    const projectStats = projects.map(project => {
      const projectTasks = findProjectTasks(project.id, allTasks);
      
      // Apply date filters if specified
      let filteredTasks = projectTasks;
      if (startDate || endDate) {
        filteredTasks = projectTasks.filter(task => {
          const taskDate = new Date(task.created_at);
          if (startDate && taskDate < startDate) return false;
          if (endDate && taskDate > endDate) return false;
          return true;
        });
      }

      const totalTasks = filteredTasks.length;
      const completedTasks = filteredTasks.filter(task => task.is_complete).length;
      const incompleteTasks = totalTasks - completedTasks;
      
      const now = new Date();
      const overdueTasks = filteredTasks.filter(task => {
        if (task.is_complete || !task.due_date) return false;
        return new Date(task.due_date) < now;
      }).length;

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate average duration
      const tasksWithDuration = filteredTasks.filter(task => task.duration_days > 0);
      const averageDuration = tasksWithDuration.length > 0 
        ? tasksWithDuration.reduce((sum, task) => sum + task.duration_days, 0) / tasksWithDuration.length 
        : 0;

      return {
        projectId: project.id,
        projectTitle: project.title || 'Untitled Project',
        projectCreatedAt: project.created_at,
        totalTasks,
        completedTasks,
        incompleteTasks,
        overdueTasks,
        completionRate: Math.round(completionRate * 100) / 100,
        averageDuration: Math.round(averageDuration * 100) / 100
      };
    });

    // Sort by project title
    projectStats.sort((a, b) => a.projectTitle.localeCompare(b.projectTitle));

    console.log(`Calculated statistics for ${projectStats.length} projects`);
    return { data: projectStats, error: null };

  } catch (err) {
    console.error('Error fetching project statistics:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Generate export data in various formats
 * @param {Object} reportData - The report data to export
 * @param {string} format - Export format ('csv', 'json', 'pdf')
 * @param {Object} options - Export options
 * @returns {Promise<{data: any, error: string, filename: string}>}
 */
export const generateReportExport = async (reportData, format = 'csv', options = {}) => {
  try {
    console.log('Generating report export:', { format, options });

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = options.filename || `project-report-${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        return await generateCSVExport(reportData, baseFilename, options);
      
      case 'json':
        return await generateJSONExport(reportData, baseFilename, options);
      
      case 'excel':
        return await generateExcelExport(reportData, baseFilename, options);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

  } catch (err) {
    console.error('Error generating report export:', err);
    return { data: null, error: err.message, filename: null };
  }
};

/**
 * Generate CSV export
 * @private
 */
const generateCSVExport = async (reportData, baseFilename, options) => {
  const { summary, tasks, projectStats } = reportData;

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Helper function to convert array to CSV row
  const arrayToCSV = (array) => {
    return array.map(escapeCSV).join(',');
  };

  let csvContent = '';

  // Summary section
  csvContent += 'REPORT SUMMARY\n';
  csvContent += arrayToCSV(['Metric', 'Value']) + '\n';
  Object.entries(summary).forEach(([key, value]) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    csvContent += arrayToCSV([label, value]) + '\n';
  });
  csvContent += '\n';

  // Completed tasks section
  if (tasks.completed && tasks.completed.length > 0) {
    csvContent += 'COMPLETED TASKS\n';
    csvContent += arrayToCSV(['Task ID', 'Title', 'Project', 'Completed Date', 'Duration (Days)']) + '\n';
    tasks.completed.forEach(task => {
      csvContent += arrayToCSV([
        task.id,
        task.title,
        task.project,
        formatDisplayDate(task.completedDate),
        task.duration || ''
      ]) + '\n';
    });
    csvContent += '\n';
  }

  // Overdue tasks section
  if (tasks.overdue && tasks.overdue.length > 0) {
    csvContent += 'OVERDUE TASKS\n';
    csvContent += arrayToCSV(['Task ID', 'Title', 'Project', 'Due Date', 'Days Overdue']) + '\n';
    tasks.overdue.forEach(task => {
      csvContent += arrayToCSV([
        task.id,
        task.title,
        task.project,
        formatDisplayDate(task.dueDate),
        task.daysOverdue || ''
      ]) + '\n';
    });
    csvContent += '\n';
  }

  // Upcoming tasks section
  if (tasks.upcoming && tasks.upcoming.length > 0) {
    csvContent += 'UPCOMING TASKS\n';
    csvContent += arrayToCSV(['Task ID', 'Title', 'Project', 'Due Date', 'Duration (Days)']) + '\n';
    tasks.upcoming.forEach(task => {
      csvContent += arrayToCSV([
        task.id,
        task.title,
        task.project,
        formatDisplayDate(task.dueDate),
        task.duration || ''
      ]) + '\n';
    });
    csvContent += '\n';
  }

  // Project statistics section
  if (projectStats && projectStats.length > 0) {
    csvContent += 'PROJECT STATISTICS\n';
    csvContent += arrayToCSV([
      'Project',
      'Total Tasks',
      'Completed',
      'Incomplete',
      'Overdue',
      'Completion Rate (%)',
      'Avg Duration (Days)'
    ]) + '\n';
    projectStats.forEach(stat => {
      csvContent += arrayToCSV([
        stat.projectTitle,
        stat.totalTasks,
        stat.completedTasks,
        stat.incompleteTasks,
        stat.overdueTasks,
        stat.completionRate,
        stat.averageDuration
      ]) + '\n';
    });
  }

  return {
    data: csvContent,
    error: null,
    filename: `${baseFilename}.csv`,
    mimeType: 'text/csv'
  };
};

/**
 * Generate JSON export
 * @private
 */
const generateJSONExport = async (reportData, baseFilename, options) => {
  const exportData = {
    ...reportData,
    exportedAt: new Date().toISOString(),
    format: 'json',
    version: '1.0'
  };

  return {
    data: JSON.stringify(exportData, null, 2),
    error: null,
    filename: `${baseFilename}.json`,
    mimeType: 'application/json'
  };
};

/**
 * Generate Excel export (simplified - would need a library like xlsx in real implementation)
 * @private
 */
const generateExcelExport = async (reportData, baseFilename, options) => {
  // In a real implementation, you would use a library like xlsx or exceljs
  // For now, we'll return a CSV-like format with Excel-friendly structure
  const csvData = await generateCSVExport(reportData, baseFilename, options);
  
  return {
    ...csvData,
    filename: `${baseFilename}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    note: 'Excel export would require additional library integration (xlsx/exceljs)'
  };
};

/**
 * Save generated report data (for future scheduled reporting)
 * @param {Object} reportData - Report data to save
 * @param {Object} metadata - Report metadata
 * @returns {Promise<{success: boolean, error: string}>}
 */
export const saveGeneratedReport = async (reportData, metadata) => {
  try {
    console.log('Saving generated report:', metadata);

    // In a real implementation, you might save to a reports table
    // For now, we'll just return success
    return { success: true, error: null };

  } catch (err) {
    console.error('Error saving report:', err);
    return { success: false, error: err.message };
  }
};