import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { enhancedNotificationService, EnhancedNotificationData } from '@/lib/enhanced-notifications'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const sendNotificationSchema = z.object({
  userId: z.union([z.string(), z.array(z.string())]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  category: z.enum(['attendance', 'verification', 'system', 'reminder', 'escalation']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  channels: z.array(z.enum(['email', 'sms', 'in_app', 'push'])).optional(),
  scheduledFor: z.string().datetime().optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  templateData: z.record(z.any()).optional()
})

const bulkNotificationSchema = z.object({
  notifications: z.array(sendNotificationSchema),
  batchSize: z.number().min(1).max(100).optional().default(10)
})

// POST /api/notifications/send - Send a single notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to send notifications
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['ADMIN', 'ACADEMIC_COORDINATOR', 'LECTURER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to send notifications' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate the request body
    const validationResult = sendNotificationSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid notification data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const notificationData: EnhancedNotificationData = {
      ...validationResult.data,
      scheduledFor: validationResult.data.scheduledFor 
        ? new Date(validationResult.data.scheduledFor) 
        : undefined
    }

    // Send the notification
    const result = await enhancedNotificationService.sendNotification(notificationData)

    return NextResponse.json({
      success: result.success,
      notificationId: result.notificationId,
      results: result.results,
      message: result.success 
        ? 'Notification sent successfully' 
        : 'Notification failed to send'
    })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/send/bulk - Send multiple notifications
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to send bulk notifications
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['ADMIN', 'ACADEMIC_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to send bulk notifications' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate the request body
    const validationResult = bulkNotificationSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid bulk notification data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { notifications, batchSize } = validationResult.data
    const results = []
    const errors = []

    // Process notifications in batches
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (notificationData, index) => {
        try {
          const enhancedData: EnhancedNotificationData = {
            ...notificationData,
            scheduledFor: notificationData.scheduledFor 
              ? new Date(notificationData.scheduledFor) 
              : undefined
          }

          const result = await enhancedNotificationService.sendNotification(enhancedData)
          return {
            index: i + index,
            success: result.success,
            notificationId: result.notificationId,
            results: result.results
          }
        } catch (error) {
          return {
            index: i + index,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add a small delay between batches to avoid overwhelming the system
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: successCount > 0,
      totalNotifications: notifications.length,
      successCount,
      failureCount,
      results,
      message: `Bulk notification completed: ${successCount} sent, ${failureCount} failed`
    })
  } catch (error) {
    console.error('Error sending bulk notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send bulk notifications' },
      { status: 500 }
    )
  }
}