'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Schedule {
  id: string
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string
  endTime: string
  venue: string
  isActive: boolean
  createdAt: string
  course: {
    id: string
    code: string
    name: string
    credits: number
    programme: {
      name: string
      level: string
    }
  }
  classGroup: {
    id: string
    name: string
    academicYear: string
  }
  lecturer: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  _count?: {
    attendanceRecords: number
  }
}

// Helper functions for day conversion
const getDayName = (dayNumber: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayNumber] || 'Unknown'
}

const getDayShort = (dayNumber: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[dayNumber] || 'N/A'
}

export default function SchedulesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [dayFilter, setDayFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'LECTURER') {
      router.push('/dashboard')
      return
    }

    fetchSchedules()
  }, [session, status, router])

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/schedules')
      if (response.ok) {
        const data = await response.json()
        setSchedules(data)
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'LECTURER')) {
    return null
  }

  const filteredSchedules = schedules.filter(schedule => {
    if (dayFilter !== 'all' && schedule.dayOfWeek !== parseInt(dayFilter)) return false
    if (statusFilter === 'active' && !schedule.isActive) return false
    if (statusFilter === 'inactive' && schedule.isActive) return false
    return true
  })

  const getDayBadgeColor = (dayNumber: number) => {
    const colors = [
      'bg-purple-100 text-purple-800', // Sunday
      'bg-red-100 text-red-800',       // Monday
      'bg-orange-100 text-orange-800', // Tuesday
      'bg-yellow-100 text-yellow-800', // Wednesday
      'bg-green-100 text-green-800',   // Thursday
      'bg-blue-100 text-blue-800',     // Friday
      'bg-indigo-100 text-indigo-800'  // Saturday
    ]
    return colors[dayNumber] || 'bg-gray-100 text-gray-800'
  }

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] // Sunday to Saturday

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
        <p className="mt-2 text-gray-600">
          Manage class schedules and timetables
        </p>
      </div>

      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Days</option>
            {daysOfWeek.map(day => (
              <option key={day} value={day}>{getDayName(day)}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Schedules</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
          <Link
            href="/dashboard/schedules/create"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Schedule
          </Link>
          <Link
            href="/dashboard/import"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Bulk Import
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSchedules.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No schedules found matching the current filters.</p>
            <Link
              href="/dashboard/schedules/create"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create First Schedule
            </Link>
          </div>
        ) : (
          filteredSchedules.map((schedule) => (
            <div key={schedule.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDayBadgeColor(schedule.dayOfWeek)}`}>
                    {getDayName(schedule.dayOfWeek)}
                  </span>
                  <div className="flex space-x-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      schedule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {schedule.course.code} - {schedule.course.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {schedule.course.programme.name} ({schedule.course.programme.level})
                  </p>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Time:</span>
                    <span className="font-medium">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Venue:</span>
                    <span className="font-medium">{schedule.venue}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Class:</span>
                    <span className="font-medium">{schedule.classGroup.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Academic Year:</span>
                    <span className="font-medium">{schedule.classGroup.academicYear}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lecturer:</span>
                    <span className="font-medium">
                      {schedule.lecturer.firstName} {schedule.lecturer.lastName}
                    </span>
                  </div>
                </div>
                
                {schedule._count && (
                  <div className="text-center mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-lg font-semibold text-gray-900">{schedule._count.attendanceRecords}</p>
                    <p className="text-xs text-gray-500">Attendance Records</p>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-400">
                    Created: {new Date(schedule.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/schedules/${schedule.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/schedules/${schedule.id}/edit`}
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
            <p className="text-sm text-gray-500">Total Schedules</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {schedules.filter(s => s.isActive).length}
            </p>
            <p className="text-sm text-gray-500">Active Schedules</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {schedules.filter(s => !s.isActive).length}
            </p>
            <p className="text-sm text-gray-500">Inactive Schedules</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {new Set(schedules.map(s => s.lecturer.id)).size}
            </p>
            <p className="text-sm text-gray-500">Unique Lecturers</p>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Schedules by Day</h4>
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map(day => {
              const dayCount = schedules.filter(s => s.dayOfWeek === day && s.isActive).length
              return (
                <div key={day} className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-lg font-semibold text-gray-900">{dayCount}</p>
                  <p className="text-xs text-gray-500">{getDayShort(day)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}