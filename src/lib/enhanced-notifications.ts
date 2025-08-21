import { prisma } from '@/lib/db'
import { emailService, emailTemplates, EmailData } from './email'
import { smsService, smsTemplates, SMSData } from './sms'
import { createNotification, createBulkNotifications, NotificationData } from './notifications'

export interface NotificationChannel {
  type: 'email' | 'sms' | 'in_app' | 'push'
  enabled: boolean
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface NotificationPreferences {
  userId: string
  channels: {
    email: NotificationChannel
    sms: NotificationChannel
    in_app: NotificationChannel
    push: NotificationChannel
  }
  categories: {
    attendance: NotificationChannel[]
    verification: NotificationChannel[]
    system: NotificationChannel[]
    reminder: NotificationChannel[]
    escalation: NotificationChannel[]
  }
  quietHours?: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
    timezone: string
  }
}

export interface EnhancedNotificationData {
  userId: string | string[]
  title: string
  message: string
  category: 'attendance' | 'verification' | 'system' | 'reminder' | 'escalation'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  channels?: ('email' | 'sms' | 'in_app' | 'push')[]
  scheduledFor?: Date
  actionUrl?: string
  metadata?: Record<string, any>
  templateData?: Record<string, any>
  retryConfig?: {
    maxRetries: number
    retryDelay: number // minutes
  }
}

export interface NotificationDeliveryResult {
  success: boolean
  channel: string
  messageId?: string
  error?: string
  deliveredAt?: Date
}

class EnhancedNotificationService {
  private defaultPreferences: NotificationPreferences['channels'] = {
    email: { type: 'email', enabled: true, priority: 'normal' },
    sms: { type: 'sms', enabled: false, priority: 'high' },
    in_app: { type: 'in_app', enabled: true, priority: 'normal' },
    push: { type: 'push', enabled: true, priority: 'normal' }
  }

