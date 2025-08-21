'use client';

import React from 'react';
import { BaseChart, ChartData, ChartOptions } from './BaseChart';

interface LecturerPerformanceData {
  lecturerName: string;
  totalSessions: number;
  averageAttendance: number;
  verificationRate: number;
  totalStudents: number;
}

interface LecturerPerformanceChartProps {
  data: LecturerPerformanceData[];
  className?: string;
  height?: number;
  metric?: 'attendance' | 'verification' | 'sessions';
  showLegend?: boolean;
}

export const LecturerPerformanceChart: React.FC<LecturerPerformanceChartProps> = ({
  data,
  className = '',
  height = 400,
  metric = 'attendance',
  showLegend = true,
}) => {
  const getChartData = (): ChartData => {
    const labels = data.map(item => {
      // Truncate long names for better display
      return item.lecturerName.length > 15 
        ? `${item.lecturerName.substring(0, 15)}...` 
        : item.lecturerName;
    });

    switch (metric) {
      case 'attendance':
        return {
          labels,
          datasets: [
            {
              label: 'Average Attendance (%)',
              data: data.map(item => item.averageAttendance),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1,
            },
          ],
        };
      
      case 'verification':
        return {
          labels,
          datasets: [
            {
              label: 'Verification Rate (%)',
              data: data.map(item => item.verificationRate),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1,
            },
          ],
        };
      
      case 'sessions':
        return {
          labels,
          datasets: [
            {
              label: 'Total Sessions',
              data: data.map(item => item.totalSessions),
              backgroundColor: 'rgba(168, 85, 247, 0.8)',
              borderColor: 'rgb(168, 85, 247)',
              borderWidth: 1,
            },
            {
              label: 'Total Students',
              data: data.map(item => item.totalStudents),
              backgroundColor: 'rgba(245, 158, 11, 0.8)',
              borderColor: 'rgb(245, 158, 11)',
              borderWidth: 1,
            },
          ],
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  };

  const getTitle = (): string => {
    switch (metric) {
      case 'attendance':
        return 'Average Attendance Rate by Lecturer';
      case 'verification':
        return 'Verification Rate by Lecturer';
      case 'sessions':
        return 'Sessions and Students by Lecturer';
      default:
        return 'Lecturer Performance';
    }
  };

  const getYAxisLabel = (): string => {
    switch (metric) {
      case 'attendance':
      case 'verification':
        return 'Percentage (%)';
      case 'sessions':
        return 'Count';
      default:
        return 'Value';
    }
  };

  const chartData = getChartData();

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: getTitle(),
      },
      legend: {
        display: showLegend && metric === 'sessions',
        position: 'top',
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Lecturers',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: getYAxisLabel(),
        },
        beginAtZero: true,
        ...(metric !== 'sessions' && {
          max: 100, // For percentage metrics
        }),
      },
    },
  };

  return (
    <BaseChart
      type="bar"
      data={chartData}
      options={options}
      className={className}
      height={height}
    />
  );
};

export default LecturerPerformanceChart;