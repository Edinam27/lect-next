import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { auditService } from '@/lib/audit'
import { headers } from 'next/headers'

// Routes that should be audited
const AUDITED_ROUTES = [
  '/api/attendance',
  '/api/verification-requests',
  '/api/users',
  '/api/courses',
  '/api/schedules',
  '/api/notifications',
  '/api/audit'
]

// Actions that should be audited based on HTTP methods and routes
const getAuditAction = (method: string, pathname: string): string | null => {
  const route = pathname.split('/').slice(0, 4).join('/') // Get base route
  
  switch (method) {
    case 'POST':
      if (pathname.includes('/attendance/take')) return 'ATTENDANCE_RECORDED'
      if (pathname.includes('/attendance/verify')) return 'ATTENDANCE_VERIFIED'
      if (pathname.includes('/verification-requests')) return 'VERIFICATION_REQUEST_CREATED'
      if (pathname.includes('/users')) return 'USER_CREATED'
      if (pathname.includes('/courses')) return 'COURSE_CREATED'
      if (pathname.includes('/schedules')) return 'SCHEDULE_CREATED'
      if (pathname.includes('/notifications/send')) return 'NOTIFICATION_SENT'
      return 'RESOURCE_CREATED'
    
    case 'PUT':
    case 'PATCH':
      if (pathname.includes('/verification-requests')) return 'VERIFICATION_REQUEST_UPDATED'
      if (pathname.includes('/users')) return 'USER_UPDATED'
      if (pathname.includes('/courses')) return 'COURSE_UPDATED'
      if (pathname.includes('/schedules')) return 'SCHEDULE_UPDATED'
      if (pathname.includes('/attendance')) return 'ATTENDANCE_UPDATED'
      return 'RESOURCE_UPDATED'
    
    case 'DELETE':
      if (pathname.includes('/users')) return 'USER_DELETED'
      if (pathname.includes('/courses')) return 'COURSE_DELETED'
      if (pathname.includes('/schedules')) return 'SCHEDULE_DELETED'
      if (pathname.includes('/attendance')) return 'ATTENDANCE_DELETED'
      return 'RESOURCE_DELETED'
    
    case 'GET':
      if (pathname.includes('/audit')) return 'AUDIT_LOG_ACCESSED'
      if (pathname.includes('/users') && pathname.includes('/export')) return 'USER_DATA_EXPORTED'
      if (pathname.includes('/attendance') && pathname.includes('/export')) return 'ATTENDANCE_DATA_EXPORTED'
      // Don't audit regular GET requests to avoid log spam
      return null
    
    default:
      return null
  }
}

// Get target type from route
const getTargetType = (pathname: string): string => {
  if (pathname.includes('/attendance')) return 'AttendanceRecord'
  if (pathname.includes('/verification-requests')) return 'VerificationRequest'
  if (pathname.includes('/users')) return 'User'
  if (pathname.includes('/courses')) return 'Course'
  if (pathname.includes('/schedules')) return 'CourseSchedule'
  if (pathname.includes('/notifications')) return 'Notification'
  if (pathname.includes('/audit')) return 'AuditLog'
  return 'Unknown'
}

// Calculate risk score based on action and context
const calculateRiskScore = (action: string, method: string, pathname: string, userRole: string): number => {
  let baseScore = 1
  
  // Higher risk for destructive operations
  if (method === 'DELETE') baseScore += 3
  if (action.includes('DELETED')) baseScore += 3
  
  // Higher risk for sensitive operations
  if (action.includes('VERIFIED') || action.includes('APPROVED')) baseScore += 2
  if (pathname.includes('/audit')) baseScore += 2
  if (pathname.includes('/export')) baseScore += 2
  
  // Higher risk for admin operations
  if (pathname.includes('/users') && method !== 'GET') baseScore += 2
  if (pathname.includes('/roles')) baseScore += 3
  
  // Adjust based on user role
  switch (userRole) {
    case 'ADMIN':
      // Admins have lower risk for most operations
      baseScore = Math.max(1, baseScore - 1)
      break
    case 'ACADEMIC_COORDINATOR':
      // Coordinators have slightly lower risk
      baseScore = Math.max(1, baseScore - 0.5)
      break
    case 'LECTURER':
      // Lecturers have normal risk
      break
    case 'CLASS_REP':
      // Class reps have higher risk for admin operations
      if (pathname.includes('/users') || pathname.includes('/courses')) {
        baseScore += 2
      }
      break
    default:
      baseScore += 1
  }
  
  return Math.min(10, Math.max(1, Math.round(baseScore)))
}

export async function auditMiddleware(request: NextRequest) {
  const { pathname, method } = request.nextUrl
  
  // Check if this route should be audited
  const shouldAudit = AUDITED_ROUTES.some(route => pathname.startsWith(route))
  if (!shouldAudit) {
    return NextResponse.next()
  }
  
  // Get audit action
  const action = getAuditAction(method, pathname)
  if (!action) {
    return NextResponse.next()
  }
  
  try {
    // Get session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.next()
    }
    
    // Get request details
    const headersList = headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     request.ip || 
                     'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'
    
    // Extract target ID from URL if possible
    const pathSegments = pathname.split('/')
    const targetId = pathSegments[pathSegments.length - 1] || 'unknown'
    
    // Calculate risk score
    const riskScore = calculateRiskScore(action, method, pathname, session.user.role)
    
    // Prepare metadata
    const metadata = {
      method,
      pathname,
      userRole: session.user.role,
      timestamp: new Date().toISOString(),
      requestHeaders: {
        'user-agent': userAgent,
        'x-forwarded-for': headersList.get('x-forwarded-for'),
        'referer': headersList.get('referer')
      }
    }
    
    // Create audit log (fire and forget to avoid blocking the request)
    auditService.createAuditLog({
      userId: session.user.id,
      action,
      targetType: getTargetType(pathname),
      targetId,
      metadata,
      ipAddress,
      userAgent,
      sessionId: session.user.id, // Use user ID as session identifier
      riskScore
    }).catch(error => {
      console.error('Failed to create audit log:', error)
    })
    
  } catch (error) {
    console.error('Audit middleware error:', error)
  }
  
  return NextResponse.next()
}

// Export a wrapper function for API routes
export function withAudit<T extends any[]>(
  handler: (...args: T) => Promise<Response | NextResponse>
) {
  return async (...args: T): Promise<Response | NextResponse> => {
    const request = args[0] as NextRequest
    
    // Run audit middleware
    await auditMiddleware(request)
    
    // Execute the original handler
    return handler(...args)
  }
}