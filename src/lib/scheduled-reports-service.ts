import { prisma } from '@/lib/db'
import { generateReport, calculateNextRun } from '@/lib/report-generator'
import { emailService } from '@/lib/email'
import { notifyReportGenerated } from '@/lib/notifications'
import * as cron from 'node-cron'

export class ScheduledReportsService {
  private static instance: ScheduledReportsService
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  
  private constructor() {}
  
  public static getInstance(): ScheduledReportsService {
    if (!ScheduledReportsService.instance) {
      ScheduledReportsService.instance = new ScheduledReportsService()
    }
    return ScheduledReportsService.instance
  }
  
  // Start the scheduled reports service
  public start(): void {
    if (this.isRunning) {
      console.log('Scheduled reports service is already running')
      return
    }
    
    console.log('Starting scheduled reports service...')
    this.isRunning = true
    
    // Check for due reports every minute
    this.intervalId = setInterval(() => {
      this.processDueReports().catch(error => {
        console.error('Error processing due reports:', error)
      })
    }, 60 * 1000) // Check every minute
    
    console.log('Scheduled reports service started')
  }
  
  // Stop the scheduled reports service
  public stop(): void {
    if (!this.isRunning) {
      console.log('Scheduled reports service is not running')
      return
    }
    
    console.log('Stopping scheduled reports service...')
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    this.isRunning = false
    console.log('Scheduled reports service stopped')
  }
  
