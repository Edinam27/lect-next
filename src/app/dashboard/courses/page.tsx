'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Course {
  id: string
  courseCode: string
  title: string
  credits: number
  semester: number
  isElective: boolean
  description: string
  createdAt: string
  programme: {
    id: string
    name: string
    level: string
  }
  _count?: {
    courseSchedules: number
  }
}

export default function CoursesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [semesterFilter, setSemesterFilter] = useState('all')

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

    fetchCourses()
  }, [session, status, router])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
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

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'COORDINATOR')) {
    return null
  }

  const filteredCourses = courses.filter(course => {
    if (filter === 'elective' && !course.isElective) return false
    if (filter === 'core' && course.isElective) return false
    if (semesterFilter !== 'all' && course.semester.toString() !== semesterFilter) return false
    return true
  })

  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'undergraduate': return 'bg-blue-100 text-blue-800'
      case 'postgraduate': return 'bg-green-100 text-green-800'
      case 'doctoral': return 'bg-purple-100 text-purple-800'
      case 'certificate': return 'bg-yellow-100 text-yellow-800'
      case 'diploma': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
        <p className="mt-2 text-gray-600">
          Manage courses across all programmes
        </p>
      </div>

      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Courses</option>
            <option value="core">Core Courses</option>
            <option value="elective">Elective Courses</option>
          </select>
          
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
          </select>
        </div>
        
        <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
          <Link
            href="/dashboard/courses/create"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Course
          </Link>
          <Link
            href="/dashboard/import"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Bulk Import
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No courses found matching the current filters.</p>
            <Link
              href="/dashboard/courses/create"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create First Course
            </Link>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div key={course.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {course.courseCode}
                  </span>
                  <div className="flex space-x-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${course.isElective ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                      {course.isElective ? 'Elective' : 'Core'}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      {course.credits} Credits
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {course.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {course.description}
                </p>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Programme:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelBadgeColor(course.programme.level)}`}>
                      {course.programme.level}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{course.programme.name}</p>
                  <p className="text-sm text-gray-500">Semester {course.semester}</p>
                </div>
                
                {course._count && (
                  <div className="grid grid-cols-1 gap-4 mb-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{course._count.courseSchedules}</p>
                      <p className="text-xs text-gray-500">Schedules</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-400">
                    Created: {new Date(course.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/courses/${course.id}/edit`}
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Course Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            <p className="text-sm text-gray-500">Total Courses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {courses.filter(c => !c.isElective).length}
            </p>
            <p className="text-sm text-gray-500">Core Courses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {courses.filter(c => c.isElective).length}
            </p>
            <p className="text-sm text-gray-500">Elective Courses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {courses.reduce((sum, course) => sum + (course.creditHours || 0), 0)}
            </p>
            <p className="text-sm text-gray-500">Total Credits</p>
          </div>
        </div>
      </div>
    </div>
  )
}