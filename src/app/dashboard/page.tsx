'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserRole } from '@prisma/client'
import RealTimeDashboard from '@/components/dashboard/RealTimeDashboard'
import {
  ChartBarIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline'

interface DashboardCard {
  title: string
  description: string
  href: string
  color: string
}

const getDashboardCards = (role: UserRole): DashboardCard[] => {
  const baseCards: DashboardCard[] = [
    {
      title: 'Attendance Records',
      description: 'View and manage attendance records',
      href: '/dashboard/attendance',
      color: 'bg-blue-500'
    }
  ]

  switch (role) {
    case 'ADMIN':
      return [
        ...baseCards,
        {
          title: 'Admin Dashboard',
          description: 'Access full system administration',
          href: '/dashboard/admin',
          color: 'bg-red-500'
        },
        {
          title: 'User Management',
          description: 'Manage users and their roles',
          href: '/dashboard/users',
          color: 'bg-green-500'
        },
        {
          title: 'Programme Management',
          description: 'Manage academic programmes',
          href: '/dashboard/programmes',
          color: 'bg-purple-500'
        },
        {
          title: 'Course Management',
          description: 'Manage courses and schedules',
          href: '/dashboard/courses',
          color: 'bg-yellow-500'
        },
        {
          title: 'Reports & Analytics',
          description: 'View attendance reports and analytics',
          href: '/dashboard/reports',
          color: 'bg-red-500'
        },
        {
          title: 'Import Data',
          description: 'Bulk import users and course data',
          href: '/dashboard/import',
          color: 'bg-indigo-500'
        }
      ]
    case 'COORDINATOR':
      return [
        {
          title: 'Coordinator Dashboard',
          description: 'Access your coordinator features',
          href: '/dashboard/coordinator',
          color: 'bg-blue-500'
        }
      ]
    case 'LECTURER':
      return [
        ...baseCards,
        {
          title: 'My Schedules',
          description: 'View your teaching schedules',
          href: '/dashboard/schedules',
          color: 'bg-green-500'
        },
        {
          title: 'Take Attendance',
          description: 'Record student attendance',
          href: '/dashboard/attendance/take',
          color: 'bg-purple-500'
        }
      ]
    case 'CLASS_REP':
      return [
        {
          title: 'Class Attendance',
          description: 'View your class attendance records',
          href: '/dashboard/attendance',
          color: 'bg-blue-500'
        },
        {
          title: 'Class Schedule',
          description: 'View your class schedule',
          href: '/dashboard/schedules',
          color: 'bg-green-500'
        }
      ]
    default:
      return baseCards
  }
}

interface DashboardStats {
  totalSessions: number
  attendanceRate: number
  activeCourses: number
  thisWeek: number
}

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<any>
  color: string
  badge?: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role === 'COORDINATOR') {
      router.replace('/dashboard/coordinator')
    }
  }, [session, router])

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.user) return
      
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [session])

  const getQuickActions = (role: UserRole): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        title: 'View Analytics',
        description: 'Comprehensive attendance analytics',
        href: '/dashboard/analytics',
        icon: ChartBarIcon,
        color: 'bg-blue-500 hover:bg-blue-600'
      },
      {
        title: 'Attendance Records',
        description: 'View and manage attendance',
        href: '/dashboard/attendance',
        icon: ClockIcon,
        color: 'bg-green-500 hover:bg-green-600'
      }
    ]

    switch (role) {
      case 'ADMIN':
        return [
          ...baseActions,
          {
            title: 'User Management',
            description: 'Manage system users',
            href: '/dashboard/users',
            icon: UserGroupIcon,
            color: 'bg-purple-500 hover:bg-purple-600'
          },
          {
            title: 'System Settings',
            description: 'Configure system settings',
            href: '/dashboard/settings',
            icon: Cog6ToothIcon,
            color: 'bg-gray-500 hover:bg-gray-600'
          },
          {
            title: 'Reports',
            description: 'Generate system reports',
            href: '/dashboard/reports',
            icon: DocumentChartBarIcon,
            color: 'bg-indigo-500 hover:bg-indigo-600'
          }
        ]
      case 'COORDINATOR':
        return [
          ...baseActions,
          {
            title: 'Course Management',
            description: 'Manage courses and schedules',
            href: '/dashboard/courses',
            icon: AcademicCapIcon,
            color: 'bg-orange-500 hover:bg-orange-600'
          },
          {
            title: 'Reports',
            description: 'Academic reports and insights',
            href: '/dashboard/reports',
            icon: DocumentChartBarIcon,
            color: 'bg-indigo-500 hover:bg-indigo-600'
          }
        ]
      case 'CLASS_REP':
        return [
          {
            title: 'Verify Attendance',
            description: 'Review and verify attendance records',
            href: '/dashboard/verify-attendance',
            icon: CheckCircleIcon,
            color: 'bg-green-500 hover:bg-green-600',
            badge: 'New'
          },
          {
            title: 'Verification Requests',
            description: 'Manage detailed verification requests',
            href: '/dashboard/verification-requests',
            icon: ExclamationTriangleIcon,
            color: 'bg-yellow-500 hover:bg-yellow-600'
          },
          {
            title: 'Class Analytics',
            description: 'View class attendance insights',
            href: '/dashboard/analytics',
            icon: ChartBarIcon,
            color: 'bg-blue-500 hover:bg-blue-600'
          }
        ]
      case 'LECTURER':
        return [
          {
            title: 'Take Attendance',
            description: 'Record class attendance',
            href: '/dashboard/take-attendance',
            icon: ClockIcon,
            color: 'bg-green-500 hover:bg-green-600'
          },
          {
            title: 'My Classes',
            description: 'View your class schedules',
            href: '/dashboard/classes',
            icon: AcademicCapIcon,
            color: 'bg-blue-500 hover:bg-blue-600'
          },
          {
            title: 'Analytics',
            description: 'View attendance analytics',
            href: '/dashboard/analytics',
            icon: ChartBarIcon,
            color: 'bg-purple-500 hover:bg-purple-600'
          }
        ]
      default:
        return baseActions
    }
  }

  if (!session?.user) {
    return null
  }

  // Redirect coordinators to their specific dashboard
  if (session.user.role === 'COORDINATOR') {
    return null
  }

  const cards = getDashboardCards(session.user.role)

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'System Administrator'
      case 'COORDINATOR':
        return 'Academic Coordinator'
      case 'LECTURER':
        return 'Lecturer'
      case 'CLASS_REP':
        return 'Class Representative'
      default:
        return role
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          {getRoleDisplayName(session.user.role)} Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block p-4 sm:p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${card.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}>
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {card.title}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Real-time Dashboard */}
      <div className="mt-8 sm:mt-12">
        <RealTimeDashboard />
      </div>

      {/* Quick Actions */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getQuickActions(session.user.role).map((action) => {
            const IconComponent = action.icon
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group relative bg-white p-4 rounded-lg shadow hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300"
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {action.title}
                      </h3>
                      {action.badge && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Legacy Quick Stats - keeping for backward compatibility */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">System Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {loading ? '--' : stats?.totalSessions?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {loading ? '--' : `${stats?.attendanceRate || 0}%`}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Attendance Rate</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {loading ? '--' : stats?.activeCourses?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Active Courses</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {loading ? '--' : stats?.thisWeek?.toLocaleString() || '0'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">This Week</div>
          </div>
        </div>
      </div>
    </div>
  )
}