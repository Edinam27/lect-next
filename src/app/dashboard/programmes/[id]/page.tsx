'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'

interface Programme {
  id: string
  name: string
  code: string
  level: string
  duration: number
  description: string | null
  _count: {
    courses: number
    classGroups: number
  }
}

interface Course {
  id: string
  courseCode: string
  title: string
  creditHours: number
  semester: number
  isElective: boolean
}

export default function ProgrammeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    fetchProgrammeData()
  }, [session, status, router, resolvedParams.id])

  const fetchProgrammeData = async () => {
    try {
      setLoading(true)
      const [programmeResponse, coursesResponse] = await Promise.all([
        fetch(`/api/programmes/${resolvedParams.id}`),
        fetch(`/api/programmes/${resolvedParams.id}/courses`)
      ])

      if (!programmeResponse.ok) {
        throw new Error('Failed to fetch programme details')
      }

      const programmeData = await programmeResponse.json()
      setProgramme(programmeData)

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        setCourses(coursesData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch programme data')
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

  if (error || !programme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading programme</div>
          <p className="text-gray-600 mb-4">{error || 'Programme not found'}</p>
          <Link
            href="/dashboard/programmes"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Programmes
          </Link>
        </div>
      </div>
    )
  }

  const coreCoursesCount = courses.filter(course => !course.isElective).length
  const electiveCoursesCount = courses.filter(course => course.isElective).length
  const totalCreditHours = courses.reduce((sum, course) => sum + course.creditHours, 0)

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{programme.name}</h1>
            <p className="mt-2 text-gray-600">
              {programme.code} • {programme.level} • {programme.duration} years
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/programmes"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Programmes
            </Link>
            <Link
              href={`/dashboard/programmes/${programme.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Edit Programme
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Programme Information */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Programme Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Programme Code</dt>
                <dd className="mt-1 text-sm text-gray-900">{programme.code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Level</dt>
                <dd className="mt-1 text-sm text-gray-900">{programme.level}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">{programme.duration} years</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Courses</dt>
                <dd className="mt-1 text-sm text-gray-900">{programme._count.courses}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Class Groups</dt>
                <dd className="mt-1 text-sm text-gray-900">{programme._count.classGroups}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Credit Hours</dt>
                <dd className="mt-1 text-sm text-gray-900">{totalCreditHours}</dd>
              </div>
            </dl>
            {programme.description && (
              <div className="mt-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{programme.description}</dd>
              </div>
            )}
          </div>

          {/* Courses */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Courses</h2>
              <Link
                href="/dashboard/courses/create"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add Course
              </Link>
            </div>
            
            {courses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No courses found for this programme.</p>
                <Link
                  href="/dashboard/courses/create"
                  className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                >
                  Add First Course
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {course.courseCode}
                            </div>
                            <div className="text-sm text-gray-500">
                              {course.title}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Semester {course.semester}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {course.creditHours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            course.isElective 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {course.isElective ? 'Elective' : 'Core'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/courses/${course.id}`}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/courses/${course.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Course Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Courses</span>
                <span className="text-sm font-medium text-gray-900">{courses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Core Courses</span>
                <span className="text-sm font-medium text-gray-900">{coreCoursesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Elective Courses</span>
                <span className="text-sm font-medium text-gray-900">{electiveCoursesCount}</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="text-sm font-medium text-gray-900">Total Credit Hours</span>
                <span className="text-sm font-medium text-gray-900">{totalCreditHours}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/dashboard/courses/create"
                className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add New Course
              </Link>
              <Link
                href={`/dashboard/programmes/${programme.id}/edit`}
                className="block w-full text-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Edit Programme
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}