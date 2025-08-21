'use client';

import React from 'react';
import { BaseChart, ChartData, ChartOptions } from './BaseChart';

interface VerificationStatusData {
  verified: number;
  disputed: number;
  pending: number;
}

interface VerificationStatusChartProps {
  data: VerificationStatusData;
  className?: string;
  height?: number;
  type?: 'pie' | 'doughnut';
  showLegend?: boolean;
}

export const VerificationStatusChart: React.FC<VerificationStatusChartProps> = ({
  data,
  className = '',
  height = 400,
  type = 'doughnut',
  showLegend = true,
}) => {
  const total = data.verified + data.disputed + data.pending;
  
  const chartData: ChartData = {
    labels: ['Verified', 'Disputed', 'Pending'],
    datasets: [
      {
        label: 'Verification Status',
        data: [data.verified, data.disputed, data.pending],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Green for verified
          'rgba(239, 68, 68, 0.8)',   // Red for disputed
          'rgba(245, 158, 11, 0.8)',  // Yellow for pending
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Attendance Verification Status Distribution',
      },
      legend: {
        display: showLegend,
        position: 'bottom',
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  // Custom plugin to display percentage in the center for doughnut charts
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: (chart: any) => {
      if (type === 'doughnut') {
        const { ctx, width, height } = chart;
        ctx.restore();
        const fontSize = (height / 114).toFixed(2);
        ctx.font = `${fontSize}em sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#374151';
        
        const text = `${total}`;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 2;
        
        ctx.fillText(text, textX, textY - 10);
        
        ctx.font = `${(fontSize * 0.6).toFixed(2)}em sans-serif`;
        const subText = 'Total Records';
        const subTextX = Math.round((width - ctx.measureText(subText).width) / 2);
        ctx.fillText(subText, subTextX, textY + 15);
        
        ctx.save();
      }
    },
  };

  return (
    <div className={`relative ${className}`}>
      <BaseChart
        type={type}
        data={chartData}
        options={options}
        height={height}
      />
      {type === 'doughnut' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{total}</div>
            <div className="text-sm text-gray-500">Total Records</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationStatusChart;