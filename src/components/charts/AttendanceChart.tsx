'use client';

import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
} from 'chart.js';
import { format, parseISO } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

interface AttendanceData {
  day: string;
  total: number;
  verified: number;
  disputed: number;
  pending: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  type?: 'line' | 'bar';
  height?: number;
  showLegend?: boolean;
  title?: string;
}

export function AttendanceChart({ 
  data, 
  type = 'line', 
  height = 300, 
  showLegend = true,
  title 
}: AttendanceChartProps) {
  const chartData = {
    labels: data.map(item => format(parseISO(item.day), 'MMM dd')),
    datasets: [
      {
        label: 'Total Records',
        data: data.map(item => item.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: type === 'bar' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.1)',
        tension: type === 'line' ? 0.4 : undefined,
        fill: type === 'line'
      },
      {
        label: 'Verified',
        data: data.map(item => item.verified),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: type === 'bar' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.1)',
        tension: type === 'line' ? 0.4 : undefined,
        fill: type === 'line'
      },
      {
        label: 'Pending',
        data: data.map(item => item.pending),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: type === 'bar' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(245, 158, 11, 0.1)',
        tension: type === 'line' ? 0.4 : undefined,
        fill: type === 'line'
      },
      {
        label: 'Disputed',
        data: data.map(item => item.disputed),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: type === 'bar' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.1)',
        tension: type === 'line' ? 0.4 : undefined,
        fill: type === 'line'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (context: any) => {
            const date = data[context[0].dataIndex]?.day;
            return date ? format(parseISO(date), 'EEEE, MMMM dd, yyyy') : '';
          },
          afterBody: (context: any) => {
            const dataIndex = context[0].dataIndex;
            const item = data[dataIndex];
            if (item) {
              const verificationRate = item.total > 0 ? ((item.verified / item.total) * 100).toFixed(1) : '0';
              return [`Verification Rate: ${verificationRate}%`];
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          stepSize: 1
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const ChartComponent = type === 'line' ? Line : Bar;

  return (
    <div style={{ height: `${height}px` }}>
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}

interface StatusDistributionProps {
  verified: number;
  pending: number;
  disputed: number;
  height?: number;
  type?: 'doughnut' | 'pie';
  title?: string;
}

export function StatusDistributionChart({ 
  verified, 
  pending, 
  disputed, 
  height = 300,
  type = 'doughnut',
  title 
}: StatusDistributionProps) {
  const total = verified + pending + disputed;
  
  const chartData = {
    labels: ['Verified', 'Pending', 'Disputed'],
    datasets: [
      {
        data: [verified, pending, disputed],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 0.9)',
          'rgba(245, 158, 11, 0.9)',
          'rgba(239, 68, 68, 0.9)'
        ]
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: type === 'doughnut' ? '60%' : 0
  };

  const ChartComponent = Doughnut;

  return (
    <div style={{ height: `${height}px` }}>
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}

interface VerificationRateProps {
  courses: Array<{
    code: string;
    name: string;
    verificationRate: number;
    totalRecords: number;
  }>;
  height?: number;
  title?: string;
}

export function VerificationRateChart({ courses, height = 300, title }: VerificationRateProps) {
  const chartData = {
    labels: courses.map(course => course.code),
    datasets: [
      {
        label: 'Verification Rate (%)',
        data: courses.map(course => course.verificationRate),
        backgroundColor: courses.map(course => {
          if (course.verificationRate >= 90) return 'rgba(34, 197, 94, 0.8)';
          if (course.verificationRate >= 70) return 'rgba(245, 158, 11, 0.8)';
          return 'rgba(239, 68, 68, 0.8)';
        }),
        borderColor: courses.map(course => {
          if (course.verificationRate >= 90) return 'rgb(34, 197, 94)';
          if (course.verificationRate >= 70) return 'rgb(245, 158, 11)';
          return 'rgb(239, 68, 68)';
        }),
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const course = courses[context[0].dataIndex];
            return course ? `${course.code} - ${course.name}` : '';
          },
          label: (context: any) => {
            const course = courses[context.dataIndex];
            return [
              `Verification Rate: ${context.parsed.y.toFixed(1)}%`,
              `Total Records: ${course.totalRecords}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: (value: any) => `${value}%`
        }
      }
    }
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}