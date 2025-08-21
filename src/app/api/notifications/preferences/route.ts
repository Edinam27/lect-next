import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { enhancedNotificationService, NotificationPreferences } from '@/lib/enhanced-notifications'
import { z } from 'zod'

const notificationChannelSchema = z.object({
  type: z.enum(['email', 'sms', 'in_app', 'push']),
  enabled: z.boolean(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
})

const notificationPreferencesSchema = z.object({
  channels: z.object({
    email: notificationChannelSchema,
    sms: notificationChannelSchema,
    in_app: notificationChannelSchema,
    push: notificationChannelSchema
  }),
  categories: z.object({
    attendance: z.array(notificationChannelSchema),
    verification: z.array(notificationChannelSchema),
    system: z.array(notificationChannelSchema),
    reminder: z.array(notificationChannelSchema),
    escalation: z.array(notificationChannelSchema)
  }),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string()
  }).optional()
})

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user preferences (this will return defaults if none exist)
    const preferences = await enhancedNotificationService['getUserPreferences'](session.user.id)
    
    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate the request body
    const validationResult = notificationPreferencesSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid preferences data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const preferences: Partial<NotificationPreferences> = {
      userId: session.user.id,
      ...validationResult.data
    }

    const success = await enhancedNotificationService.updateUserPreferences(
      session.user.id,
      preferences
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully'
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/preferences/test - Test notification delivery
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { channels } = body

    if (!channels || !Array.isArray(channels)) {
      return NextResponse.json(
        { error: 'Channels array is required' },
        { status: 400 }
      )
    }

    // Send test notification
    const result = await enhancedNotificationService.sendNotification({
      userId: session.user.id,
      title: 'Test Notification',
      message: 'This is a test notification to verify your notification settings are working correctly.',
      category: 'system',
      priority: 'normal',
      channels: channels as ('email' | 'sms' | 'in_app' | 'push')[]
    })

    return NextResponse.json({
      success: result.success,
      results: result.results,
      message: result.success 
        ? 'Test notification sent successfully' 
        : 'Test notification failed to send'
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}