  // Check if service is running
  public getStatus(): { isRunning: boolean; nextCheck?: Date } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.isRunning ? new Date(Date.now() + 60 * 1000) : undefined
    }
  }
  
  // Process all due scheduled reports
  private async processDueReports(): Promise<void> {
    try {
      const now = new Date()
      
      // Find all active scheduled reports that are due
      const dueReports = await prisma.scheduledReport.findMany({
        where: {
          isActive: true,
          nextRun: {
            lte: now
          }
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
      
      if (dueReports.length === 0) {
        return
      }
      
      console.log(`Processing ${dueReports.length} due scheduled reports...`)
      
      // Process each due report
      for (const scheduledReport of dueReports) {
        try {
          await this.generateScheduledReport(scheduledReport)
        } catch (error) {
          console.error(`Failed to generate scheduled report ${scheduledReport.id}:`, error)
          
          // Update the scheduled report with error information
          await prisma.scheduledReport.update({
            where: { id: scheduledReport.id },
            data: {
              lastRun: now,
              runCount: {
                increment: 1
              },
              lastError: error instanceof Error ? error.message : 'Unknown error'
            }
          })
        }
      }
      
    } catch (error) {
      console.error('Error in processDueReports:', error)
    }
  }
  
  // Generate a single scheduled report
  private async generateScheduledReport(scheduledReport: any): Promise<void> {
    console.log(`Generating scheduled report: ${scheduledReport.name}`)
    
    const parameters = JSON.parse(scheduledReport.parameters)
    const recipients = JSON.parse(scheduledReport.recipients) as string[]
    
    try {
      // Generate the report
      const reportResult = await generateReport({
        type: scheduledReport.reportType,
        format: scheduledReport.format,
        parameters,
        generatedBy: scheduledReport.createdBy
      })
      
      // Create report record
      const reportRecord = await prisma.report.create({
        data: {
          generatedBy: scheduledReport.createdBy,
          title: scheduledReport.name,
          description: scheduledReport.description || `Scheduled report: ${scheduledReport.name}`,
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
            subject: `Scheduled Report: ${scheduledReport.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1f2937;">Scheduled Report Generated</h2>
                <p>Your scheduled report "${scheduledReport.name}" has been generated automatically and is ready for download.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Report Details</h3>
                  <p><strong>Report Name:</strong> ${scheduledReport.name}</p>
                  <p><strong>Type:</strong> ${scheduledReport.reportType}</p>
                  <p><strong>Format:</strong> ${scheduledReport.format.toUpperCase()}</p>
                  <p><strong>Schedule:</strong> ${scheduledReport.schedule}</p>
                  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                  <p><strong>File Size:</strong> ${(reportResult.fileSize / 1024).toFixed(2)} KB</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL}/api/reports/${reportRecord.id}/download" 
                     style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Download Report
                  </a>
                </div>
                
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Next Report:</strong> ${scheduledReport.nextRun ? new Date(scheduledReport.nextRun).toLocaleString() : 'Not scheduled'}
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  This is an automated report from the UPSA Attendance Management System.
                  To modify or unsubscribe from this report, please contact your system administrator.
                </p>
              </div>
            `,
            text: `
              Scheduled Report Generated
              
              Your scheduled report "${scheduledReport.name}" has been generated automatically and is ready for download.
              
              Report Details:
              - Report Name: ${scheduledReport.name}
              - Type: ${scheduledReport.reportType}
              - Format: ${scheduledReport.format.toUpperCase()}
              - Schedule: ${scheduledReport.schedule}
              - Generated: ${new Date().toLocaleString()}
              - File Size: ${(reportResult.fileSize / 1024).toFixed(2)} KB
              
              Download Link: ${process.env.NEXTAUTH_URL}/api/reports/${reportRecord.id}/download
              
              Next Report: ${scheduledReport.nextRun ? new Date(scheduledReport.nextRun).toLocaleString() : 'Not scheduled'}
              
              This is an automated report from the UPSA Attendance Management System.
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
      
      // Calculate next run time
      const nextRun = this.calculateNextRun(scheduledReport.schedule)
      
      // Update scheduled report
      await prisma.scheduledReport.update({
        where: { id: scheduledReport.id },
        data: {
          lastRun: new Date(),
          nextRun,
          runCount: {
            increment: 1
          },
          lastError: null // Clear any previous errors
        }
      })
      
      console.log(`Successfully generated scheduled report: ${scheduledReport.name}`)
      
    } catch (error) {
      console.error(`Failed to generate scheduled report ${scheduledReport.name}:`, error)
      throw error
    }
  }
  
  // Manually trigger a specific scheduled report
  public async triggerReport(scheduledReportId: string): Promise<void> {
    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: { id: scheduledReportId },
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
      throw new Error('Scheduled report not found')
    }
    
    if (!scheduledReport.isActive) {
      throw new Error('Scheduled report is inactive')
    }
    
    await this.generateScheduledReport(scheduledReport)
  }
  
  // Get service statistics
  public async getStatistics(): Promise<{
    totalScheduledReports: number
    activeScheduledReports: number
    totalReportsGenerated: number
    reportsGeneratedToday: number
    nextDueReport?: {
      id: string
      name: string
      nextRun: Date
    }
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const [totalScheduled, activeScheduled, totalGenerated, generatedToday, nextDue] = await Promise.all([
      prisma.scheduledReport.count(),
      prisma.scheduledReport.count({ where: { isActive: true } }),
      prisma.report.count(),
      prisma.report.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      prisma.scheduledReport.findFirst({
        where: {
          isActive: true,
          nextRun: {
            gte: new Date()
          }
        },
        orderBy: {
          nextRun: 'asc'
        },
        select: {
          id: true,
          name: true,
          nextRun: true
        }
      })
    ])
    
    return {
      totalScheduledReports: totalScheduled,
      activeScheduledReports: activeScheduled,
      totalReportsGenerated: totalGenerated,
      reportsGeneratedToday: generatedToday,
      nextDueReport: nextDue || undefined
    }
  }

  /**
   * Calculate next run time based on cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`)
      }
      
      // For next run calculation, we'll use a simple approach
      // In a more sophisticated implementation, you could use a library like 'cron-parser'
      const now = new Date()
      const nextRun = new Date(now)
      
      // Parse basic patterns
      const parts = cronExpression.split(' ')
      if (parts.length === 5) {
        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
        
        // Handle daily patterns (0 9 * * *)
        if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
          const targetHour = parseInt(hour)
          const targetMinute = parseInt(minute)
          
          nextRun.setHours(targetHour, targetMinute, 0, 0)
          
          // If time has passed today, schedule for tomorrow
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1)
          }
          
          return nextRun
        }
        
        // Handle weekly patterns (0 9 * * 1)
        if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
          const targetDayOfWeek = parseInt(dayOfWeek)
          const targetHour = parseInt(hour)
          const targetMinute = parseInt(minute)
          
          nextRun.setHours(targetHour, targetMinute, 0, 0)
          
          // Calculate days until target day of week
          const currentDayOfWeek = nextRun.getDay()
          let daysUntilTarget = targetDayOfWeek - currentDayOfWeek
          
          if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= now)) {
            daysUntilTarget += 7
          }
          
          nextRun.setDate(nextRun.getDate() + daysUntilTarget)
          return nextRun
        }
      }
      
      // Fallback: add 1 hour
      nextRun.setHours(nextRun.getHours() + 1)
      return nextRun
    } catch (error) {
      console.error('Error calculating next run:', error)
      // Fallback: add 1 hour
      const fallback = new Date()
      fallback.setHours(fallback.getHours() + 1)
      return fallback
    }
  }
}

// Export singleton instance
export const scheduledReportsService = ScheduledReportsService.getInstance()

// Auto-start the service in production
if (process.env.NODE_ENV === 'production') {
  scheduledReportsService.start()
}