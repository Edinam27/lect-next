'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardCard {
  title: string
  description: string
  href: string
  color: string
  icon: string
}

const adminCards: DashboardCard[] = [
  {
    title: 'User Management',
    description: 'Manage users, lecturers, and class representatives',
    href: '/dashboard/users',
    color: 'bg-blue-500',
    icon: 'users'
  },
  {
    title: 'Programme Management',
    description: 'Manage academic programmes and degrees',
    href: '/dashboard/programmes',
    color: 'bg-green-500',
    icon: 'academic-cap'
  },
  {
    title: 'Course Management',
    description: 'Manage courses and class schedules',
    href: '/dashboard/courses',
    color: 'bg-purple-500',
    icon: 'book-open'
  },
  {
    title: 'Attendance Records',
    description: 'View all attendance records across the system',
    href: '/dashboard/attendance',
    color: 'bg-yellow-500',
    icon: 'clipboard-check'
  },
  {
    title: 'Reports & Analytics',
    description: 'Generate reports and view system analytics',
    href: '/dashboard/reports',
    color: 'bg-red-500',
    icon: 'chart-bar'
  },
  {
    title: 'Import Data',
    description: 'Bulk import users, courses, and schedules',
    href: '/dashboard/import',
    color: 'bg-indigo-500',
    icon: 'upload'
  }
]

const getIcon = (iconName: string) => {
  const icons: { [key: string]: JSX.Element } = {
    users: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    ),
    'academic-cap': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
      />
    ),
    'book-open': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
    'clipboard-check': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
    'chart-bar': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
    upload: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    )
  }
  return icons[iconName] || icons.users
}

interface AdminStats {
  users: {
    total: number
    admins: number
    coordinators: number
    lecturers: number
    classReps: number
  }
  courses: {
    total: number
    schedules: number
  }
  attendance: {
    total: number
    rate: number
    recentActivity: number
  }
  programmes: {
    total: number
  }
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.replace('/auth/signin')
      return
    }
    
    if (session.user.role !== 'ADMIN') {
      router.replace('/dashboard')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.user || session.user.role !== 'ADMIN') return
      
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          System Administrator Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {adminCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block p-4 sm:p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${card.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}>
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {getIcon(card.icon)}
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {card.title}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">System Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {loading ? '--' : stats?.users?.total?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Total Users</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {loading ? '--' : stats?.courses?.total?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Active Courses</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {loading ? '--' : stats?.attendance?.total?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {loading ? '--' : `${stats?.attendance?.rate || 0}%`}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">User Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-lg sm:text-xl font-bold text-red-600">
              {loading ? '--' : stats?.users?.admins?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Administrators</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {loading ? '--' : stats?.users?.coordinators?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Coordinators</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {loading ? '--' : stats?.users?.lecturers?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Lecturers</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-lg sm:text-xl font-bold text-purple-600">
              {loading ? '--' : stats?.users?.classReps?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Class Reps</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600">Attendance records in the last 7 days</p>
              <p className="text-2xl font-bold text-indigo-600">
                {loading ? '--' : stats?.attendance?.recentActivity?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Programmes</p>
              <p className="text-xl font-semibold text-gray-700">
                {loading ? '--' : stats?.programmes?.total?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}