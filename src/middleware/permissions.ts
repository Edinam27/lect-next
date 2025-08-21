import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { Permission, hasPermission, checkResourcePermission } from '@/lib/permissions'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'

// Permission middleware configuration
interface PermissionConfig {
  permissions?: Permission[]
  requireAll?: boolean // If true, user must have ALL permissions. If false, user needs ANY permission
  resourceType?: string
  action?: string
  checkOwnership?: boolean
  checkClassMembership?: boolean
  customCheck?: (session: any, request: NextRequest) => Promise<boolean>
}

// Create permission middleware
export function createPermissionMiddleware(config: PermissionConfig) {
  return async function permissionMiddleware(request: NextRequest) {
    try {
      // Get session
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const userRole = session.user.role as UserRole
      const userId = session.user.id

      // If custom check is provided, use it
      if (config.customCheck) {
        const hasAccess = await config.customCheck(session, request)
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }
        return NextResponse.next()
      }

      // Check basic permissions
      if (config.permissions && config.permissions.length > 0) {
        const hasRequiredPermissions = config.requireAll
          ? config.permissions.every(permission => hasPermission(userRole, permission))
          : config.permissions.some(permission => hasPermission(userRole, permission))

        if (!hasRequiredPermissions) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }

      // Check resource-based permissions with ownership/class membership
      if (config.resourceType && config.action) {
        let isOwner = false
        let isClassMember = false

        // Extract resource ID from URL if needed for ownership checks
        if (config.checkOwnership || config.checkClassMembership) {
          const resourceId = extractResourceId(request.url)
          
          if (config.checkOwnership) {
            isOwner = await checkResourceOwnership(
              config.resourceType,
              resourceId,
              userId,
              userRole
            )
          }

          if (config.checkClassMembership) {
            isClassMember = await checkClassMembership(
              config.resourceType,
              resourceId,
              userId,
              userRole
            )
          }
        }

        const hasResourcePermission = checkResourcePermission(
          userRole,
          config.resourceType,
          config.action,
          { isOwner, isClassMember }
        )

        if (!hasResourcePermission) {
          return NextResponse.json(
            { error: 'Access denied for this resource' },
            { status: 403 }
          )
        }
      }

      return NextResponse.next()
    } catch (error) {
      console.error('Permission middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Helper function to extract resource ID from URL
function extractResourceId(url: string): string | null {
  const urlParts = url.split('/')
  // Look for UUID or numeric ID patterns
  for (let i = urlParts.length - 1; i >= 0; i--) {
    const part = urlParts[i]
    // Check for UUID pattern or numeric ID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part) ||
        /^\d+$/.test(part)) {
      return part
    }
  }
  return null
}

// Check if user owns the resource
async function checkResourceOwnership(
  resourceType: string,
  resourceId: string | null,
  userId: string,
  userRole: UserRole
): Promise<boolean> {
  if (!resourceId) return false

  try {
    switch (resourceType) {
      case 'schedule':
        if (userRole === UserRole.LECTURER) {
          const schedule = await prisma.courseSchedule.findUnique({
            where: { id: parseInt(resourceId) },
            select: { lecturerId: true }
          })
          return schedule?.lecturerId === userId
        }
        break

      case 'attendance':
        if (userRole === UserRole.LECTURER) {
          const attendance = await prisma.attendanceRecord.findUnique({
            where: { id: resourceId },
            include: {
              courseSchedule: {
                select: { lecturerId: true }
              }
            }
          })
          return attendance?.courseSchedule?.lecturerId === userId
        }
        break

      case 'user':
        return resourceId === userId

      case 'notification':
        const notification = await prisma.notification.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        })
        return notification?.userId === userId

      default:
        return false
    }
  } catch (error) {
    console.error('Error checking resource ownership:', error)
    return false
  }

  return false
}

