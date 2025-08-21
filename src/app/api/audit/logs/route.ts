import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

const auditLogsQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  riskScoreMin: z.coerce.number().optional(),
  riskScoreMax: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0)
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and coordinators can view audit logs
    if (!['ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedParams = auditLogsQuerySchema.parse(queryParams)
    
    const filter = {
      ...validatedParams,
      startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
      endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined
    }

    const result = await AuditService.getAuditLogs(filter)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
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

// Export audit logs
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can export audit logs
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const exportSchema = z.object({
      format: z.enum(['csv', 'json']).default('csv'),
      filter: z.object({
        userId: z.string().optional(),
        action: z.string().optional(),
        targetType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        riskScoreMin: z.number().optional(),
        riskScoreMax: z.number().optional()
      }).optional().default({})
    })

    const { format, filter } = exportSchema.parse(body)
    
    const filterWithDates = {
      ...filter,
      startDate: filter.startDate ? new Date(filter.startDate) : undefined,
      endDate: filter.endDate ? new Date(filter.endDate) : undefined
    }

    const exportData = await AuditService.exportAuditLogs(filterWithDates, format)

    // Log the export action
    await AuditService.createAuditLog({
      userId: session.user.id,
      action: 'AUDIT_LOGS_EXPORTED',
      targetType: 'AuditLog',
      targetId: 'bulk',
      metadata: {
        format,
        filter: filterWithDates,
        exportedBy: session.user.email
      }
    })

    const headers = new Headers()
    if (format === 'csv') {
      headers.set('Content-Type', 'text/csv')
      headers.set('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`)
    } else {
      headers.set('Content-Type', 'application/json')
      headers.set('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`)
    }

    return new NextResponse(exportData, { headers })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}