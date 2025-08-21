import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { enhancedNotificationService } from '@/lib/enhanced-notifications'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  userId: z.string().optional(),
  category: z.enum(['attendance', 'verification', 'system', 'reminder', 'escalation']).optional(),
  channel: z.enum(['email', 'sms', 'in_app', 'push']).optional()
})

// GET /api/notifications/analytics - Get notification analytics and delivery statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to view analytics
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['ADMIN', 'ACADEMIC_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view notification analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      period: searchParams.get('period') || '30d',
      userId: searchParams.get('userId') || undefined,
      category: searchParams.get('category') || undefined,
      channel: searchParams.get('channel') || undefined
    }

    // Validate query parameters
    const validationResult = analyticsQuerySchema.safeParse(queryParams)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { period, userId, category, channel } = validationResult.data

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Build where clause for filtering
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }

    if (userId) {
      whereClause.userId = userId
    }

    if (category) {
      whereClause.type = category
    }

    // Get basic notification statistics
    const [totalNotifications, readNotifications, unreadNotifications] = await Promise.all([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { ...whereClause, isRead: true } }),
      prisma.notification.count({ where: { ...whereClause, isRead: false } })
    ])

    // Get notifications by category
    const notificationsByCategory = await prisma.notification.groupBy({
      by: ['type'],
      where: whereClause,
      _count: {
        id: true
      }
    })

    // Get notifications by priority
    const notificationsByPriority = await prisma.notification.groupBy({
      by: ['priority'],
      where: whereClause,
      _count: {
        id: true
      }
    })

    // Get daily notification trends
    const dailyTrends = await prisma.notification.groupBy({
      by: ['createdAt'],
      where: whereClause,
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Process daily trends to group by date
    const dailyTrendsProcessed = dailyTrends.reduce((acc: any, item) => {
      const date = item.createdAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date] += item._count.id
      return acc
    }, {})

    // Get top recipients (for admin view)
    const topRecipients = await prisma.notification.groupBy({
      by: ['userId'],
      where: whereClause,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    })

    // Get user details for top recipients
    const recipientIds = topRecipients.map(r => r.userId)
    const recipientDetails = await prisma.user.findMany({
      where: {
        id: {
          in: recipientIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    const topRecipientsWithDetails = topRecipients.map(recipient => {
      const userDetails = recipientDetails.find(u => u.id === recipient.userId)
      return {
        userId: recipient.userId,
        count: recipient._count.id,
        user: userDetails
      }
    })

    // Get recent notifications for activity feed
    const recentNotifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    // Calculate read rate
    const readRate = totalNotifications > 0 
      ? Math.round((readNotifications / totalNotifications) * 100) 
      : 0

    // Get delivery statistics (placeholder - would need actual delivery tracking)
    const deliveryStats = await enhancedNotificationService.getDeliveryStats(
      userId,
      { start: startDate, end: endDate }
    )

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalNotifications,
          readNotifications,
          unreadNotifications,
          readRate,
          period,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        },
        byCategory: notificationsByCategory.map(item => ({
          category: item.type,
          count: item._count.id
        })),
        byPriority: notificationsByPriority.map(item => ({
          priority: item.priority,
          count: item._count.id
        })),
        dailyTrends: Object.entries(dailyTrendsProcessed).map(([date, count]) => ({
          date,
          count
        })),
        topRecipients: topRecipientsWithDetails,
        recentActivity: recentNotifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          category: notification.type,
          priority: notification.priority,
          recipient: notification.user,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        })),
        deliveryStats
      }
    })
  } catch (error) {
    console.error('Error fetching notification analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification analytics' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/analytics/export - Export notification analytics
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has permission to export analytics
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['ADMIN', 'ACADEMIC_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to export notification analytics' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { format = 'csv', period = '30d', filters = {} } = body

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Build where clause
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      ...filters
    }

    // Get detailed notification data for export
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'ID',
        'Title',
        'Category',
        'Priority',
        'Recipient Name',
        'Recipient Email',
        'Recipient Role',
        'Is Read',
        'Created At',
        'Read At'
      ]

      const csvRows = notifications.map(notification => [
        notification.id,
        `"${notification.title.replace(/"/g, '""')}"`,
        notification.type,
        notification.priority,
        `"${notification.user.name || 'N/A'}"`,
        notification.user.email,
        notification.user.role,
        notification.isRead ? 'Yes' : 'No',
        notification.createdAt.toISOString(),
        notification.readAt?.toISOString() || 'N/A'
      ])

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="notification-analytics-${period}.csv"`
        }
      })
    } else {
      // Return JSON format
      return NextResponse.json({
        success: true,
        data: notifications,
        metadata: {
          period,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          totalRecords: notifications.length
        }
      })
    }
  } catch (error) {
    console.error('Error exporting notification analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export notification analytics' },
      { status: 500 }
    )
  }
}