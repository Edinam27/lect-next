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
  }
  student?: {
    studentId: string
    admissionYear: number
    classGroupId: string
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

interface FormData {
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  profile: {
    phoneNumber: string
    dateOfBirth: string
    address: string
    emergencyContact: string
  }
  lecturer: {
    employeeId: string
    department: string
    specialization: string
  }
  student: {
    studentId: string
    admissionYear: number
    classGroupId: string
  }
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'STUDENT',
    isActive: true,
    profile: {
      phoneNumber: '',
      dateOfBirth: '',
      address: '',
      emergencyContact: ''
    },
    lecturer: {
      employeeId: '',
      department: '',
      specialization: ''
    },
    student: {
      studentId: '',
      admissionYear: new Date().getFullYear(),
      classGroupId: ''
    }
  })

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

    fetchData()
  }, [session, status, router, resolvedParams.id])

  const fetchData = async () => {
    try {
      setFetchLoading(true)
      const [userResponse, programmeResponse] = await Promise.all([
        fetch(`/api/users/${resolvedParams.id}`),
        fetch('/api/class-groups')
      ])

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details')
      }

      const userData = await userResponse.json()
      setUser(userData)
      
      // Set form data from user
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        isActive: userData.isActive,
        profile: {
          phoneNumber: userData.profile?.phoneNumber || '',
          dateOfBirth: userData.profile?.dateOfBirth ? userData.profile.dateOfBirth.split('T')[0] : '',
          address: userData.profile?.address || '',
          emergencyContact: userData.profile?.emergencyContact || ''
        },
        lecturer: {
          employeeId: userData.lecturer?.employeeId || '',
          department: userData.lecturer?.department || '',
          specialization: userData.lecturer?.specialization || ''
        },
        student: {
          studentId: userData.student?.studentId || '',
          admissionYear: userData.student?.admissionYear || new Date().getFullYear(),
          classGroupId: userData.student?.classGroupId || ''
        }
      })

      if (classGroupsResponse.ok) {
        const classGroupsData = await classGroupsResponse.json()
        setClassGroups(classGroupsData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Prepare data based on role
      const submitData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        profile: formData.profile
      }

      if (formData.role === 'LECTURER') {
        submitData.lecturer = formData.lecturer
      } else if (formData.role === 'STUDENT' || formData.role === 'CLASS_REP') {
        submitData.student = formData.student
      }

      const response = await fetch(`/api/users/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      router.push(`/dashboard/users/${resolvedParams.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    if (name.startsWith('profile.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [field]: value
        }
      }))
    } else if (name.startsWith('lecturer.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        lecturer: {
          ...prev.lecturer,
          [field]: value
        }
      }))
    } else if (name.startsWith('student.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        student: {
          ...prev.student,
          [field]: field === 'admissionYear' ? parseInt(value) || new Date().getFullYear() : value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  if (status === 'loading' || fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error loading user</div>
          <p className="text-gray-600 mb-4">{error}</p>
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

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
            <p className="mt-2 text-gray-600">
              Update user information and settings
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/dashboard/users/${resolvedParams.id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
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

          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="CLASS_REP">Class Representative</option>
                  <option value="LECTURER">Lecturer</option>
                  <option value="COORDINATOR">Coordinator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    User is active
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="profile.phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="profile.phoneNumber"
                  name="profile.phoneNumber"
                  value={formData.profile.phoneNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="profile.dateOfBirth" className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="profile.dateOfBirth"
                  name="profile.dateOfBirth"
                  value={formData.profile.dateOfBirth}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="profile.address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="profile.address"
                  name="profile.address"
                  value={formData.profile.address}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="profile.emergencyContact" className="block text-sm font-medium text-gray-700">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  id="profile.emergencyContact"
                  name="profile.emergencyContact"
                  value={formData.profile.emergencyContact}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Role-specific Information */}
          {formData.role === 'LECTURER' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Lecturer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="lecturer.employeeId" className="block text-sm font-medium text-gray-700">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    id="lecturer.employeeId"
                    name="lecturer.employeeId"
                    value={formData.lecturer.employeeId}
                    onChange={handleChange}
                    required={formData.role === 'LECTURER'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="lecturer.department" className="block text-sm font-medium text-gray-700">
                    Department *
                  </label>
                  <input
                    type="text"
                    id="lecturer.department"
                    name="lecturer.department"
                    value={formData.lecturer.department}
                    onChange={handleChange}
                    required={formData.role === 'LECTURER'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="lecturer.specialization" className="block text-sm font-medium text-gray-700">
                    Specialization
                  </label>
                  <input
                    type="text"
                    id="lecturer.specialization"
                    name="lecturer.specialization"
                    value={formData.lecturer.specialization}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {(formData.role === 'STUDENT' || formData.role === 'CLASS_REP') && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Student Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="student.studentId" className="block text-sm font-medium text-gray-700">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    id="student.studentId"
                    name="student.studentId"
                    value={formData.student.studentId}
                    onChange={handleChange}
                    required={formData.role === 'STUDENT' || formData.role === 'CLASS_REP'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="student.admissionYear" className="block text-sm font-medium text-gray-700">
                    Admission Year *
                  </label>
                  <input
                    type="number"
                    id="student.admissionYear"
                    name="student.admissionYear"
                    value={formData.student.admissionYear}
                    onChange={handleChange}
                    required={formData.role === 'STUDENT' || formData.role === 'CLASS_REP'}
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="student.classGroupId" className="block text-sm font-medium text-gray-700">
                    Class Group *
                  </label>
                  <select
                    id="student.classGroupId"
                    name="student.classGroupId"
                    value={formData.student.classGroupId}
                    onChange={handleChange}
                    required={formData.role === 'STUDENT' || formData.role === 'CLASS_REP'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a class group</option>
                    {classGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} - {group.programme.name} ({group.programme.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Link
              href={`/dashboard/users/${resolvedParams.id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}