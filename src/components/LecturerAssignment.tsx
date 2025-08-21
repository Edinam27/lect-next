'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Lecturer {
  id: string
  email: string
  firstName: string
  lastName: string
  lecturer: {
    employeeId: string
    department: string
    rank: string
    scheduleCount: number
  }
}

interface ClassGroup {
  id: string
  name: string
  admissionYear: number
}

interface Classroom {
  id: string
  roomCode: string
  name: string
  building: {
    name: string
  }
}

interface LecturerAssignmentProps {
  courseId: string
  onAssignmentComplete: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

const SESSION_TYPES = [
  { value: 'LECTURE', label: 'Lecture' },
  { value: 'SEMINAR', label: 'Seminar' },
  { value: 'LAB', label: 'Lab' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HYBRID', label: 'Hybrid' }
]

export default function LecturerAssignment({ courseId, onAssignmentComplete }: LecturerAssignmentProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    lecturerId: '',
    classGroupId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    classroomId: '',
    sessionType: 'LECTURE'
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [lecturersRes, classGroupsRes, classroomsRes] = await Promise.all([
        fetch('/api/lecturers'),
        fetch('/api/class-groups'),
        fetch('/api/classrooms')
      ])

      if (lecturersRes.ok) {
        const lecturersData = await lecturersRes.json()
        setLecturers(lecturersData)
      } else {
        console.error('Failed to fetch lecturers:', lecturersRes.status, lecturersRes.statusText)
      }

      if (classGroupsRes.ok) {
        const classGroupsData = await classGroupsRes.json()
        setClassGroups(classGroupsData)
      } else {
        console.error('Failed to fetch class groups:', classGroupsRes.status, classGroupsRes.statusText)
        const errorData = await classGroupsRes.json().catch(() => ({}))
        console.error('Class groups error details:', errorData)
      }

      if (classroomsRes.ok) {
        const classroomsData = await classroomsRes.json()
        setClassrooms(classroomsData)
      } else {
        console.error('Failed to fetch classrooms:', classroomsRes.status, classroomsRes.statusText)
        const errorData = await classroomsRes.json().catch(() => ({}))
        console.error('Classrooms error details:', errorData)
      }
    } catch (err) {
      console.error('Error in fetchData:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId,
          ...formData,
          dayOfWeek: parseInt(formData.dayOfWeek)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign lecturer')
      }

      // Reset form and close modal
      setFormData({
        lecturerId: '',
        classGroupId: '',
        dayOfWeek: '',
        startTime: '',
        endTime: '',
        classroomId: '',
        sessionType: 'LECTURE'
      })
      setIsOpen(false)
      onAssignmentComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Only show for coordinators and admins
  if (session?.user.role !== 'COORDINATOR' && session?.user.role !== 'ADMIN') {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        Assign Lecturer
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Lecturer to Course</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lecturer *
                      </label>
                      <select
                        value={formData.lecturerId}
                        onChange={(e) => handleInputChange('lecturerId', e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select a lecturer</option>
                        {lecturers.map((lecturer) => (
                          <option key={lecturer.id} value={lecturer.id}>
                            {lecturer.firstName} {lecturer.lastName} ({lecturer.lecturer.employeeId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Class Group *
                      </label>
                      <select
                        value={formData.classGroupId}
                        onChange={(e) => handleInputChange('classGroupId', e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select a class group</option>
                        {classGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} (Year {group.admissionYear})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Day of Week *
                      </label>
                      <select
                        value={formData.dayOfWeek}
                        onChange={(e) => handleInputChange('dayOfWeek', e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select a day</option>
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session Type *
                      </label>
                      <select
                        value={formData.sessionType}
                        onChange={(e) => handleInputChange('sessionType', e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {SESSION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Classroom
                    </label>
                    <select
                      value={formData.classroomId}
                      onChange={(e) => handleInputChange('classroomId', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a classroom (optional)</option>
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.roomCode} - {classroom.name} ({classroom.building.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {submitting ? 'Assigning...' : 'Assign Lecturer'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}