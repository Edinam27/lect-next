'use client';

import React from 'react';
import { BaseChart, ChartData, ChartOptions } from './BaseChart';

interface AttendanceTrendsData {
  day: string;
  total: number;
  verified: number;
  disputed: number;
  pending: number;
}

interface AttendanceTrendsChartProps {
  data: AttendanceTrendsData[];
  className?: string;
  height?: number;
  showLegend?: boolean;
}

export const AttendanceTrendsChart: React.FC<AttendanceTrendsChartProps> = ({
  data,
  className = '',
  height = 400,
  showLegend = true,
}) => {
  const chartData: ChartData = {
    labels: data.map(item => {
      const date = new Date(item.day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Total Attendance',
        data: data.map(item => item.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Verified',
        data: data.map(item => item.verified),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Disputed',
        data: data.map(item => item.disputed),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Pending',
        data: data.map(item => item.pending),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Attendance Trends Over Time',
      },
      legend: {
        display: showLegend,
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
          text: 'Date',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Records',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <BaseChart
      type="line"
      data={chartData}
      options={options}
      className={className}
      height={height}
    />
  );
};

export default AttendanceTrendsChart;