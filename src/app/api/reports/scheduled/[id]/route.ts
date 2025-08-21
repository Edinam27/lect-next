import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import { z } from 'zod'

const updateScheduledReportSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  reportType: z.enum(['attendance', 'verification', 'lecturer_performance', 'course_analytics', 'audit']).optional(),
  parameters: z.object({
    dateRange: z.enum(['week', 'month', 'semester', 'year']).default('month'),
    lecturerId: z.string().optional(),
    courseId: z.string().optional(),
    programmeId: z.string().optional(),
    includeCharts: z.boolean().default(true),
    includeExecutiveSummary: z.boolean().default(true)
  }).optional(),
  schedule: z.string().regex(/^[0-9*,\-/\s]+$/, 'Invalid cron expression').optional(),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required').optional(),
  format: z.enum(['pdf', 'excel', 'csv']).optional(),
  isActive: z.boolean().optional()
})

// GET /api/reports/scheduled/[id] - Get a specific scheduled report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and COORDINATOR can view scheduled reports
    if (!['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id },
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

    if (!scheduledReport) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...scheduledReport,
      parameters: JSON.parse(scheduledReport.parameters),
      recipients: JSON.parse(scheduledReport.recipients)
    })
  } catch (error) {
    console.error('Error fetching scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled report' },
      { status: 500 }
    )
  }
}

// PUT /api/reports/scheduled/[id] - Update a scheduled report
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and COORDINATOR can update scheduled reports
    if (!['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if scheduled report exists
    const existingReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateScheduledReportSchema.parse(body)

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.reportType) updateData.reportType = validatedData.reportType
    if (validatedData.parameters) updateData.parameters = JSON.stringify(validatedData.parameters)
    if (validatedData.schedule) {
      updateData.schedule = validatedData.schedule
      updateData.nextRun = calculateNextRun(validatedData.schedule)
    }
    if (validatedData.recipients) updateData.recipients = JSON.stringify(validatedData.recipients)
    if (validatedData.format) updateData.format = validatedData.format
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    // Update scheduled report
    const updatedReport = await prisma.scheduledReport.update({
      where: { id: params.id },
      data: updateData,
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
      ...updatedReport,
      parameters: JSON.parse(updatedReport.parameters),
      recipients: JSON.parse(updatedReport.recipients)
    })
  } catch (error) {
    console.error('Error updating scheduled report:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update scheduled report' },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/scheduled/[id] - Delete a scheduled report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and COORDINATOR can delete scheduled reports
    if (!['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if scheduled report exists
    const existingReport = await prisma.scheduledReport.findUnique({
      where: { id: params.id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      )
    }

    // Delete scheduled report
    await prisma.scheduledReport.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: 'Scheduled report deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
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