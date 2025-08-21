import { prisma } from '@/lib/db'

export interface NotificationData {
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'verification' | 'attendance'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  actionUrl?: string
  metadata?: Record<string, any>
}

export interface EmailNotificationData {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Create a notification in the database
 */
export async function createNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        priority: data.priority || 'medium',
        actionUrl: data.actionUrl,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        isRead: false,
        createdAt: new Date()
      }
    })

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Create multiple notifications for different users
 */
export async function createBulkNotifications(notifications: NotificationData[]) {
  try {
    const notificationData = notifications.map(data => ({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      priority: data.priority || 'medium',
      actionUrl: data.actionUrl,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      isRead: false,
      createdAt: new Date()
    }))

    const result = await prisma.notification.createMany({
      data: notificationData
    })

    return result
  } catch (error) {
    console.error('Error creating bulk notifications:', error)
    throw error
  }
}

/**
 * Send verification request notification to lecturer
 */
export async function notifyLecturerOfVerificationRequest({
  lecturerId,
  classRepName,
  courseName,
  verificationRequestId,
  attendanceDate
}: {
  lecturerId: string
  classRepName: string
  courseName: string
  verificationRequestId: string
  attendanceDate: string
}) {
  return createNotification({
    userId: lecturerId,
    title: 'New Verification Request',
    message: `${classRepName} has submitted a verification request for your attendance in ${courseName} on ${new Date(attendanceDate).toLocaleDateString()}.`,
    type: 'verification',
    priority: 'high',
    actionUrl: `/dashboard/verification-requests?request=${verificationRequestId}`,
    metadata: {
      verificationRequestId,
      classRepName,
      courseName,
      attendanceDate,
      type: 'verification_request_submitted'
    }
  })
}

/**
 * Send verification status update notification to class rep
 */
export async function notifyClassRepOfVerificationUpdate({
  classRepId,
  lecturerName,
  courseName,
  status,
  verificationRequestId,
  reviewNotes
}: {
  classRepId: string
  lecturerName: string
  courseName: string
  status: 'approved' | 'rejected' | 'disputed'
  verificationRequestId: string
  reviewNotes?: string
}) {
  const statusMessages = {
    approved: 'Your verification request has been approved.',
    rejected: 'Your verification request has been rejected.',
    disputed: 'Your verification request has been disputed and escalated.'
  }

  const statusColors = {
    approved: 'success',
    rejected: 'error',
    disputed: 'warning'
  }

  return createNotification({
    userId: classRepId,
    title: `Verification ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `${statusMessages[status]} Lecturer: ${lecturerName}, Course: ${courseName}${reviewNotes ? ` - ${reviewNotes}` : ''}`,
    type: statusColors[status] as any,
    priority: status === 'disputed' ? 'high' : 'medium',
    actionUrl: `/dashboard/verification-requests?request=${verificationRequestId}`,
    metadata: {
      verificationRequestId,
      lecturerName,
      courseName,
      status,
      reviewNotes,
      type: 'verification_request_updated'
    }
  })
}

/**
 * Send attendance reminder notification
 */
export async function notifyAttendanceReminder({
  userId,
  courseName,
  classTime,
  location,
  sessionType
}: {
  userId: string
  courseName: string
  classTime: string
  location: string
  sessionType: string
}) {
  return createNotification({
    userId,
    title: 'Upcoming Class Session',
    message: `Reminder: ${courseName} ${sessionType.toLowerCase()} session at ${new Date(classTime).toLocaleTimeString()} in ${location}.`,
    type: 'info',
    priority: 'medium',
    actionUrl: '/dashboard/attendance',
    metadata: {
      courseName,
      classTime,
      location,
      sessionType,
      type: 'attendance_reminder'
    }
  })
}

/**
 * Send escalation notification to admin/coordinator
 */
export async function notifyEscalation({
  adminId,
  verificationRequestId,
  courseName,
  lecturerName,
  classRepName,
  reason
}: {
  adminId: string
  verificationRequestId: string
  courseName: string
  lecturerName: string
  classRepName: string
  reason?: string
}) {
  return createNotification({
    userId: adminId,
    title: 'Verification Request Escalated',
    message: `A verification request for ${courseName} between ${lecturerName} and ${classRepName} has been escalated and requires your attention.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'warning',
    priority: 'urgent',
    actionUrl: `/dashboard/verification-requests?request=${verificationRequestId}`,
    metadata: {
      verificationRequestId,
      courseName,
      lecturerName,
      classRepName,
      reason,
      type: 'verification_escalated'
    }
  })
}

