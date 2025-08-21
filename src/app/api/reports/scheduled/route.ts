import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { notifyReportGenerated } from '@/lib/notifications'

const scheduledReportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  reportType: z.enum(['attendance', 'verification', 'lecturer_performance', 'course_analytics', 'audit']),
  parameters: z.object({
    dateRange: z.enum(['week', 'month', 'semester', 'year']).default('month'),
    lecturerId: z.string().optional(),
    courseId: z.string().optional(),
    programmeId: z.string().optional(),
    includeCharts: z.boolean().default(true),
    includeExecutiveSummary: z.boolean().default(true)
  }),
  schedule: z.string().regex(/^[0-9*,\-/\s]+$/, 'Invalid cron expression'),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
  isActive: z.boolean().default(true)
})

type ScheduledReportInput = z.infer<typeof scheduledReportSchema>

// GET /api/reports/scheduled - Get all scheduled reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and COORDINATOR can view scheduled reports
    if (!['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const isActive = searchParams.get('active')
    const reportType = searchParams.get('type')

    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    
    if (isActive !== null) {
      whereClause.isActive = isActive === 'true'
    }
    
    if (reportType) {
      whereClause.reportType = reportType
    }

    // Get scheduled reports with pagination
    const [scheduledReports, total] = await Promise.all([
      prisma.scheduledReport.findMany({
        where: whereClause,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.scheduledReport.count({ where: whereClause })
    ])

    return NextResponse.json({
      scheduledReports: scheduledReports.map(report => ({
        ...report,
        parameters: JSON.parse(report.parameters),
        recipients: JSON.parse(report.recipients)
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching scheduled reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
      { status: 500 }
    )
  }
}

// POST /api/reports/scheduled - Create a new scheduled report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and COORDINATOR can create scheduled reports
    if (!['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = scheduledReportSchema.parse(body)

    // Validate cron expression (basic validation)
    const cronParts = validatedData.schedule.trim().split(/\s+/)
    if (cronParts.length !== 5) {
      return NextResponse.json(
        { error: 'Invalid cron expression. Must have 5 parts: minute hour day month weekday' },
        { status: 400 }
      )
    }

    // Calculate next run time based on cron expression
    const nextRun = calculateNextRun(validatedData.schedule)

    // Create scheduled report
    const scheduledReport = await prisma.scheduledReport.create({
      data: {
        createdBy: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        reportType: validatedData.reportType,
        parameters: JSON.stringify(validatedData.parameters),
        schedule: validatedData.schedule,
        recipients: JSON.stringify(validatedData.recipients),
        format: validatedData.format,
        isActive: validatedData.isActive,
        nextRun
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      ...scheduledReport,
      parameters: JSON.parse(scheduledReport.parameters),
      recipients: JSON.parse(scheduledReport.recipients)
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating scheduled report:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    )
  }
}

// Helper function to calculate next run time
function calculateNextRun(cronExpression: string): Date {
  // This is a simplified implementation
  // In production, you'd use a proper cron parser like 'node-cron' or 'cron-parser'
  const now = new Date()
  const [minute, hour, day, month, weekday] = cronExpression.split(/\s+/)
  
  // For now, just add 1 day as a placeholder
  // TODO: Implement proper cron parsing
  const nextRun = new Date(now)
  nextRun.setDate(now.getDate() + 1)
  
  return nextRun
}