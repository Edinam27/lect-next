import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import { generateReport } from '@/lib/report-generator'
import { emailService } from '@/lib/email'
import { notifyReportGenerated } from '@/lib/notifications'

// POST /api/reports/scheduled/[id]/trigger - Manually trigger a scheduled report
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and COORDINATOR can trigger scheduled reports
    if (!['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get scheduled report
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

    if (!scheduledReport.isActive) {
      return NextResponse.json(
        { error: 'Scheduled report is inactive' },
        { status: 400 }
      )
    }

    // Parse parameters and recipients
    const parameters = JSON.parse(scheduledReport.parameters)
    const recipients = JSON.parse(scheduledReport.recipients) as string[]

    try {
      // Generate the report
      const reportResult = await generateReport({
        type: scheduledReport.reportType,
        format: scheduledReport.format,
        parameters,
        generatedBy: session.user.id
      })

      // Create report record
      const reportRecord = await prisma.report.create({
        data: {
          generatedBy: session.user.id,
          title: scheduledReport.name,
          description: scheduledReport.description || `Manually triggered report: ${scheduledReport.name}`,
          reportType: scheduledReport.reportType,
          format: scheduledReport.format,
          parameters: scheduledReport.parameters,
          data: JSON.stringify(reportResult.data),
          filePath: reportResult.filePath,
          fileSize: reportResult.fileSize,
          status: 'completed'
        }
      })

      // Send email notifications to recipients
      const emailPromises = recipients.map(async (email) => {
        try {
          await emailService.sendEmail({
            to: email,
            subject: `Report Generated: ${scheduledReport.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1f2937;">Report Generated Successfully</h2>
                <p>Your scheduled report "${scheduledReport.name}" has been generated and is ready for download.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Report Details</h3>
                  <p><strong>Report Name:</strong> ${scheduledReport.name}</p>
                  <p><strong>Type:</strong> ${scheduledReport.reportType}</p>
                  <p><strong>Format:</strong> ${scheduledReport.format.toUpperCase()}</p>
                  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                  <p><strong>File Size:</strong> ${(reportResult.fileSize / 1024).toFixed(2)} KB</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL}/api/reports/${reportRecord.id}/download" 
                     style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Download Report
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  This report was generated automatically by the UPSA Attendance Management System.
                  If you have any questions, please contact your system administrator.
                </p>
              </div>
            `,
            text: `
              Report Generated Successfully
              
              Your scheduled report "${scheduledReport.name}" has been generated and is ready for download.
              
              Report Details:
              - Report Name: ${scheduledReport.name}
              - Type: ${scheduledReport.reportType}
              - Format: ${scheduledReport.format.toUpperCase()}
              - Generated: ${new Date().toLocaleString()}
              - File Size: ${(reportResult.fileSize / 1024).toFixed(2)} KB
              
              Download Link: ${process.env.NEXTAUTH_URL}/api/reports/${reportRecord.id}/download
              
              This report was generated automatically by the UPSA Attendance Management System.
            `
          })
        } catch (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError)
        }
      })

      await Promise.allSettled(emailPromises)

      // Send in-app notifications to recipients who are users in the system
      const userRecipients = await prisma.user.findMany({
        where: {
          email: {
            in: recipients
          }
        },
        select: { id: true, email: true }
      })

      const notificationPromises = userRecipients.map(user => 
        notifyReportGenerated({
          userId: user.id,
          reportType: scheduledReport.name,
          reportUrl: `/api/reports/${reportRecord.id}/download`,
          generatedAt: new Date().toISOString()
        })
      )

      await Promise.allSettled(notificationPromises)

      // Update scheduled report run count and last run time
      await prisma.scheduledReport.update({
        where: { id: params.id },
        data: {
          lastRun: new Date(),
          runCount: {
            increment: 1
          }
        }
      })

      return NextResponse.json({
        message: 'Report generated and sent successfully',
        reportId: reportRecord.id,
        recipientCount: recipients.length,
        fileSize: reportResult.fileSize
      })

    } catch (generationError) {
      console.error('Report generation failed:', generationError)
      
      // Create failed report record
      await prisma.report.create({
        data: {
          generatedBy: session.user.id,
          title: scheduledReport.name,
          description: scheduledReport.description || `Failed report generation: ${scheduledReport.name}`,
          reportType: scheduledReport.reportType,
          format: scheduledReport.format,
          parameters: scheduledReport.parameters,
          status: 'failed',
          errorMessage: generationError instanceof Error ? generationError.message : 'Unknown error'
        }
      })

      return NextResponse.json(
        { error: 'Failed to generate report', details: generationError instanceof Error ? generationError.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error triggering scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to trigger scheduled report' },
      { status: 500 }
    )
  }
}