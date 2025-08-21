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

const lecturerCards: DashboardCard[] = [
  {
    title: 'Take Attendance',
    description: 'Record attendance for your current sessions',
    href: '/dashboard/attendance/take',
    color: 'bg-green-500',
    icon: 'clipboard-check'
  },
  {
    title: 'My Schedules',
    description: 'View your teaching schedules and timetable',
    href: '/dashboard/schedules',
    color: 'bg-blue-500',
    icon: 'calendar'
  },
  {
    title: 'Attendance Records',
    description: 'View attendance records for your courses',
    href: '/dashboard/attendance',
    color: 'bg-purple-500',
    icon: 'document-text'
  },
  {
    title: 'My Courses',
    description: 'View courses you are teaching',
    href: '/dashboard/courses',
    color: 'bg-yellow-500',
    icon: 'book-open'
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
    'document-text': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    'book-open': (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    )
  }
  return icons[iconName] || icons['clipboard-check']
}

export default function LecturerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.replace('/auth/signin')
      return
    }
    
    if (session.user.role !== 'LECTURER') {
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

  if (!session || session.user.role !== 'LECTURER') {
    return null
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Lecturer Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {lecturerCards.map((card) => (
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

      {/* Today's Schedule */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Today's Schedule</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-500 text-center py-6 sm:py-8">
            Your today's schedule will be displayed here
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Quick Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">Sessions This Week</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-green-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">Attendance Rate</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">Active Courses</div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">--</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Students</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/dashboard/attendance/take"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Take Attendance Now
            </Link>
            <Link
              href="/dashboard/schedules"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View Schedule
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}