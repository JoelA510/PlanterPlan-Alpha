import React, { useState } from 'react';
import { formatDisplayDate } from '../../utils/taskUtils';

/**
 * EmptyReportPanel - Displays an empty state for reports
 */
export const EmptyReportPanel = ({ 
  message = "No data found for the selected period", 
  icon = null,
  actionButton = null,
  suggestions = []
}) => {
  const defaultIcon = (
    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
      
      {suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-3">Try:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}
      
      {actionButton && (
        <div className="mt-6">
          {actionButton}
        </div>
      )}
    </div>
  );
};

/**
 * ReportCard - Container for report sections with optional loading state
 */
export const ReportCard = ({ 
  title, 
  subtitle = null,
  children, 
  loading = false,
  error = null,
  actions = null,
  className = "",
  headerBackground = "bg-white"
}) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className={`px-6 py-4 border-b border-gray-200 ${headerBackground}`}>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            {subtitle && <div className="h-3 bg-gray-200 rounded w-1/2"></div>}
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-red-200 ${className}`}>
        <div className={`px-6 py-4 border-b border-red-200 ${headerBackground}`}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-red-600">
            <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Error loading data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${headerBackground}`}>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

/**
 * StatCard - Displays a key metric with optional trend indicator
 */
export const StatCard = ({ 
  title, 
  value, 
  subtitle = null,
  trend = null, // { direction: 'up' | 'down', value: '12%', label: 'vs last month' }
  color = 'blue',
  icon = null,
  onClick = null
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200'
  };

  const trendClasses = {
    up: 'text-green-600 bg-green-100',
    down: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100'
  };

  const CardComponent = onClick ? 'button' : 'div';

  return (
    <CardComponent
      onClick={onClick}
      className={`
        bg-white border rounded-lg p-4 transition-all duration-200
        ${colorClasses[color] || colorClasses.blue}
        ${onClick ? 'hover:shadow-md cursor-pointer transform hover:-translate-y-0.5' : 'shadow-sm'}
        ${onClick ? 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${trendClasses[trend.direction] || trendClasses.neutral}`}>
                {trend.direction === 'up' && (
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {trend.direction === 'down' && (
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && trend.label && <p className="text-xs text-gray-500 mt-1">{trend.label}</p>}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-75">
              {icon}
            </div>
          </div>
        )}
      </div>
    </CardComponent>
  );
};

/**
 * ProgressBar - Horizontal progress indicator
 */
export const ProgressBar = ({ 
  progress, 
  total, 
  label = null,
  color = 'blue',
  showPercentage = true,
  showNumbers = true,
  className = ""
}) => {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    gray: 'bg-gray-500'
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {showNumbers && <span>{progress} of {total}</span>}
          {showPercentage && <span>({percentage}%)</span>}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color] || colorClasses.blue}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

/**
 * ExportButton - Button for exporting reports
 */
export const ExportButton = ({ 
  onExport, 
  loading = false, 
  format = 'PDF',
  disabled = false,
  variant = 'secondary'
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'csv', label: 'CSV', icon: '📊' },
    { value: 'excel', label: 'Excel', icon: '📈' },
    { value: 'print', label: 'Print', icon: '🖨️' }
  ];

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
  };

  const handleExport = (selectedFormat) => {
    onExport(selectedFormat);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex">
        <button
          onClick={() => handleExport(format.toLowerCase())}
          disabled={disabled || loading}
          className={`
            px-4 py-2 text-sm font-medium border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors
            ${variantClasses[variant]}
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Exporting...</span>
            </div>
          ) : (
            <span>Export {format}</span>
          )}
        </button>
        
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled || loading}
          className={`
            px-2 border-l-0 border rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors
            ${variantClasses[variant]}
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            {exportFormats.map((formatOption) => (
              <button
                key={formatOption.value}
                onClick={() => handleExport(formatOption.value)}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>{formatOption.icon}</span>
                <span>Export as {formatOption.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsDropdownOpen(false)}
        ></div>
      )}
    </div>
  );
};

/**
 * TimeRangeIndicator - Shows the current time range being displayed
 */
export const TimeRangeIndicator = ({ 
  startDate, 
  endDate, 
  label = "Reporting Period",
  showRelativeTime = true 
}) => {
  const formatRelativeTime = () => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // Check if it's current month
    if (start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()) {
      return 'This Month';
    }
    
    // Check if it's last month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (start.getMonth() === lastMonth.getMonth() && start.getFullYear() === lastMonth.getFullYear()) {
      return 'Last Month';
    }
    
    return '';
  };

  const relativeTime = formatRelativeTime();

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <div className="text-sm">
        <span className="font-medium text-blue-900">{label}:</span>
        <span className="text-blue-700 ml-1">
          {startDate && endDate ? (
            <>
              {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
              {showRelativeTime && relativeTime && (
                <span className="text-blue-600 ml-1">({relativeTime})</span>
              )}
            </>
          ) : (
            'All Time'
          )}
        </span>
      </div>
    </div>
  );
};

/**
 * LoadingOverlay - Full-screen loading overlay for reports
 */
export const LoadingOverlay = ({ message = "Generating report..." }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="flex items-center gap-4">
          <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <div className="text-sm font-medium text-gray-900">{message}</div>
            <div className="text-xs text-gray-500 mt-1">This may take a few moments...</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TaskStatusBadge - Displays task status with appropriate styling
 */
export const TaskStatusBadge = ({ status, size = 'sm' }) => {
  const statusConfig = {
    completed: { label: 'Completed', color: 'green' },
    overdue: { label: 'Overdue', color: 'red' },
    upcoming: { label: 'Due Soon', color: 'amber' },
    in_progress: { label: 'In Progress', color: 'blue' },
    not_started: { label: 'Not Started', color: 'gray' }
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm'
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const config = statusConfig[status] || statusConfig.not_started;

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full border
      ${sizeClasses[size]}
      ${colorClasses[config.color]}
    `}>
      {config.label}
    </span>
  );
};