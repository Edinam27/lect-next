'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  ClockIcon, 
  DocumentChartBarIcon,
  ChartBarIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardCard {
  title: string
  description: string
  href: string
  color: string
  icon: string
}

const coordinatorCards: DashboardCard[] = [
  {
    title: 'Lecturers',
    description: 'Manage lecturers in your programmes',
    href: '/dashboard/lecturers',
    color: 'bg-blue-500',
    icon: 'users'
  },
  {
    title: 'Course Management',
    description: 'Manage courses and schedules',
    href: '/dashboard/courses',
    color: 'bg-green-500',
    icon: 'academic'
  },
  {
    title: 'Lecturer Attendance',
    description: 'Monitor lecturer attendance',
    href: '/dashboard/attendance',
    color: 'bg-purple-500',
    icon: 'clock'
  },
  {
    title: 'Reports',
    description: 'Generate attendance reports',
    href: '/dashboard/reports',
    color: 'bg-yellow-500',
    icon: 'chart'
  }
]

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'users':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
        />
      )
    case 'academic':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
        />
      )
    case 'clock':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      )
    case 'chart':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      )
    default:
      return null
  }
}

interface DashboardStats {
  totalSessions: number
  attendanceRate: number
  activeCourses: number
  thisWeek: number
}

export default function CoordinatorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.replace('/auth/signin')
      return
    }
    
    if (session.user.role !== 'COORDINATOR') {
      router.replace('/dashboard')
      return
    }
  }, [session, status, router])

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

    if (session?.user?.role === 'COORDINATOR') {
      fetchStats()
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'COORDINATOR') {
    return null
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Academic Coordinator Dashboard
        </p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.totalSessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All recorded sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `${stats?.attendanceRate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <AcademicCapIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.activeCourses || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.thisWeek || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {coordinatorCards.map((card) => (
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
      </div>

      {/* Recent Activity */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-500 text-center py-6 sm:py-8">
            Recent programme activity will be displayed here
          </p>
        </div>
      </div>
    </div>
  )
}