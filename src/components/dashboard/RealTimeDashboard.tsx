'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AttendanceChart, StatusDistributionChart } from '@/components/charts/AttendanceChart';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface DashboardStats {
  totalRecords: number;
  verifiedRecords: number;
  pendingRecords: number;
  disputedRecords: number;
  verificationRate: number;
  pendingRate: number;
  trend: {
    totalChange: number;
    verificationChange: number;
  };
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

interface RealTimeDashboardProps {
  compact?: boolean;
  showCharts?: boolean;
  refreshInterval?: number; // in milliseconds
  className?: string;
}

export default function RealTimeDashboard({ 
  compact = false, 
  showCharts = true, 
  refreshInterval = 30000, // 30 seconds
  className = '' 
}: RealTimeDashboardProps) {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async (showLoader = false) => {
    // Don't fetch if user is not authenticated
    if (status !== 'authenticated' || !session?.user) {
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      if (showLoader) setIsRefreshing(true);
      
      const response = await fetch('/api/analytics?type=overview&period=7d');
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Authentication required for dashboard data');
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      
      // Calculate trends (mock data for now - in real implementation, compare with previous period)
      const mockTrends = {
        totalChange: Math.floor(Math.random() * 20) - 10, // -10 to +10
        verificationChange: Math.floor(Math.random() * 10) - 5 // -5 to +5
      };
      
      setStats({
        ...data.overview,
        trend: mockTrends
      });
      setRecentActivity(data.recentActivity.slice(0, compact ? 3 : 5));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Only fetch data when session is loaded and user is authenticated
    if (status === 'authenticated') {
      fetchDashboardData(true);
      
      const interval = setInterval(() => {
        fetchDashboardData(false);
      }, refreshInterval);
      
      return () => clearInterval(interval);
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [refreshInterval, status, session]);

  const handleManualRefresh = () => {
    fetchDashboardData(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100';
      case 'disputed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUpIcon className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDownIcon className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Show loading state while session is being loaded
  if (status === 'loading' || loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show authentication required message
  if (status === 'unauthenticated') {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
          <p>Please sign in to view dashboard data</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
          <p>Failed to load dashboard data</p>
          <button 
            onClick={handleManualRefresh}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`font-semibold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
              Real-Time Dashboard
            </h2>
            <p className="text-sm text-gray-600">
              Last updated: {format(lastUpdated, 'HH:mm:ss')}
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics */}
        <div className={`grid gap-4 mb-6 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {/* Total Records */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Records</p>
                <p className={`font-bold text-blue-900 ${compact ? 'text-xl' : 'text-2xl'}`}>
                  {stats.totalRecords}
                </p>
                {stats.trend.totalChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${getTrendColor(stats.trend.totalChange)}`}>
                    {getTrendIcon(stats.trend.totalChange)}
                    <span>{Math.abs(stats.trend.totalChange)} this week</span>
                  </div>
                )}
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Verified */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Verified</p>
                <p className={`font-bold text-green-900 ${compact ? 'text-xl' : 'text-2xl'}`}>
                  {stats.verifiedRecords}
                </p>
                <p className="text-xs text-green-700">{stats.verificationRate.toFixed(1)}% rate</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className={`font-bold text-yellow-900 ${compact ? 'text-xl' : 'text-2xl'}`}>
                  {stats.pendingRecords}
                </p>
                <p className="text-xs text-yellow-700">{stats.pendingRate.toFixed(1)}% rate</p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          {/* Disputed */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Disputed</p>
                <p className={`font-bold text-red-900 ${compact ? 'text-xl' : 'text-2xl'}`}>
                  {stats.disputedRecords}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Charts and Activity */}
        <div className={`grid gap-6 ${showCharts && !compact ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Status Distribution Chart */}
          {showCharts && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
              <StatusDistributionChart
                verified={stats.verifiedRecords}
                pending={stats.pendingRecords}
                disputed={stats.disputedRecords}
                height={compact ? 200 : 250}
              />
            </div>
          )}

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <EyeIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{activity.course}</p>
                      <p className="text-xs text-gray-600 truncate">{activity.lecturer} • {activity.classGroup}</p>
                      <p className="text-xs text-gray-500">{format(new Date(activity.date), 'MMM dd, HH:mm')}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </span>
                      <span className="text-xs text-gray-500 hidden sm:inline">{activity.sessionType}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <ClockIcon className="w-8 h-8 mx-auto mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}