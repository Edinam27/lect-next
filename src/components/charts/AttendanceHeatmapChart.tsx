'use client';

import React from 'react';

interface HeatmapData {
  day: string;
  hour: number;
  value: number;
  sessions: number;
}

interface AttendanceHeatmapChartProps {
  data: HeatmapData[];
  className?: string;
  height?: number;
  showLabels?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export const AttendanceHeatmapChart: React.FC<AttendanceHeatmapChartProps> = ({
  data,
  className = '',
  height = 400,
  showLabels = true,
}) => {
  // Create a matrix for the heatmap
  const createMatrix = () => {
    const matrix: { [key: string]: { [key: number]: HeatmapData } } = {};
    
    // Initialize matrix
    DAYS.forEach(day => {
      matrix[day] = {};
      HOURS.forEach(hour => {
        matrix[day][hour] = { day, hour, value: 0, sessions: 0 };
      });
    });
    
    // Fill matrix with data
    data.forEach(item => {
      if (matrix[item.day] && matrix[item.day][item.hour]) {
        matrix[item.day][item.hour] = item;
      }
    });
    
    return matrix;
  };

  const matrix = createMatrix();
  const maxValue = Math.max(...data.map(d => d.value), 1);

  const getIntensity = (value: number): number => {
    return value / maxValue;
  };

  const getColor = (intensity: number): string => {
    if (intensity === 0) return 'bg-gray-100';
    if (intensity <= 0.2) return 'bg-blue-100';
    if (intensity <= 0.4) return 'bg-blue-200';
    if (intensity <= 0.6) return 'bg-blue-300';
    if (intensity <= 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return (
    <div className={`${className}`} style={{ height: `${height}px` }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Attendance Patterns by Day and Time
        </h3>
        <p className="text-sm text-gray-600">
          Darker colors indicate higher attendance rates
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header with hours */}
          <div className="flex">
            <div className="w-20 flex-shrink-0"></div> {/* Empty corner */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="w-12 text-xs text-center text-gray-600 py-1 flex-shrink-0"
              >
                {showLabels ? formatHour(hour) : hour}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {DAYS.map(day => (
            <div key={day} className="flex">
              {/* Day label */}
              <div className="w-20 text-sm text-gray-700 py-2 pr-2 text-right flex-shrink-0">
                {showLabels ? day : day.substring(0, 3)}
              </div>
              
              {/* Hour cells */}
              {HOURS.map(hour => {
                const cellData = matrix[day][hour];
                const intensity = getIntensity(cellData.value);
                const colorClass = getColor(intensity);
                
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`w-12 h-8 border border-gray-200 ${colorClass} flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors flex-shrink-0`}
                    title={`${day} ${formatHour(hour)}: ${cellData.value}% attendance (${cellData.sessions} sessions)`}
                  >
                    {showLabels && cellData.value > 0 && (
                      <span className="text-xs font-medium text-gray-700">
                        {cellData.value.toFixed(0)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Low</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-gray-100 border border-gray-200"></div>
            <div className="w-4 h-4 bg-blue-100 border border-gray-200"></div>
            <div className="w-4 h-4 bg-blue-200 border border-gray-200"></div>
            <div className="w-4 h-4 bg-blue-300 border border-gray-200"></div>
            <div className="w-4 h-4 bg-blue-400 border border-gray-200"></div>
            <div className="w-4 h-4 bg-blue-500 border border-gray-200"></div>
          </div>
          <span className="text-sm text-gray-600">High</span>
        </div>
        
        <div className="text-sm text-gray-600">
          Max: {maxValue.toFixed(1)}% attendance
        </div>
      </div>

      {/* Summary statistics */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-medium text-gray-700">Peak Day</div>
          <div className="text-gray-600">
            {DAYS.reduce((peak, day) => {
              const dayTotal = HOURS.reduce((sum, hour) => sum + matrix[day][hour].value, 0);
              const peakTotal = HOURS.reduce((sum, hour) => sum + matrix[peak][hour].value, 0);
              return dayTotal > peakTotal ? day : peak;
            }, DAYS[0])}
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-medium text-gray-700">Peak Hour</div>
          <div className="text-gray-600">
            {formatHour(HOURS.reduce((peak, hour) => {
              const hourTotal = DAYS.reduce((sum, day) => sum + matrix[day][hour].value, 0);
              const peakTotal = DAYS.reduce((sum, day) => sum + matrix[day][peak].value, 0);
              return hourTotal > peakTotal ? hour : peak;
            }, HOURS[0]))}
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-medium text-gray-700">Total Sessions</div>
          <div className="text-gray-600">
            {data.reduce((sum, item) => sum + item.sessions, 0)}
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <div className="font-medium text-gray-700">Avg Attendance</div>
          <div className="text-gray-600">
            {data.length > 0 ? (data.reduce((sum, item) => sum + item.value, 0) / data.length).toFixed(1) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHeatmapChart;