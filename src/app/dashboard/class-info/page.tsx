'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ClassGroup {
  id: string
  name: string
  admissionYear: number
  deliveryMode: string
  programme: {
    id: string
    name: string
    level: string
    durationSemesters: number
    description: string
  }
  classRep: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  _count: {
    students: number
    courseSchedules: number
  }
}

export default function ClassInfoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classInfo, setClassInfo] = useState<ClassGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'CLASS_REP') {
      router.push('/dashboard')
      return
    }

    fetchClassInfo()
  }, [session, status, router])

  const fetchClassInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/class-groups/my-class')
      if (!response.ok) {
        throw new Error('Failed to fetch class information')
      }
      const data = await response.json()
      setClassInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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

  if (!session || session.user.role !== 'CLASS_REP') {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading class information</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchClassInfo}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-xl mb-4">No class information found</div>
          <p className="text-gray-600">You may not be assigned to a class group yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Class Information</h1>
        <p className="mt-2 text-gray-600">
          Details about your class and programme
        </p>
      </div>

      {/* Class Group Information */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Class Group Details</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Class Name</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Admission Year</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo.admissionYear}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Delivery Mode</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo.deliveryMode}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Students</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo._count.students}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Programme Information */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Programme Details</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Programme Name</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo.programme.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo.programme.level}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo.programme.durationSemesters} semesters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Schedules</label>
              <p className="mt-1 text-lg text-gray-900">{classInfo._count.courseSchedules}</p>
            </div>
          </div>
          {classInfo.programme.description && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-gray-900">{classInfo.programme.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Class Representative Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Class Representative</h2>
        </div>
        <div className="px-6 py-4">
          {classInfo.classRep ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-lg text-gray-900">
                  {classInfo.classRep.firstName} {classInfo.classRep.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-lg text-gray-900">{classInfo.classRep.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No class representative assigned</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{classInfo._count.students}</p>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{classInfo._count.courseSchedules}</p>
            <p className="text-sm text-gray-500">Course Schedules</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{classInfo.programme.durationSemesters}</p>
            <p className="text-sm text-gray-500">Total Semesters</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{classInfo.admissionYear}</p>
            <p className="text-sm text-gray-500">Admission Year</p>
          </div>
        </div>
      </div>
    </div>
  )
}