'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChartBarIcon, DocumentArrowDownIcon, UserGroupIcon, AcademicCapIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, CalendarIcon } from '@heroicons/react/24/outline'
import ScheduledReportsManager from '@/components/reports/ScheduledReportsManager'

interface ReportData {
  overview: {
    totalAttendance: number
    verifiedAttendance: number
    disputedAttendance: number
    pendingVerification: number
    verificationRate: number
    activeLecturers: number
    lecturersWithAttendance: number
    totalCourses: number
    coursesWithAttendance: number
  }
  trends: {
    daily: {
      date: string
      count: number
    }[]
  }
  topLecturers: {
    lecturerId: string
    name: string
    attendanceCount: number
  }[]
  dateRange: {
    start: string
    end: string
    range: string
  }
}

interface Lecturer {
  id: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('month')
  const [selectedLecturer, setSelectedLecturer] = useState<string>('')
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR') {
      router.push('/dashboard')
      return
    }

    fetchReportData()
    fetchLecturers()
  }, [session, status, router, dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const url = selectedLecturer 
        ? `/api/reports?range=${dateRange}&lecturerId=${selectedLecturer}`
        : `/api/reports?range=${dateRange}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLecturers = async () => {
    try {
      const response = await fetch('/api/lecturers')
      if (response.ok) {
        const data = await response.json()
        setLecturers(data)
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error)
    }
  }

  const exportReport = async (format: 'csv' | 'pdf') => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams({
        format,
        range: dateRange,
        tab: activeTab
      })
      
      if (selectedLecturer) {
        params.append('lecturerId', selectedLecturer)
      }
      
      const response = await fetch(`/api/reports/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        let filename = `attendance-report-${activeTab}-${dateRange}`
        if (selectedLecturer) {
          const lecturer = lecturers.find(l => l.id === selectedLecturer)
          if (lecturer) {
            filename += `-${lecturer.user.firstName}-${lecturer.user.lastName}`
          }
        }
        a.download = `${filename}.${format}`
        
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Export failed:', response.statusText)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    } finally {
      setExportLoading(false)
    }
  }

  // Refetch data when lecturer selection changes
  useEffect(() => {
    if (session && reportData) {
      setLoading(true)
      fetchReportData()
    }
  }, [selectedLecturer])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR')) {
    return null
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No report data available</p>
        </div>
      </div>
    )
  }

  const getOverallStats = () => {
    if (!reportData) return { totalSessions: 0, averageAttendance: 0, totalStudents: 0, totalCourses: 0 }
    
    return {
      totalSessions: reportData.overview.totalAttendance || 0,
      averageAttendance: Math.round((reportData.overview.verificationRate || 0) * 100) / 100,
      totalStudents: reportData.overview.lecturersWithAttendance || 0,
      totalCourses: reportData.overview.totalCourses || 0
    }
  }

  const stats = getOverallStats()

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'daily', name: 'Daily Trends', icon: ClockIcon },
    { id: 'courses', name: 'By Course', icon: AcademicCapIcon },
    { id: 'students', name: 'By Student', icon: UserGroupIcon },
    { id: 'lecturers', name: 'By Lecturer', icon: UserGroupIcon },
    { id: 'scheduled', name: 'Scheduled Reports', icon: CalendarIcon }
  ]

  const getSelectedLecturerName = () => {
    if (!selectedLecturer) return 'All Lecturers'
    const lecturer = lecturers.find(l => l.id === selectedLecturer)
    return lecturer ? `${lecturer.user.firstName} ${lecturer.user.lastName}` : 'Unknown Lecturer'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive attendance analytics and insights
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
                <span className="text-sm text-gray-500">Viewing:</span>
                <span className="ml-2 font-medium text-gray-900">{getSelectedLecturerName()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="semester">This Semester</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Lecturer</label>
                <select
                  value={selectedLecturer}
                  onChange={(e) => setSelectedLecturer(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                >
                  <option value="">All Lecturers</option>
                  {lecturers.map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.user.firstName} {lecturer.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => exportReport('csv')}
                disabled={exportLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => exportReport('pdf')}
                disabled={exportLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Attendance</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.overview.totalAttendance}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Verified</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.overview.verifiedAttendance}</p>
                <p className="text-xs text-green-600 font-medium">
                  {((reportData.overview.verifiedAttendance / reportData.overview.totalAttendance) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.overview.pendingVerification}</p>
                <p className="text-xs text-yellow-600 font-medium">
                  {((reportData.overview.pendingVerification / reportData.overview.totalAttendance) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Disputed</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.overview.disputedAttendance}</p>
                <p className="text-xs text-red-600 font-medium">
                  {((reportData.overview.disputedAttendance / reportData.overview.totalAttendance) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
            <nav className="flex space-x-2" aria-label="Tabs">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow-sm overflow-hidden rounded-xl border border-gray-200">
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Lecturers */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Top Lecturers by Attendance
                </h3>
                <div className="space-y-3">
                  {reportData?.topLecturers?.slice(0, 5).map((lecturer, index) => (
                    <div key={lecturer.lecturerId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{lecturer.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-blue-600">{lecturer.attendanceCount}</span>
                        <span className="text-xs text-gray-500 ml-1">sessions</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Trends */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-green-600" />
                  Recent Attendance Trends
                </h3>
                <div className="space-y-3">
                  {reportData?.trends?.daily?.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((day.count / Math.max(...reportData.trends.daily.map(d => d.count))) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-green-600 min-w-[3rem] text-right">{day.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <AcademicCapIcon className="h-5 w-5 mr-2 text-purple-600" />
              Attendance by Course
            </h3>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Course-specific attendance data</p>
              <p className="text-sm text-gray-500">Detailed course attendance analytics will be displayed here</p>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Attendance by Student
            </h3>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Student-specific attendance data</p>
              <p className="text-sm text-gray-500">Individual student attendance records and analytics will be displayed here</p>
            </div>
          </div>
        )}

        {activeTab === 'lecturers' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
              Attendance by Lecturer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData?.topLecturers?.map((lecturer, index) => (
                <div key={lecturer.lecturerId} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{lecturer.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">#{index + 1}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{lecturer.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sessions</span>
                    <span className="text-lg font-bold text-blue-600">{lecturer.attendanceCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-green-600" />
              Daily Attendance Trends
            </h3>
            <div className="space-y-4">
              {reportData?.trends?.daily?.map((day, index) => {
                const maxCount = Math.max(...reportData.trends.daily.map(d => d.count))
                const percentage = (day.count / maxCount) * 100
                return (
                  <div key={day.date} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="text-lg font-bold text-green-600">{day.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
              Scheduled Reports Management
            </h3>
            <ScheduledReportsManager />
          </div>
        )}
      </div>
      </div>
    </div>
  )
}