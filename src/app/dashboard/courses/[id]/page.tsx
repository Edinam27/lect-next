'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import LecturerAssignment from '@/components/LecturerAssignment'

interface Course {
  id: string
  courseCode: string
  title: string
  description: string
  creditHours: number
  semester: number
  isElective: boolean
  createdAt: string
  programme: {
    id: string
    name: string
    level: string
  }
  _count: {
    courseSchedules: number
  }
}

interface CourseSchedule {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
  sessionType: string
  lecturer: {
    firstName: string
    lastName: string
    email: string
  }
  classGroup: {
    name: string
    admissionYear: number
  }
  classroom: {
    roomCode: string
    building: {
      name: string
    }
  }
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [course, setCourse] = useState<Course | null>(null)
  const [schedules, setSchedules] = useState<CourseSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR' && session.user.role !== 'LECTURER') {
      router.push('/dashboard')
      return
    }

    fetchCourseDetails()
  }, [session, status, router, resolvedParams.id])

  const fetchCourseDetails = async () => {
    try {
      setLoading(true)
      const [courseResponse, schedulesResponse] = await Promise.all([
        fetch(`/api/courses/${resolvedParams.id}`),
        fetch(`/api/courses/${resolvedParams.id}/schedules`)
      ])

      if (!courseResponse.ok) {
        throw new Error('Failed to fetch course details')
      }

      const courseData = await courseResponse.json()
      setCourse(courseData)

      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json()
        setSchedules(schedulesData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR' && session.user.role !== 'LECTURER')) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading course</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dashboard/courses"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-xl mb-4">Course not found</div>
          <Link
            href="/dashboard/courses"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.courseCode}</h1>
            <p className="mt-2 text-xl text-gray-600">{course.title}</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/courses"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Courses
            </Link>
            {(session.user.role === 'ADMIN' || session.user.role === 'COORDINATOR') && (
              <Link
                href={`/dashboard/courses/${course.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Edit Course
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Course Information */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Course Information</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Code</label>
              <p className="mt-1 text-lg text-gray-900">{course.courseCode}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Credit Hours</label>
              <p className="mt-1 text-lg text-gray-900">{course.creditHours}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Semester</label>
              <p className="mt-1 text-lg text-gray-900">{course.semester}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Programme</label>
              <p className="mt-1 text-lg text-gray-900">{course.programme.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <p className="mt-1 text-lg text-gray-900">{course.programme.level}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Course Type</label>
              <p className="mt-1 text-lg text-gray-900">
                {course.isElective ? 'Elective' : 'Core'}
              </p>
            </div>
          </div>
          {course.description && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-gray-900">{course.description}</p>
            </div>
          )}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">Created</label>
            <p className="mt-1 text-gray-900">{formatDate(course.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Course Schedules */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Course Schedules ({schedules.length})
            </h2>
            <LecturerAssignment 
              courseId={resolvedParams.id} 
              onAssignmentComplete={() => {
                fetchCourseDetails()
              }} 
            />
          </div>
        </div>
        <div className="px-6 py-4">
          {schedules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No schedules found for this course
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lecturer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{schedule.dayOfWeek}</div>
                          <div className="text-gray-500">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{schedule.classGroup.name}</div>
                          <div className="text-gray-500">Year {schedule.classGroup.admissionYear}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">
                            {schedule.lecturer.user.firstName} {schedule.lecturer.user.lastName}
                          </div>
                          <div className="text-gray-500">{schedule.lecturer.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{schedule.classroom.roomCode}</div>
                          <div className="text-gray-500">{schedule.classroom.building.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          schedule.sessionType === 'LECTURE' ? 'bg-blue-100 text-blue-800' :
                          schedule.sessionType === 'TUTORIAL' ? 'bg-green-100 text-green-800' :
                          schedule.sessionType === 'PRACTICAL' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {schedule.sessionType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Course Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{course.creditHours}</p>
            <p className="text-sm text-gray-500">Credit Hours</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{schedules.length}</p>
            <p className="text-sm text-gray-500">Total Schedules</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{course.semester}</p>
            <p className="text-sm text-gray-500">Semester</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {course.isElective ? 'Elective' : 'Core'}
            </p>
            <p className="text-sm text-gray-500">Course Type</p>
          </div>
        </div>
      </div>
    </div>
  )
}