/**
 * Send system maintenance notification
 */
export async function notifySystemMaintenance({
  userIds,
  maintenanceStart,
  maintenanceEnd,
  description
}: {
  userIds: string[]
  maintenanceStart: string
  maintenanceEnd: string
  description?: string
}) {
  const notifications = userIds.map(userId => ({
    userId,
    title: 'Scheduled System Maintenance',
    message: `System maintenance is scheduled from ${new Date(maintenanceStart).toLocaleString()} to ${new Date(maintenanceEnd).toLocaleString()}.${description ? ` ${description}` : ''}`,
    type: 'warning' as const,
    priority: 'medium' as const,
    metadata: {
      maintenanceStart,
      maintenanceEnd,
      description,
      type: 'system_maintenance'
    }
  }))

  return createBulkNotifications(notifications)
}

/**
 * Send attendance anomaly notification
 */
export async function notifyAttendanceAnomaly({
  coordinatorId,
  lecturerId,
  courseName,
  anomalyType,
  details
}: {
  coordinatorId: string
  lecturerId: string
  courseName: string
  anomalyType: 'frequent_absence' | 'location_mismatch' | 'time_anomaly' | 'suspicious_pattern'
  details: string
}) {
  const anomalyMessages = {
    frequent_absence: 'Frequent absence pattern detected',
    location_mismatch: 'Location verification issues detected',
    time_anomaly: 'Unusual timing patterns detected',
    suspicious_pattern: 'Suspicious attendance pattern detected'
  }

  return createNotification({
    userId: coordinatorId,
    title: 'Attendance Anomaly Detected',
    message: `${anomalyMessages[anomalyType]} for ${courseName}. ${details}`,
    type: 'warning',
    priority: 'high',
    actionUrl: `/dashboard/analytics?lecturer=${lecturerId}&course=${courseName}`,
    metadata: {
      lecturerId,
      courseName,
      anomalyType,
      details,
      type: 'attendance_anomaly'
    }
  })
}

/**
 * Send report generation notification
 */
export async function notifyReportGenerated({
  userId,
  reportType,
  reportUrl,
  generatedAt
}: {
  userId: string
  reportType: string
  reportUrl: string
  generatedAt: string
}) {
  return createNotification({
    userId,
    title: 'Report Generated',
    message: `Your ${reportType} report has been generated and is ready for download.`,
    type: 'success',
    priority: 'medium',
    actionUrl: reportUrl,
    metadata: {
      reportType,
      reportUrl,
      generatedAt,
      type: 'report_generated'
    }
  })
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string) {
  try {
    const [total, unread, byType, byPriority] = await Promise.all([
      prisma.notification.count({
        where: { userId }
      }),
      prisma.notification.count({
        where: { userId, isRead: false }
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { id: true }
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where: { userId, isRead: false },
        _count: { id: true }
      })
    ])

    return {
      total,
      unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.id
        return acc
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.id
        return acc
      }, {} as Record<string, number>)
    }
  } catch (error) {
    console.error('Error getting notification stats:', error)
    throw error
  }
}

/**
 * Clean up old notifications (older than specified days)
 */
export async function cleanupOldNotifications(daysOld: number = 90) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        isRead: true
      }
    })

    return result.count
  } catch (error) {
    console.error('Error cleaning up old notifications:', error)
    throw error
  }
}