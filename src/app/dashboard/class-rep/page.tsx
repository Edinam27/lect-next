'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

interface DashboardCard {
  title: string
  description: string
  href: string
  color: string
  icon: string
}

const classRepCards: DashboardCard[] = [
  {
    title: 'Verify Lecturer Attendance',
    description: 'Verify lecturer attendance for your class',
    href: '/dashboard/verify-attendance',
    color: 'bg-red-500',
    icon: 'shield-check'
  },
  {
    title: 'Class Attendance',
    description: 'View attendance records for your class',
    href: '/dashboard/attendance',
    color: 'bg-blue-500',
    icon: 'clipboard-check'
  },
  {
    title: 'Class Schedule',
    description: 'View your class timetable and schedules',
    href: '/dashboard/schedules',
    color: 'bg-green-500',
    icon: 'calendar'
  },
  {
    title: 'Class Information',
    description: 'View your class and programme details',
    href: '/dashboard/class-info',
    color: 'bg-purple-500',
    icon: 'information-circle'
  }
]

const getIcon = (iconName: string) => {
  const icons: { [key: string]: JSX.Element } = {
    'clipboard-check': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
    calendar: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
    'information-circle': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    )
  }
  return icons[iconName] || icons['clipboard-check']
}

export default function ClassRepDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.replace('/auth/signin')
      return
    }
    
    if (session.user.role !== 'CLASS_REP') {
      router.replace('/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'CLASS_REP') {
    return null
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Class Representative Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {classRepCards.map((card) => (
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

      {/* Class Overview */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Class Overview</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Class Information</h3>
              <p className="text-sm sm:text-base text-gray-600">Class details will be displayed here</p>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Programme Information</h3>
              <p className="text-sm sm:text-base text-gray-600">Programme details will be displayed here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Attendance Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-green-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">Sessions Attended</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">Attendance Rate</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">This Week</div>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Recent Attendance</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-500 text-center py-6 sm:py-8">
            Recent attendance records will be displayed here
          </p>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Upcoming Sessions</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-500 text-center py-6 sm:py-8">
            Upcoming class sessions will be displayed here
          </p>
        </div>
      </div>
    </div>
  )
}