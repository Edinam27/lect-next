'use client';

import { useState, useEffect } from 'react';
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
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { format, parseISO } from 'date-fns';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

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

interface OverviewData {
  totalRecords: number;
  verifiedRecords: number;
  pendingRecords: number;
  disputedRecords: number;
  verificationRate: number;
  pendingRate: number;
}

interface RecentActivity {
  id: string;
  course: string;
  lecturer: string;
  classGroup: string;
  date: string;
  status: 'pending' | 'verified' | 'disputed';
  sessionType: string;
}

interface DailyTrend {
  day: string;
  total: number;
  verified: number;
  disputed: number;
  pending: number;
}

interface SessionType {
  type: string;
  count: number;
}

interface CourseAnalytic {
  id: string;
  name: string;
  code: string;
  totalRecords: number;
  verifiedRecords: number;
  disputedRecords: number;
  pendingRecords: number;
  verificationRate: number;
  virtualSessions: number;
  physicalSessions: number;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [verificationTrends, setVerificationTrends] = useState<any[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytic[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchAnalytics = async (type: string = activeTab) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?type=${type}&period=${timePeriod}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      
      switch (type) {
        case 'overview':
          setOverviewData(data.overview);
          setRecentActivity(data.recentActivity);
          break;
        case 'attendance':
          setDailyTrends(data.dailyTrends);
          setSessionTypes(data.sessionTypes);
          break;
        case 'verification':
          setVerificationTrends(data.verificationTrends);
          break;
        case 'courses':
          setCourseAnalytics(data.courses);
          break;
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5 * 60 * 1000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, timePeriod]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchAnalytics(tab);
  };

  const handlePeriodChange = (period: string) => {
    setTimePeriod(period);
  };

  // Chart configurations
  const dailyTrendsChartData = {
    labels: dailyTrends.map(trend => format(parseISO(trend.day), 'MMM dd')),
    datasets: [
      {
        label: 'Total Records',
        data: dailyTrends.map(trend => trend.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Verified',
        data: dailyTrends.map(trend => trend.verified),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      },
      {
        label: 'Disputed',
        data: dailyTrends.map(trend => trend.disputed),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }
    ]
  };

  const sessionTypesChartData = {
    labels: sessionTypes.map(type => type.type),
    datasets: [
      {
        data: sessionTypes.map(type => type.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }
    ]
  };

  const verificationStatusData = overviewData ? {
    labels: ['Verified', 'Pending', 'Disputed'],
    datasets: [
      {
        data: [overviewData.verifiedRecords, overviewData.pendingRecords, overviewData.disputedRecords],
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
        borderWidth: 2
      }
    ]
  } : null;

  const coursePerformanceData = {
    labels: courseAnalytics.map(course => course.code),
    datasets: [
      {
        label: 'Verification Rate (%)',
        data: courseAnalytics.map(course => course.verificationRate),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100';
      case 'disputed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights into attendance and verification data</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                { id: 'attendance', label: 'Attendance', icon: CalendarIcon },
                { id: 'verification', label: 'Verification', icon: CheckCircleIcon },
                { id: 'courses', label: 'Courses', icon: AcademicCapIcon }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Time Period Selector */}
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-gray-500" />
              <select
                value={timePeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="3m">Last 3 months</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && overviewData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Records</p>
                        <p className="text-3xl font-bold text-gray-900">{overviewData.totalRecords}</p>
                      </div>
                      <ChartBarIcon className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Verified</p>
                        <p className="text-3xl font-bold text-green-600">{overviewData.verifiedRecords}</p>
                        <p className="text-sm text-gray-500">{overviewData.verificationRate}% rate</p>
                      </div>
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-3xl font-bold text-yellow-600">{overviewData.pendingRecords}</p>
                        <p className="text-sm text-gray-500">{overviewData.pendingRate}% rate</p>
                      </div>
                      <ClockIcon className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Disputed</p>
                        <p className="text-3xl font-bold text-red-600">{overviewData.disputedRecords}</p>
                      </div>
                      <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Verification Status Chart */}
                  {verificationStatusData && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Status Distribution</h3>
                      <div className="h-64">
                        <Doughnut data={verificationStatusData} options={{ responsive: true, maintainAspectRatio: false }} />
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{activity.course}</p>
                            <p className="text-xs text-gray-600">{activity.lecturer} • {activity.classGroup}</p>
                            <p className="text-xs text-gray-500">{format(parseISO(activity.date), 'MMM dd, yyyy HH:mm')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                              {activity.status}
                            </span>
                            <span className="text-xs text-gray-500">{activity.sessionType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Trends */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance Trends</h3>
                  <div className="h-64">
                    <Line data={dailyTrendsChartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                  </div>
                </div>

                {/* Session Types */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Type Distribution</h3>
                  <div className="h-64">
                    <Pie data={sessionTypesChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>
            )}

            {/* Verification Tab */}
            {activeTab === 'verification' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Analytics</h3>
                <p className="text-gray-600">Detailed verification metrics and trends will be displayed here.</p>
              </div>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <>
                {/* Course Performance Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Verification Performance</h3>
                  <div className="h-64">
                    <Bar data={coursePerformanceData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                  </div>
                </div>

                {/* Course Details Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Records</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disputed</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {courseAnalytics.map((course) => (
                          <tr key={course.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{course.code}</div>
                                <div className="text-sm text-gray-500">{course.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.totalRecords}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{course.verifiedRecords}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{course.pendingRecords}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{course.disputedRecords}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.verificationRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}