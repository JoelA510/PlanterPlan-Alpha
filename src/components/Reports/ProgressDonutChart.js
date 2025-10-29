import React, { useMemo } from 'react';
import { useOrganization } from '../contexts/OrganizationProvider';

const ProgressDonutChart = ({ 
  completedTasks = 0, 
  overdueTasks = 0, 
  upcomingTasks = 0, 
  totalTasks = 0,
  size = 200,
  strokeWidth = 20 
}) => {
  const { organization } = useOrganization();

  // Calculate percentages and angles
  const chartData = useMemo(() => {
    if (totalTasks === 0) {
      return {
        completed: { count: 0, percentage: 0, angle: 0 },
        overdue: { count: 0, percentage: 0, angle: 0 },
        upcoming: { count: 0, percentage: 0, angle: 0 },
        remaining: { count: 0, percentage: 0, angle: 360 }
      };
    }

    const completedPercentage = (completedTasks / totalTasks) * 100;
    const overduePercentage = (overdueTasks / totalTasks) * 100;
    const upcomingPercentage = (upcomingTasks / totalTasks) * 100;
    
    const completedAngle = (completedTasks / totalTasks) * 360;
    const overdueAngle = (overdueTasks / totalTasks) * 360;
    const upcomingAngle = (upcomingTasks / totalTasks) * 360;
    
    const remainingTasks = totalTasks - completedTasks - overdueTasks - upcomingTasks;
    const remainingPercentage = Math.max(0, (remainingTasks / totalTasks) * 100);
    const remainingAngle = Math.max(0, (remainingTasks / totalTasks) * 360);

    return {
      completed: { count: completedTasks, percentage: completedPercentage, angle: completedAngle },
      overdue: { count: overdueTasks, percentage: overduePercentage, angle: overdueAngle },
      upcoming: { count: upcomingTasks, percentage: upcomingPercentage, angle: upcomingAngle },
      remaining: { count: remainingTasks, percentage: remainingPercentage, angle: remainingAngle }
    };
  }, [completedTasks, overdueTasks, upcomingTasks, totalTasks]);

  // Use organization colors or defaults
  const colors = {
    completed: organization?.primary_color || '#10b981', // Green
    overdue: '#ef4444', // Red
    upcoming: '#f59e0b', // Amber
    remaining: '#e5e7eb' // Gray
  };

  // SVG dimensions
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  // Create SVG path for each segment
  const createPath = (startAngle, endAngle, radius, center) => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", center, center,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  // Calculate cumulative angles for positioning
  let cumulativeAngle = 0;
  const segments = [];

  if (chartData.completed.angle > 0) {
    segments.push({
      path: createPath(cumulativeAngle, cumulativeAngle + chartData.completed.angle, radius, center),
      color: colors.completed,
      type: 'completed'
    });
    cumulativeAngle += chartData.completed.angle;
  }

  if (chartData.overdue.angle > 0) {
    segments.push({
      path: createPath(cumulativeAngle, cumulativeAngle + chartData.overdue.angle, radius, center),
      color: colors.overdue,
      type: 'overdue'
    });
    cumulativeAngle += chartData.overdue.angle;
  }

  if (chartData.upcoming.angle > 0) {
    segments.push({
      path: createPath(cumulativeAngle, cumulativeAngle + chartData.upcoming.angle, radius, center),
      color: colors.upcoming,
      type: 'upcoming'
    });
    cumulativeAngle += chartData.upcoming.angle;
  }

  if (chartData.remaining.angle > 0) {
    segments.push({
      path: createPath(cumulativeAngle, cumulativeAngle + chartData.remaining.angle, radius, center),
      color: colors.remaining,
      type: 'remaining'
    });
  }

  // Legend data
  const legendItems = [
    {
      label: 'Completed',
      count: chartData.completed.count,
      percentage: chartData.completed.percentage,
      color: colors.completed
    },
    {
      label: 'Overdue',
      count: chartData.overdue.count,
      percentage: chartData.overdue.percentage,
      color: colors.overdue
    },
    {
      label: 'Due Next Month',
      count: chartData.upcoming.count,
      percentage: chartData.upcoming.percentage,
      color: colors.upcoming
    },
    {
      label: 'Other Tasks',
      count: chartData.remaining.count,
      percentage: chartData.remaining.percentage,
      color: colors.remaining
    }
  ].filter(item => item.count > 0);

  // Handle empty state
  if (totalTasks === 0) {
    return (
      <div className="flex flex-col items-center p-6">
        <div 
          className="rounded-full border-8 border-gray-200 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <div className="text-center text-gray-500">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm">No Tasks</div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-gray-500">No tasks found for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6 p-4">
      {/* Donut Chart */}
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          
          {/* Chart segments */}
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              className="transition-opacity duration-200 hover:opacity-80"
            />
          ))}
          
          {/* Inner circle to create donut effect */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth}
            fill="white"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{totalTasks}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Status</h3>
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700 truncate">
                  {item.label}
                </span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{item.count}</span>
                  <span className="text-xs">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Completion Rate */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Completion Rate
            </span>
            <span className="text-lg font-bold" style={{ color: colors.completed }}>
              {chartData.completed.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressDonutChart;