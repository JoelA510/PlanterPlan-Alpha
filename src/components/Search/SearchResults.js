// src/components/Search/SearchResults.js
import React, { useMemo } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { formatDisplayDate } from '../../utils/taskUtils';

const SearchResults = ({ onTaskSelect, onClose }) => {
  const {
    results,
    searchTerm,
    hasQuery,
    isSearching,
    error,
  } = useSearch();

  const trimmedTerm = searchTerm?.trim() ?? '';
  const resultCount = results.length;

  // Highlight matching text in search results
  const highlightText = (text) => {
    const term = searchTerm?.trim();
    if (!term || !text) return text;

    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark
          key={index}
          style={{
            backgroundColor: '#fef3c7',
            padding: '1px 2px',
            borderRadius: '2px',
            fontWeight: '500',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Group tasks by project for better organization
  const tasksByProject = useMemo(() => {
    const grouped = {};

    results.forEach((task) => {
      // Find the root project for this task
      let rootTask = task;
      const taskMap = {};

      // Build a map of all tasks for traversal
      results.forEach((t) => {
        taskMap[t.id] = t;
      });
      
      // Traverse up to find root
      while (rootTask.parent_task_id && taskMap[rootTask.parent_task_id]) {
        rootTask = taskMap[rootTask.parent_task_id];
      }
      
      const projectKey = rootTask.id;
      const projectName = rootTask.title || 'Untitled Project';
      
      if (!grouped[projectKey]) {
        grouped[projectKey] = {
          projectName,
          projectId: projectKey,
          tasks: []
        };
      }
      
      grouped[projectKey].tasks.push(task);
    });

    return Object.values(grouped);
  }, [results]);

  const getTaskStatusIcon = (task) => {
    if (task.is_complete) return '✅';
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) return '🔴'; // Overdue
      if (dueDate.toDateString() === today.toDateString()) return '🟡'; // Due today
    }
    return '⭕'; // Incomplete
  };

  const getTaskMetadata = (task) => {
    const metadata = [];
    
    // Due date
    if (task.due_date) {
      metadata.push(`Due: ${formatDisplayDate(task.due_date)}`);
    }
    
    // Duration
    if (task.duration_days) {
      metadata.push(`${task.duration_days} day${task.duration_days !== 1 ? 's' : ''}`);
    }
    
    // Origin (template vs instance)
    if (task.origin === 'template') {
      metadata.push('Template');
    }
    
    return metadata.join(' • ');
  };

  if (!hasQuery) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '10vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '70vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              Search Results
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {isSearching
                ? 'Searching…'
                : `Found ${resultCount} task${resultCount !== 1 ? 's' : ''}`}
              {trimmedTerm && !isSearching && ` matching “${trimmedTerm}”`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Results */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '0'
        }}>
          {error ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#b91c1c',
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                Something went wrong
              </h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {error.message || 'Unable to fetch search results.'}
              </p>
            </div>
          ) : resultCount === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>
                No tasks found
              </h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Try adjusting your search terms
              </p>
            </div>
          ) : (
            <div>
              {tasksByProject.map((project, projectIndex) => (
                <div key={project.projectId}>
                  {/* Project Header */}
                  {tasksByProject.length > 1 && (
                    <div style={{
                      padding: '12px 20px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {highlightText(project.projectName)}
                      <span style={{
                        marginLeft: '8px',
                        color: '#9ca3af',
                        fontWeight: 'normal'
                      }}>
                        ({project.tasks.length})
                      </span>
                    </div>
                  )}

                  {/* Tasks */}
                  {project.tasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskSelect && onTaskSelect(task)}
                      style={{
                        padding: '16px 20px',
                        borderBottom: taskIndex === project.tasks.length - 1 && projectIndex === tasksByProject.length - 1 
                          ? 'none' 
                          : '1px solid #f3f4f6',
                        cursor: onTaskSelect ? 'pointer' : 'default',
                        transition: 'background-color 0.15s',
                        ':hover': {
                          backgroundColor: '#f9fafb'
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (onTaskSelect) {
                          e.target.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        {/* Status Icon */}
                        <div style={{
                          fontSize: '16px',
                          marginTop: '2px',
                          flexShrink: 0
                        }}>
                          {getTaskStatusIcon(task)}
                        </div>

                        {/* Task Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Task Title */}
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '500',
                            color: '#1f2937',
                            lineHeight: '1.4',
                            marginBottom: '4px'
                          }}>
                            {highlightText(task.title || 'Untitled Task')}
                          </div>

                          {/* Task Description (if exists and matches search) */}
                          {task.description && trimmedTerm &&
                           task.description.toLowerCase().includes(trimmedTerm.toLowerCase()) && (
                            <div style={{
                              fontSize: '13px',
                              color: '#6b7280',
                              lineHeight: '1.4',
                              marginBottom: '8px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {highlightText(task.description)}
                            </div>
                          )}

                          {/* Task Actions (if they match search) */}
                          {Array.isArray(task.actions) && task.actions.length > 0 && trimmedTerm &&
                           task.actions.some(action => action.toLowerCase().includes(trimmedTerm.toLowerCase())) && (
                            <div style={{
                              fontSize: '12px',
                              color: '#059669',
                              marginBottom: '8px'
                            }}>
                              <strong>Actions: </strong>
                              {task.actions
                                .filter(action => action.toLowerCase().includes(trimmedTerm.toLowerCase()))
                                .map((action, index) => (
                                  <span key={index}>
                                    {index > 0 && ', '}
                                    {highlightText(action)}
                                  </span>
                                ))
                              }
                            </div>
                          )}

                          {/* Task Metadata */}
                          <div style={{
                            fontSize: '12px',
                            color: '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}>
                            {getTaskMetadata(task)}
                            
                            {/* Task Hierarchy Indicator */}
                            {task.parent_task_id && (
                              <span style={{
                                backgroundColor: '#e0e7ff',
                                color: '#3730a3',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: '500'
                              }}>
                                Subtask
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Completion Status */}
                        <div style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          {task.is_complete ? (
                            <span style={{
                              color: '#059669',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              Complete
                            </span>
                          ) : (
                            <span style={{
                              color: '#dc2626',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {task.due_date && new Date(task.due_date) < new Date() ? 'Overdue' : 'Pending'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        {resultCount > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Click any task to view details
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;