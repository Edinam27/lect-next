import { UserRole } from '@prisma/client'

// Define all possible permissions in the system
export enum Permission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',
  USER_IMPORT = 'user:import',
  
  // Programme management
  PROGRAMME_CREATE = 'programme:create',
  PROGRAMME_READ = 'programme:read',
  PROGRAMME_UPDATE = 'programme:update',
  PROGRAMME_DELETE = 'programme:delete',
  PROGRAMME_LIST = 'programme:list',
  
  // Course management
  COURSE_CREATE = 'course:create',
  COURSE_READ = 'course:read',
  COURSE_UPDATE = 'course:update',
  COURSE_DELETE = 'course:delete',
  COURSE_LIST = 'course:list',
  
  // Class group management
  CLASS_GROUP_CREATE = 'class_group:create',
  CLASS_GROUP_READ = 'class_group:read',
  CLASS_GROUP_UPDATE = 'class_group:update',
  CLASS_GROUP_DELETE = 'class_group:delete',
  CLASS_GROUP_LIST = 'class_group:list',
  
  // Schedule management
  SCHEDULE_CREATE = 'schedule:create',
  SCHEDULE_READ = 'schedule:read',
  SCHEDULE_UPDATE = 'schedule:update',
  SCHEDULE_DELETE = 'schedule:delete',
  SCHEDULE_LIST = 'schedule:list',
  SCHEDULE_OWN_READ = 'schedule:own:read', // Lecturers can read their own schedules
  
  // Attendance management
  ATTENDANCE_CREATE = 'attendance:create',
  ATTENDANCE_READ = 'attendance:read',
  ATTENDANCE_UPDATE = 'attendance:update',
  ATTENDANCE_DELETE = 'attendance:delete',
  ATTENDANCE_LIST = 'attendance:list',
  ATTENDANCE_VERIFY = 'attendance:verify',
  ATTENDANCE_OWN_READ = 'attendance:own:read', // Lecturers can read their own attendance
  ATTENDANCE_CLASS_READ = 'attendance:class:read', // Class reps can read their class attendance
  
  // Lecturer management
  LECTURER_CREATE = 'lecturer:create',
  LECTURER_READ = 'lecturer:read',
  LECTURER_UPDATE = 'lecturer:update',
  LECTURER_DELETE = 'lecturer:delete',
  LECTURER_LIST = 'lecturer:list',
  
  // Building and classroom management
  BUILDING_CREATE = 'building:create',
  BUILDING_READ = 'building:read',
  BUILDING_UPDATE = 'building:update',
  BUILDING_DELETE = 'building:delete',
  BUILDING_LIST = 'building:list',
  
  CLASSROOM_CREATE = 'classroom:create',
  CLASSROOM_READ = 'classroom:read',
  CLASSROOM_UPDATE = 'classroom:update',
  CLASSROOM_DELETE = 'classroom:delete',
  CLASSROOM_LIST = 'classroom:list',
  
  // Analytics and reporting
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_ADVANCED = 'analytics:advanced',
  REPORTS_GENERATE = 'reports:generate',
  REPORTS_SCHEDULE = 'reports:schedule',
  
  // Notification management
  NOTIFICATION_CREATE = 'notification:create',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_UPDATE = 'notification:update',
  NOTIFICATION_DELETE = 'notification:delete',
  NOTIFICATION_ANALYTICS = 'notification:analytics',
  
  // Audit and system management
  AUDIT_READ = 'audit:read',
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_RESTORE = 'system:restore',
  
  // Import/Export
  DATA_IMPORT = 'data:import',
  DATA_EXPORT = 'data:export',
}

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full system access
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_LIST,
    Permission.USER_IMPORT,
    
    Permission.PROGRAMME_CREATE,
    Permission.PROGRAMME_READ,
    Permission.PROGRAMME_UPDATE,
    Permission.PROGRAMME_DELETE,
    Permission.PROGRAMME_LIST,
    
    Permission.COURSE_CREATE,
    Permission.COURSE_READ,
    Permission.COURSE_UPDATE,
    Permission.COURSE_DELETE,
    Permission.COURSE_LIST,
    
    Permission.CLASS_GROUP_CREATE,
    Permission.CLASS_GROUP_READ,
    Permission.CLASS_GROUP_UPDATE,
    Permission.CLASS_GROUP_DELETE,
    Permission.CLASS_GROUP_LIST,
    
    Permission.SCHEDULE_CREATE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_UPDATE,
    Permission.SCHEDULE_DELETE,
    Permission.SCHEDULE_LIST,
    
    Permission.ATTENDANCE_CREATE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_UPDATE,
    Permission.ATTENDANCE_DELETE,
    Permission.ATTENDANCE_LIST,
    Permission.ATTENDANCE_VERIFY,
    
    Permission.LECTURER_CREATE,
    Permission.LECTURER_READ,
    Permission.LECTURER_UPDATE,
    Permission.LECTURER_DELETE,
    Permission.LECTURER_LIST,
    
    Permission.BUILDING_CREATE,
    Permission.BUILDING_READ,
    Permission.BUILDING_UPDATE,
    Permission.BUILDING_DELETE,
    Permission.BUILDING_LIST,
    
    Permission.CLASSROOM_CREATE,
    Permission.CLASSROOM_READ,
    Permission.CLASSROOM_UPDATE,
    Permission.CLASSROOM_DELETE,
    Permission.CLASSROOM_LIST,
    
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_ADVANCED,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_SCHEDULE,
    
    Permission.NOTIFICATION_CREATE,
    Permission.NOTIFICATION_READ,
    Permission.NOTIFICATION_UPDATE,
    Permission.NOTIFICATION_DELETE,
    Permission.NOTIFICATION_ANALYTICS,
    
    Permission.AUDIT_READ,
    Permission.SYSTEM_SETTINGS,
    Permission.SYSTEM_BACKUP,
    Permission.SYSTEM_RESTORE,
    
    Permission.DATA_IMPORT,
    Permission.DATA_EXPORT,
  ],
  
  [UserRole.COORDINATOR]: [
    // Academic coordination access
    Permission.USER_READ,
    Permission.USER_LIST,
    
    Permission.PROGRAMME_CREATE,
    Permission.PROGRAMME_READ,
    Permission.PROGRAMME_UPDATE,
    Permission.PROGRAMME_LIST,
    
    Permission.COURSE_CREATE,
    Permission.COURSE_READ,
    Permission.COURSE_UPDATE,
    Permission.COURSE_LIST,
    
    Permission.CLASS_GROUP_CREATE,
    Permission.CLASS_GROUP_READ,
    Permission.CLASS_GROUP_UPDATE,
    Permission.CLASS_GROUP_LIST,
    
    Permission.SCHEDULE_CREATE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_UPDATE,
    Permission.SCHEDULE_LIST,
    
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_LIST,
    Permission.ATTENDANCE_VERIFY,
    
    Permission.LECTURER_READ,
    Permission.LECTURER_LIST,
    
    Permission.BUILDING_CREATE,
    Permission.BUILDING_READ,
    Permission.BUILDING_UPDATE,
    Permission.BUILDING_LIST,
    
    Permission.CLASSROOM_CREATE,
    Permission.CLASSROOM_READ,
    Permission.CLASSROOM_UPDATE,
    Permission.CLASSROOM_LIST,
    
    Permission.ANALYTICS_READ,
    Permission.REPORTS_GENERATE,
    
    Permission.NOTIFICATION_CREATE,
    Permission.NOTIFICATION_READ,
    Permission.NOTIFICATION_ANALYTICS,
    
    Permission.DATA_IMPORT,
    Permission.DATA_EXPORT,
  ],
  
  [UserRole.LECTURER]: [
    // Lecturer-specific access
    Permission.SCHEDULE_OWN_READ,
    Permission.ATTENDANCE_CREATE,
    Permission.ATTENDANCE_OWN_READ,
    Permission.ATTENDANCE_UPDATE, // Can update their own attendance records
    
    Permission.CLASS_GROUP_READ, // Can view class groups they teach
    Permission.COURSE_READ, // Can view courses they teach
    
    Permission.NOTIFICATION_READ,
    
    Permission.ANALYTICS_READ, // Limited analytics for their classes
  ],
  
  [UserRole.CLASS_REP]: [
    // Class representative access
    Permission.ATTENDANCE_CLASS_READ,
    Permission.ATTENDANCE_VERIFY,
    
    Permission.NOTIFICATION_READ,
    
    Permission.ANALYTICS_READ, // Limited analytics for their class
  ],
}

