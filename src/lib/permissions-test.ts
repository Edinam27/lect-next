import { Permission, ROLE_PERMISSIONS, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions'
import { UserRole } from '@prisma/client'

/**
 * Test suite for the role-based permissions system
 * This file can be used to verify that permissions are correctly assigned
 */

export function testPermissions() {
  console.log('🔐 Testing Role-Based Permissions System')
  console.log('=' .repeat(50))

  // Test ADMIN permissions
  console.log('\n👑 ADMIN Role Permissions:')
  const adminPermissions = ROLE_PERMISSIONS[UserRole.ADMIN]
  console.log(`Total permissions: ${adminPermissions.length}`)
  
  // Verify ADMIN has all critical permissions
  const criticalPermissions = [
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.PROGRAMME_CREATE,
    Permission.COURSE_CREATE,
    Permission.ANALYTICS_ADMIN,
    Permission.AUDIT_READ
  ]
  
  criticalPermissions.forEach(permission => {
    const hasAccess = hasPermission(UserRole.ADMIN, permission)
    console.log(`  ${permission}: ${hasAccess ? '✅' : '❌'}`)
  })

  // Test COORDINATOR permissions
  console.log('\n🎯 COORDINATOR Role Permissions:')
  const coordinatorPermissions = ROLE_PERMISSIONS[UserRole.COORDINATOR]
  console.log(`Total permissions: ${coordinatorPermissions.length}`)
  
  const coordinatorTestPermissions = [
    Permission.USER_READ,
    Permission.PROGRAMME_READ,
    Permission.PROGRAMME_UPDATE,
    Permission.COURSE_CREATE,
    Permission.ATTENDANCE_ALL_READ,
    Permission.ANALYTICS_COORDINATOR
  ]
  
  coordinatorTestPermissions.forEach(permission => {
    const hasAccess = hasPermission(UserRole.COORDINATOR, permission)
    console.log(`  ${permission}: ${hasAccess ? '✅' : '❌'}`)
  })
  
  // Verify COORDINATOR cannot delete users
  const canDeleteUsers = hasPermission(UserRole.COORDINATOR, Permission.USER_DELETE)
  console.log(`  USER_DELETE (should be false): ${canDeleteUsers ? '❌' : '✅'}`)

  // Test LECTURER permissions
  console.log('\n👨‍🏫 LECTURER Role Permissions:')
  const lecturerPermissions = ROLE_PERMISSIONS[UserRole.LECTURER]
  console.log(`Total permissions: ${lecturerPermissions.length}`)
  
  const lecturerTestPermissions = [
    Permission.ATTENDANCE_OWN_READ,
    Permission.ATTENDANCE_CREATE,
    Permission.SCHEDULE_OWN_READ,
    Permission.ANALYTICS_OWN
  ]
  
  lecturerTestPermissions.forEach(permission => {
    const hasAccess = hasPermission(UserRole.LECTURER, permission)
    console.log(`  ${permission}: ${hasAccess ? '✅' : '❌'}`)
  })
  
  // Verify LECTURER cannot access all attendance
  const canReadAllAttendance = hasPermission(UserRole.LECTURER, Permission.ATTENDANCE_ALL_READ)
  console.log(`  ATTENDANCE_ALL_READ (should be false): ${canReadAllAttendance ? '❌' : '✅'}`)

  // Test CLASS_REP permissions
  console.log('\n🎓 CLASS_REP Role Permissions:')
  const classRepPermissions = ROLE_PERMISSIONS[UserRole.CLASS_REP]
  console.log(`Total permissions: ${classRepPermissions.length}`)
  
  const classRepTestPermissions = [
    Permission.ATTENDANCE_CLASS_READ,
    Permission.ATTENDANCE_VERIFY,
    Permission.NOTIFICATION_READ
  ]
  
  classRepTestPermissions.forEach(permission => {
    const hasAccess = hasPermission(UserRole.CLASS_REP, permission)
    console.log(`  ${permission}: ${hasAccess ? '✅' : '❌'}`)
  })
  
  // Verify CLASS_REP cannot create courses
  const canCreateCourses = hasPermission(UserRole.CLASS_REP, Permission.COURSE_CREATE)
  console.log(`  COURSE_CREATE (should be false): ${canCreateCourses ? '❌' : '✅'}`)

  // Test permission helper functions
  console.log('\n🔧 Testing Permission Helper Functions:')
  
  // Test hasAnyPermission
  const lecturerCanReadOrCreate = hasAnyPermission(UserRole.LECTURER, [
    Permission.ATTENDANCE_ALL_READ,
    Permission.ATTENDANCE_OWN_READ
  ])
  console.log(`  Lecturer can read own OR all attendance: ${lecturerCanReadOrCreate ? '✅' : '❌'}`)
  
  // Test hasAllPermissions
  const adminHasAllCritical = hasAllPermissions(UserRole.ADMIN, [
    Permission.USER_CREATE,
    Permission.USER_DELETE,
    Permission.AUDIT_READ
  ])
  console.log(`  Admin has all critical permissions: ${adminHasAllCritical ? '✅' : '❌'}`)
  
  const classRepHasAllAdmin = hasAllPermissions(UserRole.CLASS_REP, [
    Permission.USER_CREATE,
    Permission.USER_DELETE
  ])
  console.log(`  Class rep has admin permissions (should be false): ${classRepHasAllAdmin ? '❌' : '✅'}`)

  // Test permission hierarchy
  console.log('\n📊 Permission Hierarchy Analysis:')
  const roles = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LECTURER, UserRole.CLASS_REP]
  
  roles.forEach(role => {
    const permissions = ROLE_PERMISSIONS[role]
    console.log(`  ${role}: ${permissions.length} permissions`)
  })
  
  // Verify hierarchy (ADMIN should have most permissions)
  const adminCount = ROLE_PERMISSIONS[UserRole.ADMIN].length
  const coordinatorCount = ROLE_PERMISSIONS[UserRole.COORDINATOR].length
  const lecturerCount = ROLE_PERMISSIONS[UserRole.LECTURER].length
  const classRepCount = ROLE_PERMISSIONS[UserRole.CLASS_REP].length
  
  const hierarchyCorrect = adminCount >= coordinatorCount && 
                          coordinatorCount >= lecturerCount && 
                          lecturerCount >= classRepCount
  
  console.log(`  Permission hierarchy is correct: ${hierarchyCorrect ? '✅' : '❌'}`)

  console.log('\n' + '=' .repeat(50))
  console.log('🎉 Permission system test completed!')
  
  return {
    adminPermissions: adminPermissions.length,
    coordinatorPermissions: coordinatorPermissions.length,
    lecturerPermissions: lecturerPermissions.length,
    classRepPermissions: classRepPermissions.length,
    hierarchyCorrect
  }
}

