'use client';

import React from 'react';
import { BaseChart, ChartData, ChartOptions } from './BaseChart';

interface CourseAttendanceData {
  courseName: string;
  courseCode: string;
  totalSessions: number;
  averageAttendance: number;
  totalStudents: number;
  attendanceRate: number;
}

interface CourseAttendanceChartProps {
  data: CourseAttendanceData[];
  className?: string;
  height?: number;
  chartType?: 'bar' | 'line';
  showComparison?: boolean;
}

export const CourseAttendanceChart: React.FC<CourseAttendanceChartProps> = ({
  data,
  className = '',
  height = 400,
  chartType = 'bar',
  showComparison = false,
}) => {
  const labels = data.map(item => {
    // Use course code for shorter labels, fallback to truncated name
    const label = item.courseCode || item.courseName;
    return label.length > 12 ? `${label.substring(0, 12)}...` : label;
  });

  const chartData: ChartData = {
    labels,
    datasets: showComparison ? [
      {
        label: 'Attendance Rate (%)',
        data: data.map(item => item.attendanceRate),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: chartType === 'line' ? 2 : 1,
        fill: chartType === 'line' ? false : undefined,
        tension: chartType === 'line' ? 0.4 : undefined,
      },
      {
        label: 'Total Sessions',
        data: data.map(item => item.totalSessions),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: chartType === 'line' ? 2 : 1,
        fill: chartType === 'line' ? false : undefined,
        tension: chartType === 'line' ? 0.4 : undefined,
      },
    ] : [
      {
        label: 'Attendance Rate (%)',
        data: data.map(item => item.attendanceRate),
        backgroundColor: data.map((_, index) => {
          const colors = [
            'rgba(59, 130, 246, 0.8)',   // Blue
            'rgba(34, 197, 94, 0.8)',    // Green
            'rgba(168, 85, 247, 0.8)',   // Purple
            'rgba(245, 158, 11, 0.8)',   // Yellow
            'rgba(239, 68, 68, 0.8)',    // Red
            'rgba(20, 184, 166, 0.8)',   // Teal
            'rgba(236, 72, 153, 0.8)',   // Pink
            'rgba(139, 69, 19, 0.8)',    // Brown
          ];
          return colors[index % colors.length];
        }),
        borderColor: data.map((_, index) => {
          const colors = [
            'rgb(59, 130, 246)',
            'rgb(34, 197, 94)',
            'rgb(168, 85, 247)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
            'rgb(20, 184, 166)',
            'rgb(236, 72, 153)',
            'rgb(139, 69, 19)',
          ];
          return colors[index % colors.length];
        }),
        borderWidth: chartType === 'line' ? 2 : 1,
        fill: chartType === 'line' ? false : undefined,
        tension: chartType === 'line' ? 0.4 : undefined,
      },
    ],
  };

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: showComparison ? 'Course Attendance vs Sessions Comparison' : 'Attendance Rate by Course',
      },
      legend: {
        display: showComparison,
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
          text: 'Courses',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: showComparison ? 'Value' : 'Attendance Rate (%)',
        },
        beginAtZero: true,
        ...(!showComparison && {
          max: 100, // For attendance rate only
        }),
      },
    },
  };

  return (
    <div className={className}>
      <BaseChart
        type={chartType}
        data={chartData}
        options={options}
        height={height}
      />
      
      {/* Course details table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Course</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Students</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Sessions</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Avg Attendance</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((course, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div>
                    <div className="font-medium text-gray-900">{course.courseName}</div>
                    {course.courseCode && (
                      <div className="text-gray-500">{course.courseCode}</div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{course.totalStudents}</td>
                <td className="px-3 py-2 text-center">{course.totalSessions}</td>
                <td className="px-3 py-2 text-center">{course.averageAttendance.toFixed(1)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    course.attendanceRate >= 80 
                      ? 'bg-green-100 text-green-800'
                      : course.attendanceRate >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {course.attendanceRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CourseAttendanceChart;