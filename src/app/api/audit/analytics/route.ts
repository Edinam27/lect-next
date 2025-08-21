import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(30)
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and coordinators can view audit analytics
    if (!['ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const { days } = analyticsQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    const analytics = await AuditService.getAuditAnalytics(days)

    return NextResponse.json({
      success: true,
      data: analytics,
      period: `${days} days`
    })
  } catch (error) {
    console.error('Error fetching audit analytics:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}