// Helper functions for permission checking
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole]
  return rolePermissions.includes(permission)
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

// Resource-based permission checking
export function canAccessResource(
  userRole: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'list'
): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(userRole, permission)
}

// Special permission checks for ownership-based access
export function canAccessOwnResource(
  userRole: UserRole,
  resource: string,
  action: 'read' | 'update' | 'delete'
): boolean {
  const ownPermission = `${resource}:own:${action}` as Permission
  const fullPermission = `${resource}:${action}` as Permission
  
  return hasPermission(userRole, ownPermission) || hasPermission(userRole, fullPermission)
}

// Class-based permission checks for class representatives
export function canAccessClassResource(
  userRole: UserRole,
  resource: string,
  action: 'read' | 'update'
): boolean {
  const classPermission = `${resource}:class:${action}` as Permission
  const fullPermission = `${resource}:${action}` as Permission
  
  return hasPermission(userRole, classPermission) || hasPermission(userRole, fullPermission)
}

// Get all permissions for a role
export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] || []
}

// Check if user can perform action on specific resource type
export function checkResourcePermission(
  userRole: UserRole,
  resourceType: string,
  action: string,
  options?: {
    isOwner?: boolean
    isClassMember?: boolean
  }
): boolean {
  const { isOwner = false, isClassMember = false } = options || {}
  
  // Check full permission first
  const fullPermission = `${resourceType}:${action}` as Permission
  if (hasPermission(userRole, fullPermission)) {
    return true
  }
  
  // Check ownership-based permission
  if (isOwner) {
    const ownPermission = `${resourceType}:own:${action}` as Permission
    if (hasPermission(userRole, ownPermission)) {
      return true
    }
  }
  
  // Check class-based permission
  if (isClassMember) {
    const classPermission = `${resourceType}:class:${action}` as Permission
    if (hasPermission(userRole, classPermission)) {
      return true
    }
  }
  
  return false
}