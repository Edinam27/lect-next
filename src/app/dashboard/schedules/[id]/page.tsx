'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'

interface Schedule {
  id: string
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string
  endTime: string
  sessionType: string
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

interface AttendanceRecord {
  id: string
  date: string
  status: string
  student: {
    user: {
      firstName: string
      lastName: string
      email: string
    }
    studentId: string
  }
}

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (!['ADMIN', 'COORDINATOR', 'LECTURER'].includes(session.user.role)) {
      router.push('/dashboard')
      return
    }

    fetchSchedule()
  }, [session, status, router, resolvedParams.id])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      const [scheduleResponse, attendanceResponse] = await Promise.all([
        fetch(`/api/schedules/${resolvedParams.id}`),
        fetch(`/api/schedules/${resolvedParams.id}/attendance`)
      ])

      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule details')
      }

      const scheduleData = await scheduleResponse.json()
      setSchedule(scheduleData)

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        setAttendanceRecords(attendanceData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/schedules/${resolvedParams.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete schedule')
      }

      router.push('/dashboard/schedules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || !['ADMIN', 'COORDINATOR', 'LECTURER'].includes(session.user.role)) {
    return null
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading schedule</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dashboard/schedules"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Schedules
          </Link>
        </div>
      </div>
    )
  }

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getDayName = (dayNumber: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNumber] || 'Unknown'
  }

  const getDayShort = (dayNumber: number): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[dayNumber] || 'N/A'
  }

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

  const getSessionTypeBadgeColor = (type: string) => {
    const colors = {
      'LECTURE': 'bg-blue-100 text-blue-800',
      'TUTORIAL': 'bg-green-100 text-green-800',
      'PRACTICAL': 'bg-purple-100 text-purple-800',
      'SEMINAR': 'bg-yellow-100 text-yellow-800',
      'WORKSHOP': 'bg-pink-100 text-pink-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {schedule.course.code} - {schedule.course.name}
            </h1>
            <p className="mt-2 text-gray-600">
              {schedule.course.programme.name} ({schedule.course.programme.level})
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/schedules"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Schedules
            </Link>
            {(session.user.role === 'ADMIN' || session.user.role === 'COORDINATOR') && (
              <>
                <Link
                  href={`/dashboard/schedules/${schedule.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Edit Schedule
                </Link>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                >
                  Delete Schedule
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Schedule Details */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Schedule Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Day of Week</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDayBadgeColor(schedule.dayOfWeek)}`}>
                    {schedule.dayOfWeek !== undefined ? getDayName(schedule.dayOfWeek) : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Session Type</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSessionTypeBadgeColor(schedule.sessionType)}`}>
                    {schedule.sessionType ? schedule.sessionType.charAt(0) + schedule.sessionType.slice(1).toLowerCase() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Time</label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Venue</label>
                <p className="mt-1 text-sm text-gray-900">{schedule.venue}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Class Group</label>
                <p className="mt-1 text-sm text-gray-900">{schedule.classGroup.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Academic Year</label>
                <p className="mt-1 text-sm text-gray-900">{schedule.classGroup.academicYear}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Lecturer</label>
                <p className="mt-1 text-sm text-gray-900">
                  {schedule.lecturer.firstName} {schedule.lecturer.lastName}
                </p>
                <p className="text-xs text-gray-500">{schedule.lecturer.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    schedule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {schedule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Attendance</h2>
              <Link
                href={`/dashboard/attendance/take?scheduleId=${schedule.id}`}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                Take Attendance
              </Link>
            </div>
            
            {attendanceRecords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No attendance records found for this schedule.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.slice(0, 10).map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.student.user.firstName} {record.student.user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{record.student.studentId}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                              record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                              record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status.toLowerCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {attendanceRecords.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Showing 10 of {attendanceRecords.length} records
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistics Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{schedule._count?.attendanceRecords || 0}</p>
                <p className="text-sm text-gray-600">Total Attendance Records</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {attendanceRecords.filter(r => r.status === 'PRESENT').length}
                </p>
                <p className="text-sm text-gray-600">Present</p>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {attendanceRecords.filter(r => r.status === 'ABSENT').length}
                </p>
                <p className="text-sm text-gray-600">Absent</p>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {attendanceRecords.filter(r => r.status === 'LATE').length}
                </p>
                <p className="text-sm text-gray-600">Late</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Course Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Course Code</label>
                <p className="mt-1 text-sm text-gray-900">{schedule.course.code}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Credit Hours</label>
                <p className="mt-1 text-sm text-gray-900">{schedule.course.credits}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Programme</label>
                <p className="mt-1 text-sm text-gray-900">{schedule.course.programme.name}</p>
                <p className="text-xs text-gray-500">{schedule.course.programme.level}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(schedule.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}