'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Course {
  id: string
  courseCode: string
  title: string
  programme: {
    name: string
    level: string
  }
}

interface ClassGroup {
  id: string
  name: string
  programme: {
    name: string
    level: string
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

interface Classroom {
  id: string
  name: string
  capacity: number
  building: {
    name: string
  }
}

interface FormData {
  courseId: string
  classGroupId: string
  lecturerId: string
  classroomId: string
  dayOfWeek: string // Will be converted to number when submitting
  startTime: string
  endTime: string
  sessionType: string
}

export default function CreateSchedulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    courseId: '',
    classGroupId: '',
    lecturerId: '',
    classroomId: '',
    dayOfWeek: 'MONDAY',
    startTime: '08:00',
    endTime: '10:00',
    sessionType: 'LECTURE'
  })

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

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      setFetchLoading(true)
      const [coursesResponse, classGroupsResponse, lecturersResponse, classroomsResponse] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/class-groups'),
        fetch('/api/lecturers'),
        fetch('/api/classrooms')
      ])

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        setCourses(coursesData)
      }

      if (classGroupsResponse.ok) {
        const classGroupsData = await classGroupsResponse.json()
        setClassGroups(classGroupsData)
      }

      if (lecturersResponse.ok) {
        const lecturersData = await lecturersResponse.json()
        setLecturers(lecturersData)
      }

      if (classroomsResponse.ok) {
        const classroomsData = await classroomsResponse.json()
        setClassrooms(classroomsData)
      }
    } catch (err) {
      setError('Failed to fetch data')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Convert dayOfWeek to number for API
      const submitData = {
        ...formData,
        dayOfWeek: parseInt(formData.dayOfWeek)
      }

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create schedule')
      }

      router.push('/dashboard/schedules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (status === 'loading' || fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR')) {
    return null
  }

  const daysOfWeek = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' }
  ]

  const sessionTypes = [
    { value: 'LECTURE', label: 'Lecture' },
    { value: 'TUTORIAL', label: 'Tutorial' },
    { value: 'PRACTICAL', label: 'Practical' },
    { value: 'SEMINAR', label: 'Seminar' },
    { value: 'WORKSHOP', label: 'Workshop' }
  ]

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Schedule</h1>
            <p className="mt-2 text-gray-600">
              Add a new class schedule to the timetable
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/schedules"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 border border-red-300 rounded-md bg-red-50">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Course and Class Information */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Course Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <select
                  id="courseId"
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.courseCode} - {course.title} ({course.programme.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="classGroupId" className="block text-sm font-medium text-gray-700 mb-1">
                  Class Group *
                </label>
                <select
                  id="classGroupId"
                  name="classGroupId"
                  value={formData.classGroupId}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a class group</option>
                  {classGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} - {group.programme.name} ({group.programme.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="lecturerId" className="block text-sm font-medium text-gray-700 mb-1">
                  Lecturer *
                </label>
                <select
                  id="lecturerId"
                  name="lecturerId"
                  value={formData.lecturerId}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a lecturer</option>
                  {lecturers.map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.user.firstName} {lecturer.user.lastName} ({lecturer.user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="sessionType" className="block text-sm font-medium text-gray-700 mb-1">
                  Session Type *
                </label>
                <select
                  id="sessionType"
                  name="sessionType"
                  value={formData.sessionType}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {sessionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule Details */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Schedule Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-1">
                <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Week *
                </label>
                <select
                  id="dayOfWeek"
                  name="dayOfWeek"
                  value={formData.dayOfWeek}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="classroomId" className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom
                </label>
                <select
                  id="classroomId"
                  name="classroomId"
                  value={formData.classroomId}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Virtual/Online</option>
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.building.name} - {classroom.name} (Capacity: {classroom.capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end pt-6 border-t border-gray-200">
            <Link
              href="/dashboard/schedules"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}