  async sendNotification(data: EnhancedNotificationData): Promise<{
    success: boolean
    results: NotificationDeliveryResult[]
    notificationId?: string
  }> {
    try {
      const userIds = Array.isArray(data.userId) ? data.userId : [data.userId]
      const results: NotificationDeliveryResult[] = []
      let notificationId: string | undefined

      // Handle scheduled notifications
      if (data.scheduledFor && data.scheduledFor > new Date()) {
        return await this.scheduleNotification(data)
      }

      // Process each user
      for (const userId of userIds) {
        const userPreferences = await this.getUserPreferences(userId)
        const channels = this.determineChannels(data, userPreferences)

        // Check quiet hours
        if (await this.isInQuietHours(userId, data.priority)) {
          // Only send urgent notifications during quiet hours
          if (data.priority !== 'urgent') {
            continue
          }
        }

        // Send in-app notification first (always)
        if (channels.includes('in_app')) {
          try {
            const notification = await createNotification({
              userId,
              title: data.title,
              message: data.message,
              type: data.category,
              priority: data.priority,
              actionUrl: data.actionUrl,
              metadata: data.metadata
            })
            
            notificationId = notification.id
            results.push({
              success: true,
              channel: 'in_app',
              messageId: notification.id,
              deliveredAt: new Date()
            })
          } catch (error) {
            results.push({
              success: false,
              channel: 'in_app',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        // Send email notification
        if (channels.includes('email')) {
          const emailResult = await this.sendEmailNotification(userId, data)
          results.push(emailResult)
        }

        // Send SMS notification
        if (channels.includes('sms')) {
          const smsResult = await this.sendSMSNotification(userId, data)
          results.push(smsResult)
        }

        // Log delivery attempt
        await this.logDeliveryAttempt({
          userId,
          notificationId: notificationId || 'unknown',
          category: data.category,
          priority: data.priority,
          channels: channels,
          results: results.filter(r => r.channel !== 'in_app')
        })
      }

      const successfulDeliveries = results.filter(r => r.success).length
      return {
        success: successfulDeliveries > 0,
        results,
        notificationId
      }
    } catch (error) {
      console.error('Enhanced notification sending failed:', error)
      return {
        success: false,
        results: [{
          success: false,
          channel: 'system',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      }
    }
  }

  private async sendEmailNotification(
    userId: string, 
    data: EnhancedNotificationData
  ): Promise<NotificationDeliveryResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      })

      if (!user?.email) {
        return {
          success: false,
          channel: 'email',
          error: 'User email not found'
        }
      }

      let emailData: EmailData

      // Use template if available
      if (data.templateData) {
        emailData = this.generateEmailFromTemplate(data, user, data.templateData)
      } else {
        emailData = {
          to: user.email,
          subject: data.title,
          html: this.generateBasicEmailHTML(data, user.name || 'User'),
          text: data.message
        }
      }

      const result = await emailService.sendEmail(emailData)
      
      return {
        success: result.success,
        channel: 'email',
        messageId: result.messageId,
        error: result.error,
        deliveredAt: result.success ? new Date() : undefined
      }
    } catch (error) {
      return {
        success: false,
        channel: 'email',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async sendSMSNotification(
    userId: string, 
    data: EnhancedNotificationData
  ): Promise<NotificationDeliveryResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
      })

      if (!user?.phone) {
        return {
          success: false,
          channel: 'sms',
          error: 'User phone number not found'
        }
      }

      let smsMessage: string

      // Use template if available
      if (data.templateData) {
        smsMessage = this.generateSMSFromTemplate(data, data.templateData)
      } else {
        // Truncate message for SMS (160 character limit)
        smsMessage = data.message.length > 160 
          ? `${data.message.substring(0, 157)}...` 
          : data.message
      }

      const result = await smsService.sendSMS({
        to: user.phone,
        message: smsMessage,
        priority: data.priority
      })
      
      return {
        success: result.success,
        channel: 'sms',
        messageId: result.messageId,
        error: result.error,
        deliveredAt: result.success ? new Date() : undefined
      }
    } catch (error) {
      return {
        success: false,
        channel: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private generateEmailFromTemplate(
    data: EnhancedNotificationData, 
    user: { email: string; name: string | null }, 
    templateData: Record<string, any>
  ): EmailData {
    const userName = user.name || 'User'
    
    switch (data.category) {
      case 'verification':
        if (templateData.type === 'request') {
          const template = emailTemplates.verificationRequest({
            lecturerName: userName,
            ...templateData
          })
          return {
            to: user.email,
            subject: template.subject,
            html: template.html,
            text: template.text
          }
        } else if (templateData.type === 'status_update') {
          const template = emailTemplates.verificationStatusUpdate({
            classRepName: userName,
            ...templateData
          })
          return {
            to: user.email,
            subject: template.subject,
            html: template.html,
            text: template.text
          }
        }
        break
      case 'reminder':
        const template = emailTemplates.attendanceReminder({
          recipientName: userName,
          ...templateData
        })
        return {
          to: user.email,
          subject: template.subject,
          html: template.html,
          text: template.text
        }
    }

    // Fallback to basic email
    return {
      to: user.email,
      subject: data.title,
      html: this.generateBasicEmailHTML(data, userName),
      text: data.message
    }
  }

  private generateSMSFromTemplate(
    data: EnhancedNotificationData, 
    templateData: Record<string, any>
  ): string {
    switch (data.category) {
      case 'verification':
        if (templateData.type === 'urgent') {
          return smsTemplates.verificationUrgent(templateData).message
        } else if (templateData.status === 'approved') {
          return smsTemplates.verificationApproved(templateData).message
        } else if (templateData.status === 'rejected') {
          return smsTemplates.verificationRejected(templateData).message
        }
        break
      case 'reminder':
        return smsTemplates.attendanceReminder(templateData).message
      case 'escalation':
        return smsTemplates.escalationAlert(templateData).message
      case 'system':
        return smsTemplates.systemAlert(templateData).message
    }

    // Fallback to basic message
    return data.message.length > 160 
      ? `${data.message.substring(0, 157)}...` 
      : data.message
  }

  private generateBasicEmailHTML(data: EnhancedNotificationData, userName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">${data.title}</h2>
        <p>Dear ${userName},</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>${data.message}</p>
        </div>
        ${data.actionUrl ? `<a href="${data.actionUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Take Action</a>` : ''}
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from the UPSA Attendance Management System.
        </p>
      </div>
    `
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Try to get user preferences from database
      const userSettings = await prisma.systemSettings.findMany({
        where: {
          category: 'notification_preferences',
          key: userId
        }
      })

      if (userSettings.length > 0) {
        return JSON.parse(userSettings[0].value)
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error)
    }

    // Return default preferences
    return {
      userId,
      channels: this.defaultPreferences,
      categories: {
        attendance: [{ type: 'in_app', enabled: true }, { type: 'email', enabled: true }],
        verification: [{ type: 'in_app', enabled: true }, { type: 'email', enabled: true }, { type: 'sms', enabled: true, priority: 'high' }],
        system: [{ type: 'in_app', enabled: true }, { type: 'email', enabled: true }],
        reminder: [{ type: 'in_app', enabled: true }, { type: 'email', enabled: true }],
        escalation: [{ type: 'in_app', enabled: true }, { type: 'email', enabled: true }, { type: 'sms', enabled: true, priority: 'urgent' }]
      }
    }
  }

  private determineChannels(
    data: EnhancedNotificationData, 
    preferences: NotificationPreferences
  ): ('email' | 'sms' | 'in_app' | 'push')[] {
    // If channels are explicitly specified, use those
    if (data.channels) {
      return data.channels
    }

    // Use category preferences
    const categoryChannels = preferences.categories[data.category] || []
    const enabledChannels = categoryChannels
      .filter(channel => channel.enabled)
      .filter(channel => {
        // Filter by priority if specified
        if (channel.priority) {
          const priorityLevels = { low: 1, normal: 2, high: 3, urgent: 4 }
          return priorityLevels[data.priority] >= priorityLevels[channel.priority]
        }
        return true
      })
      .map(channel => channel.type)

    // Always include in-app notifications
    if (!enabledChannels.includes('in_app')) {
      enabledChannels.push('in_app')
    }

    return enabledChannels
  }

  private async isInQuietHours(userId: string, priority: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId)
      
      if (!preferences.quietHours?.enabled) {
        return false
      }

      // Urgent notifications bypass quiet hours
      if (priority === 'urgent') {
        return false
      }

      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5) // HH:mm format
      
      return currentTime >= preferences.quietHours.start && 
             currentTime <= preferences.quietHours.end
    } catch (error) {
      console.error('Error checking quiet hours:', error)
      return false
    }
  }

  private async scheduleNotification(data: EnhancedNotificationData): Promise<{
    success: boolean
    results: NotificationDeliveryResult[]
    notificationId?: string
  }> {
    try {
      // Store scheduled notification in database
      const scheduledNotification = await prisma.notification.create({
        data: {
          userId: Array.isArray(data.userId) ? data.userId[0] : data.userId,
          title: data.title,
          message: data.message,
          type: data.category,
          priority: data.priority,
          actionUrl: data.actionUrl,
          metadata: JSON.stringify({
            ...data.metadata,
            scheduledFor: data.scheduledFor,
            channels: data.channels,
            templateData: data.templateData,
            isScheduled: true
          }),
          isRead: false
        }
      })

      return {
        success: true,
        results: [{
          success: true,
          channel: 'scheduled',
          messageId: scheduledNotification.id,
          deliveredAt: new Date()
        }],
        notificationId: scheduledNotification.id
      }
    } catch (error) {
      console.error('Error scheduling notification:', error)
      return {
        success: false,
        results: [{
          success: false,
          channel: 'scheduled',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      }
    }
  }

  private async logDeliveryAttempt(data: {
    userId: string
    notificationId: string
    category: string
    priority: string
    channels: string[]
    results: NotificationDeliveryResult[]
  }) {
    try {
      // Log to audit trail or separate delivery log table
      console.log('Notification delivery attempt:', {
        userId: data.userId,
        notificationId: data.notificationId,
        category: data.category,
        priority: data.priority,
        channels: data.channels,
        successfulChannels: data.results.filter(r => r.success).map(r => r.channel),
        failedChannels: data.results.filter(r => !r.success).map(r => ({ channel: r.channel, error: r.error })),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error logging delivery attempt:', error)
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserPreferences(userId)
      const updatedPreferences = { ...currentPreferences, ...preferences }

      await prisma.systemSettings.upsert({
        where: {
          category_key: {
            category: 'notification_preferences',
            key: userId
          }
        },
        update: {
          value: JSON.stringify(updatedPreferences),
          updatedAt: new Date()
        },
        create: {
          category: 'notification_preferences',
          key: userId,
          value: JSON.stringify(updatedPreferences),
          description: 'User notification preferences'
        }
      })

      return true
    } catch (error) {
      console.error('Error updating user preferences:', error)
      return false
    }
  }

  async getDeliveryStats(userId?: string, dateRange?: { start: Date; end: Date }) {
    try {
      // Implementation would query delivery logs
      // This is a placeholder for the actual implementation
      return {
        totalSent: 0,
        totalDelivered: 0,
        deliveryRate: 0,
        byChannel: {
          email: { sent: 0, delivered: 0, failed: 0 },
          sms: { sent: 0, delivered: 0, failed: 0 },
          in_app: { sent: 0, delivered: 0, failed: 0 }
        }
      }
    } catch (error) {
      console.error('Error getting delivery stats:', error)
      throw error
    }
  }
}

// Singleton instance
export const enhancedNotificationService = new EnhancedNotificationService()

// Convenience functions for common notification types
export const notificationHelpers = {
  async sendVerificationRequest(data: {
    lecturerId: string
    classRepName: string
    courseName: string
    classGroup: string
    sessionDate: string
    location: string
    verificationUrl: string
  }) {
    return enhancedNotificationService.sendNotification({
      userId: data.lecturerId,
      title: `Attendance Verification Required - ${data.courseName}`,
      message: `${data.classRepName} has submitted an attendance verification request for ${data.courseName}.`,
      category: 'verification',
      priority: 'high',
      channels: ['in_app', 'email'],
      actionUrl: data.verificationUrl,
      templateData: {
        type: 'request',
        lecturerName: '', // Will be filled by the service
        classRepName: data.classRepName,
        courseName: data.courseName,
        classGroup: data.classGroup,
        sessionDate: data.sessionDate,
        location: data.location,
        verificationUrl: data.verificationUrl
      }
    })
  },

  async sendVerificationStatusUpdate(data: {
    classRepId: string
    courseName: string
    sessionDate: string
    status: 'approved' | 'rejected' | 'disputed'
    reviewNotes?: string
    dashboardUrl: string
  }) {
    const priority = data.status === 'rejected' ? 'high' : 'normal'
    const channels: ('email' | 'sms' | 'in_app')[] = ['in_app', 'email']
    
    if (data.status === 'rejected') {
      channels.push('sms')
    }

    return enhancedNotificationService.sendNotification({
      userId: data.classRepId,
      title: `Verification ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} - ${data.courseName}`,
      message: `Your attendance verification request has been ${data.status}.`,
      category: 'verification',
      priority,
      channels,
      actionUrl: data.dashboardUrl,
      templateData: {
        type: 'status_update',
        classRepName: '', // Will be filled by the service
        courseName: data.courseName,
        sessionDate: data.sessionDate,
        status: data.status,
        reviewNotes: data.reviewNotes,
        dashboardUrl: data.dashboardUrl
      }
    })
  },

  async sendAttendanceReminder(data: {
    userIds: string[]
    courseName: string
    sessionTime: string
    location: string
    sessionType: string
  }) {
    return enhancedNotificationService.sendNotification({
      userId: data.userIds,
      title: `Upcoming Class Session - ${data.courseName}`,
      message: `Reminder: ${data.courseName} ${data.sessionType.toLowerCase()} session at ${data.sessionTime}.`,
      category: 'reminder',
      priority: 'normal',
      channels: ['in_app', 'email'],
      templateData: {
        recipientName: '', // Will be filled by the service
        courseName: data.courseName,
        sessionTime: data.sessionTime,
        location: data.location,
        sessionType: data.sessionType
      }
    })
  },

  async sendEscalationAlert(data: {
    coordinatorIds: string[]
    courseName: string
    issueType: string
    reporterName: string
    details: string
    actionUrl: string
  }) {
    return enhancedNotificationService.sendNotification({
      userId: data.coordinatorIds,
      title: `Escalation Alert - ${data.issueType}`,
      message: `${data.issueType} reported for ${data.courseName} by ${data.reporterName}. Immediate attention required.`,
      category: 'escalation',
      priority: 'urgent',
      channels: ['in_app', 'email', 'sms'],
      actionUrl: data.actionUrl,
      templateData: {
        courseName: data.courseName,
        issueType: data.issueType,
        reporterName: data.reporterName,
        details: data.details
      }
    })
  }
}