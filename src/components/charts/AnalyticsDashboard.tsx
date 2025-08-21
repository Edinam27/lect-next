'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Filter, TrendingUp, Users, Calendar, BarChart3 } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import AttendanceTrendsChart from './AttendanceTrendsChart';
import VerificationStatusChart from './VerificationStatusChart';
import LecturerPerformanceChart from './LecturerPerformanceChart';
import CourseAttendanceChart from './CourseAttendanceChart';
import AttendanceHeatmapChart from './AttendanceHeatmapChart';

interface AnalyticsData {
  attendanceTrends: {
    day: string;
    total: number;
    verified: number;
    disputed: number;
    pending: number;
  }[];
  verificationStatus: {
    verified: number;
    disputed: number;
    pending: number;
  };
  lecturerPerformance: {
    lecturerName: string;
    totalSessions: number;
    averageAttendance: number;
    verificationRate: number;
    totalStudents: number;
  }[];
  courseAttendance: {
    courseName: string;
    courseCode: string;
    totalSessions: number;
    averageAttendance: number;
    totalStudents: number;
    attendanceRate: number;
  }[];
  heatmapData: {
    day: string;
    hour: number;
    value: number;
    sessions: number;
  }[];
  summary: {
    totalRecords: number;
    verificationRate: number;
    averageAttendance: number;
    activeLecturers: number;
    activeCourses: number;
  };
}

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = '',
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [selectedLecturer, setSelectedLecturer] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'comprehensive',
        startDate: dateRange?.from?.toISOString() || '',
        endDate: dateRange?.to?.toISOString() || '',
        ...(selectedLecturer !== 'all' && { lecturerId: selectedLecturer }),
        ...(selectedCourse !== 'all' && { courseId: selectedCourse }),
      });

      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedLecturer, selectedCourse]);

  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        type: 'export',
        format,
        startDate: dateRange?.from?.toISOString() || '',
        endDate: dateRange?.to?.toISOString() || '',
        ...(selectedLecturer !== 'all' && { lecturerId: selectedLecturer }),
        ...(selectedCourse !== 'all' && { courseId: selectedCourse }),
      });

      const response = await fetch(`/api/analytics/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center h-96`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${className} flex items-center justify-center h-96`}>
        <div className="text-center">
          <p className="text-gray-500">No analytics data available</p>
          <Button onClick={fetchAnalyticsData} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive attendance and verification insights</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Select value="csv" onValueChange={(value) => exportData(value as 'csv' | 'pdf')}>
              <SelectTrigger className="w-32">
                <Download className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">Export CSV</SelectItem>
                <SelectItem value="pdf">Export PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
            className="w-auto"
          />
          
          <Select value={selectedLecturer} onValueChange={setSelectedLecturer}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Lecturers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lecturers</SelectItem>
              {data.lecturerPerformance.map((lecturer, index) => (
                <SelectItem key={index} value={lecturer.lecturerName}>
                  {lecturer.lecturerName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {data.courseAttendance.map((course, index) => (
                <SelectItem key={index} value={course.courseCode || course.courseName}>
                  {course.courseCode || course.courseName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold">{data.summary.totalRecords.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verification Rate</p>
                <p className="text-2xl font-bold">{data.summary.verificationRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Attendance</p>
                <p className="text-2xl font-bold">{data.summary.averageAttendance.toFixed(1)}%</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Lecturers</p>
                <p className="text-2xl font-bold">{data.summary.activeLecturers}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Courses</p>
                <p className="text-2xl font-bold">{data.summary.activeCourses}</p>
              </div>
              <Calendar className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="lecturers">Lecturers</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Verification Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <VerificationStatusChart
                  data={data.verificationStatus}
                  height={300}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceTrendsChart
                  data={data.attendanceTrends.slice(-7)} // Last 7 days
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTrendsChart
                data={data.attendanceTrends}
                height={400}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="lecturers">
          <Card>
            <CardHeader>
              <CardTitle>Lecturer Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <LecturerPerformanceChart
                data={data.lecturerPerformance}
                height={400}
                metric="attendance"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Course Attendance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseAttendanceChart
                data={data.courseAttendance}
                height={400}
                showComparison={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceHeatmapChart
                data={data.heatmapData}
                height={500}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;