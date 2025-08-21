'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  profile?: {
    phoneNumber?: string
    dateOfBirth?: string
    address?: string
    emergencyContact?: string
  }
  lecturer?: {
    employeeId: string
    department: string
    specialization?: string
    _count: {
      courseSchedules: number
    }
  }
  student?: {
    studentId: string
    admissionYear: number
    classGroup: {
      id: string
      name: string
      programme: {
        name: string
        level: string
      }
    }
    _count: {
      attendanceRecords: number
    }
  }
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchUserData()
  }, [session, status, router, resolvedParams.id])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${resolvedParams.id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch user details')
      }

      const userData = await response.json()
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/users/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !user.isActive
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      setUser(prev => prev ? { ...prev, isActive: !prev.isActive } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading user</div>
          <p className="text-gray-600 mb-4">{error || 'User not found'}</p>
          <Link
            href="/dashboard/users"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'COORDINATOR':
        return 'bg-purple-100 text-purple-800'
      case 'LECTURER':
        return 'bg-blue-100 text-blue-800'
      case 'CLASS_REP':
        return 'bg-green-100 text-green-800'
      case 'STUDENT':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="mt-2 text-gray-600">
              {user.email}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/users"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Users
            </Link>
            <button
              onClick={toggleUserStatus}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                user.isActive 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {user.isActive ? 'Deactivate User' : 'Activate User'}
            </button>
            <Link
              href={`/dashboard/users/${user.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Edit User
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.firstName} {user.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(user.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Profile Information */}
          {user.profile && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.profile.phoneNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.profile.phoneNumber}</dd>
                  </div>
                )}
                {user.profile.dateOfBirth && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(user.profile.dateOfBirth)}</dd>
                  </div>
                )}
                {user.profile.address && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.profile.address}</dd>
                  </div>
                )}
                {user.profile.emergencyContact && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.profile.emergencyContact}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Role-specific Information */}
          {user.lecturer && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lecturer Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.lecturer.employeeId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Department</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.lecturer.department}</dd>
                </div>
                {user.lecturer.specialization && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Specialization</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.lecturer.specialization}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Course Schedules</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.lecturer._count.courseSchedules}</dd>
                </div>
              </dl>
            </div>
          )}

          {user.student && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Student ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.student.studentId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Admission Year</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.student.admissionYear}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Class Group</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.student.classGroup.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Programme</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.student.classGroup.programme.name} ({user.student.classGroup.programme.level})
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Attendance Records</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.student._count.attendanceRecords}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href={`/dashboard/users/${user.id}/edit`}
                className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Edit User
              </Link>
              <button
                onClick={toggleUserStatus}
                className={`block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  user.isActive 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {user.isActive ? 'Deactivate User' : 'Activate User'}
              </button>
            </div>
          </div>

          {user.lecturer && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lecturer Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Course Schedules</span>
                  <span className="text-sm font-medium text-gray-900">{user.lecturer._count.courseSchedules}</span>
                </div>
              </div>
            </div>
          )}

          {user.student && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Student Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Attendance Records</span>
                  <span className="text-sm font-medium text-gray-900">{user.student._count.attendanceRecords}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}