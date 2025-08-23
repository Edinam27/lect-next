import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { scheduledReportsService } from '@/lib/scheduled-reports-service'

// GET /api/reports/scheduled/service - Get service status and statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can access service management
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = scheduledReportsService.getStatus()
    const statistics = await scheduledReportsService.getStatistics()

    return NextResponse.json({
      status,
      statistics,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting service status:', error)
    return NextResponse.json(
      { error: 'Failed to get service status' },
      { status: 500 }
    )
  }
}

// POST /api/reports/scheduled/service - Control service (start/stop/restart)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can control the service
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action } = await request.json()

    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, or restart' },
        { status: 400 }
      )
    }

    let message: string
    let newStatus: any

    switch (action) {
      case 'start':
        scheduledReportsService.start()
        newStatus = scheduledReportsService.getStatus()
        message = 'Scheduled reports service started successfully'
        break
        
      case 'stop':
        scheduledReportsService.stop()
        newStatus = scheduledReportsService.getStatus()
        message = 'Scheduled reports service stopped successfully'
        break
        
      case 'restart':
        scheduledReportsService.stop()
        // Wait a moment before restarting
        await new Promise(resolve => setTimeout(resolve, 1000))
        scheduledReportsService.start()
        newStatus = scheduledReportsService.getStatus()
        message = 'Scheduled reports service restarted successfully'
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message,
      status: newStatus,
      action,
      timestamp: new Date().toISOString(),
      performedBy: {
        id: session.user.id,
        name: `${session.user.firstName} ${session.user.lastName}`
      }
    })

  } catch (error) {
    console.error('Error controlling service:', error)
    return NextResponse.json(
      { error: 'Failed to control service' },
      { status: 500 }
    )
  }
}