// Check if user is a member of the class related to the resource
async function checkClassMembership(
  resourceType: string,
  resourceId: string | null,
  userId: string,
  userRole: UserRole
): Promise<boolean> {
  if (!resourceId || userRole !== UserRole.CLASS_REP) return false

  try {
    // Get user's class groups
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { classGroupsAsRep: true }
    })

    if (!user?.classGroupsAsRep || user.classGroupsAsRep.length === 0) {
      return false
    }

    const classGroupIds = user.classGroupsAsRep.map(group => group.id)

    switch (resourceType) {
      case 'attendance':
        const attendance = await prisma.attendanceRecord.findUnique({
          where: { id: resourceId },
          include: {
            courseSchedule: {
              select: { classGroupId: true }
            }
          }
        })
        return attendance?.courseSchedule?.classGroupId
          ? classGroupIds.includes(attendance.courseSchedule.classGroupId)
          : false

      case 'schedule':
        const schedule = await prisma.courseSchedule.findUnique({
          where: { id: parseInt(resourceId) },
          select: { classGroupId: true }
        })
        return schedule?.classGroupId
          ? classGroupIds.includes(schedule.classGroupId)
          : false

      default:
        return false
    }
  } catch (error) {
    console.error('Error checking class membership:', error)
    return false
  }

  return false
}

// Predefined middleware configurations for common use cases
export const middlewareConfigs = {
  // Admin only access
  adminOnly: {
    permissions: [Permission.SYSTEM_SETTINGS],
    requireAll: false
  },

  // Admin or Coordinator access
  adminOrCoordinator: {
    customCheck: async (session: any) => {
      return ['ADMIN', 'COORDINATOR'].includes(session.user.role)
    }
  },

  // User management access
  userManagement: {
    permissions: [Permission.USER_READ, Permission.USER_LIST],
    requireAll: false
  },

  // Programme management access
  programmeManagement: {
    permissions: [Permission.PROGRAMME_READ, Permission.PROGRAMME_LIST],
    requireAll: false
  },

  // Course management access
  courseManagement: {
    permissions: [Permission.COURSE_READ, Permission.COURSE_LIST],
    requireAll: false
  },

  // Schedule access with ownership check
  scheduleAccess: {
    resourceType: 'schedule',
    action: 'read',
    checkOwnership: true
  },

  // Attendance access with ownership and class membership check
  attendanceAccess: {
    resourceType: 'attendance',
    action: 'read',
    checkOwnership: true,
    checkClassMembership: true
  },

  // Analytics access
  analyticsAccess: {
    permissions: [Permission.ANALYTICS_READ],
    requireAll: false
  },

  // Notification analytics (admin/coordinator only)
  notificationAnalytics: {
    permissions: [Permission.NOTIFICATION_ANALYTICS],
    requireAll: false
  },

  // Import/Export access
  importExportAccess: {
    permissions: [Permission.DATA_IMPORT, Permission.DATA_EXPORT],
    requireAll: false
  },

  // Audit access (admin only)
  auditAccess: {
    permissions: [Permission.AUDIT_READ],
    requireAll: false
  }
}

// Helper function to create middleware with predefined config
export function createPredefinedMiddleware(configName: keyof typeof middlewareConfigs) {
  return createPermissionMiddleware(middlewareConfigs[configName])
}

// Export commonly used middleware instances
export const adminOnlyMiddleware = createPredefinedMiddleware('adminOnly')
export const adminOrCoordinatorMiddleware = createPredefinedMiddleware('adminOrCoordinator')
export const userManagementMiddleware = createPredefinedMiddleware('userManagement')
export const programmeManagementMiddleware = createPredefinedMiddleware('programmeManagement')
export const courseManagementMiddleware = createPredefinedMiddleware('courseManagement')
export const scheduleAccessMiddleware = createPredefinedMiddleware('scheduleAccess')
export const attendanceAccessMiddleware = createPredefinedMiddleware('attendanceAccess')
export const analyticsAccessMiddleware = createPredefinedMiddleware('analyticsAccess')
export const notificationAnalyticsMiddleware = createPredefinedMiddleware('notificationAnalytics')
export const importExportAccessMiddleware = createPredefinedMiddleware('importExportAccess')
export const auditAccessMiddleware = createPredefinedMiddleware('auditAccess')