/**
 * Test specific permission scenarios
 */
export function testPermissionScenarios() {
  console.log('\n🎭 Testing Permission Scenarios:')
  
  const scenarios = [
    {
      name: 'Admin accessing user management',
      role: UserRole.ADMIN,
      permission: Permission.USER_DELETE,
      expected: true
    },
    {
      name: 'Coordinator creating programmes',
      role: UserRole.COORDINATOR,
      permission: Permission.PROGRAMME_CREATE,
      expected: true
    },
    {
      name: 'Lecturer accessing all attendance (should fail)',
      role: UserRole.LECTURER,
      permission: Permission.ATTENDANCE_ALL_READ,
      expected: false
    },
    {
      name: 'Class rep verifying attendance',
      role: UserRole.CLASS_REP,
      permission: Permission.ATTENDANCE_VERIFY,
      expected: true
    },
    {
      name: 'Class rep accessing audit logs (should fail)',
      role: UserRole.CLASS_REP,
      permission: Permission.AUDIT_READ,
      expected: false
    }
  ]
  
  scenarios.forEach(scenario => {
    const result = hasPermission(scenario.role, scenario.permission)
    const status = result === scenario.expected ? '✅' : '❌'
    console.log(`  ${scenario.name}: ${status}`)
  })
}

// Export for use in development/testing
if (typeof window === 'undefined') {
  // Only run in Node.js environment (server-side)
  // testPermissions()
  // testPermissionScenarios()
}