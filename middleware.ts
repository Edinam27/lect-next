import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { auditMiddleware } from './src/middleware/audit'
import {
  createPermissionMiddleware,
  adminOnlyMiddleware,
  adminOrCoordinatorMiddleware,
  userManagementMiddleware,
  programmeManagementMiddleware,
  courseManagementMiddleware,
  scheduleAccessMiddleware,
  attendanceAccessMiddleware,
  analyticsAccessMiddleware,
  notificationAnalyticsMiddleware,
  importExportAccessMiddleware,
  auditAccessMiddleware
} from './src/middleware/permissions'
import { Permission } from './src/lib/permissions'

// Define route patterns and their required permissions
const ROUTE_PERMISSIONS: Array<{
  pattern: RegExp
  middleware: (request: NextRequest) => Promise<NextResponse>
  methods?: string[]
}> = [
  // Admin-only routes
  {
    pattern: /^\/api\/users\/[^/]+\/(delete|update)$/,
    middleware: adminOnlyMiddleware,
    methods: ['DELETE', 'PUT', 'PATCH']
  },
  {
    pattern: /^\/api\/system\//,
    middleware: adminOnlyMiddleware
  },
  {
    pattern: /^\/api\/audit\//,
    middleware: auditAccessMiddleware
  },

  // Admin or Coordinator routes
  {
    pattern: /^\/api\/users$/,
    middleware: userManagementMiddleware,
    methods: ['GET']
  },
  {
    pattern: /^\/api\/users\/[^/]+$/,
    middleware: userManagementMiddleware,
    methods: ['GET']
  },
  {
    pattern: /^\/api\/programmes/,
    middleware: programmeManagementMiddleware
  },
  {
    pattern: /^\/api\/courses/,
    middleware: courseManagementMiddleware
  },
  {
    pattern: /^\/api\/class-groups/,
    middleware: adminOrCoordinatorMiddleware
  },
  {
    pattern: /^\/api\/lecturers/,
    middleware: adminOrCoordinatorMiddleware
  },
  {
    pattern: /^\/api\/buildings/,
    middleware: adminOrCoordinatorMiddleware
  },
  {
    pattern: /^\/api\/classrooms/,
    middleware: adminOrCoordinatorMiddleware
  },

  // Schedule routes with ownership checks
  {
    pattern: /^\/api\/schedules\/[^/]+/,
    middleware: scheduleAccessMiddleware
  },

  // Attendance routes with ownership and class membership checks
  {
    pattern: /^\/api\/attendance/,
    middleware: attendanceAccessMiddleware
  },
  {
    pattern: /^\/api\/schedules\/[^/]+\/attendance/,
    middleware: attendanceAccessMiddleware
  },

  // Analytics routes
  {
    pattern: /^\/api\/analytics/,
    middleware: analyticsAccessMiddleware
  },
  {
    pattern: /^\/api\/dashboard\/stats/,
    middleware: analyticsAccessMiddleware
  },

  // Notification analytics (admin/coordinator only)
  {
    pattern: /^\/api\/notifications\/analytics/,
    middleware: notificationAnalyticsMiddleware
  },

  // Import/Export routes
  {
    pattern: /^\/api\/import/,
    middleware: importExportAccessMiddleware
  },
  {
    pattern: /^\/api\/export/,
    middleware: importExportAccessMiddleware
  },

  // Attendance verification (class reps and coordinators)
  {
    pattern: /^\/api\/attendance\/verify/,
    middleware: createPermissionMiddleware({
      permissions: [Permission.ATTENDANCE_VERIFY],
      requireAll: false
    })
  },

  // Recent attendance (lecturers, coordinators, admins)
  {
    pattern: /^\/api\/attendance\/recent/,
    middleware: createPermissionMiddleware({
      customCheck: async (session) => {
        return ['ADMIN', 'COORDINATOR', 'LECTURER'].includes(session.user.role)
      }
    })
  },

  // Notification routes (authenticated users)
  {
    pattern: /^\/api\/notifications(?!\/analytics)/,
    middleware: createPermissionMiddleware({
      permissions: [Permission.NOTIFICATION_READ],
      requireAll: false
    })
  }
]

// Routes that don't require permission checks
const PUBLIC_ROUTES = [
  /^\/api\/auth\//,
  /^\/api\/health$/,
  /^\/api\/status$/,
]

// Routes that only require authentication (no specific permissions)
const AUTH_ONLY_ROUTES = [
  /^\/api\/profile/,
  /^\/api\/notifications\/mark-read/,
]

export async function middleware(request: NextRequest) {
  const { pathname, method } = request.nextUrl

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.some(pattern => pattern.test(pathname))) {
    return NextResponse.next()
  }

  // Check if user is authenticated for auth-only routes
  if (AUTH_ONLY_ROUTES.some(pattern => pattern.test(pathname))) {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Apply permission middleware for protected routes
  for (const route of ROUTE_PERMISSIONS) {
    if (route.pattern.test(pathname)) {
      // Check if method is allowed (if specified)
      if (route.methods && !route.methods.includes(method)) {
        continue
      }

      // Apply the middleware
      const response = await route.middleware(request)
      
      // If middleware returns a response (error), return it
      if (response.status !== 200) {
        return response
      }
      
      // If middleware passes, continue to audit middleware
      break
    }
  }

  // Apply audit middleware for all API routes
  if (pathname.startsWith('/api/')) {
    return auditMiddleware(request)
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}