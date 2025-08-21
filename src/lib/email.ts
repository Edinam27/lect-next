import nodemailer from 'nodemailer'
import { Resend } from 'resend'

export interface EmailConfig {
  provider: 'smtp' | 'resend' | 'sendgrid'
  smtp?: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }
  resend?: {
    apiKey: string
  }
  sendgrid?: {
    apiKey: string
  }
}

export interface EmailData {
  to: string | string[]
  from?: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

class EmailService {
  private config: EmailConfig
  private transporter: nodemailer.Transporter | null = null
  private resend: Resend | null = null

  constructor() {
    this.config = this.getEmailConfig()
    this.initializeProvider()
  }

  private getEmailConfig(): EmailConfig {
    const provider = (process.env.EMAIL_PROVIDER || 'smtp') as EmailConfig['provider']
    
    const config: EmailConfig = { provider }

    switch (provider) {
      case 'smtp':
        config.smtp = {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        }
        break
      case 'resend':
        config.resend = {
          apiKey: process.env.RESEND_API_KEY || ''
        }
        break
      case 'sendgrid':
        config.sendgrid = {
          apiKey: process.env.SENDGRID_API_KEY || ''
        }
        break
    }

    return config
  }

  private initializeProvider() {
    switch (this.config.provider) {
      case 'smtp':
        if (this.config.smtp) {
          this.transporter = nodemailer.createTransporter(this.config.smtp)
        }
        break
      case 'resend':
        if (this.config.resend?.apiKey) {
          this.resend = new Resend(this.config.resend.apiKey)
        }
        break
    }
  }

  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const fromAddress = emailData.from || process.env.EMAIL_FROM || 'noreply@upsa.edu.gh'
      
      switch (this.config.provider) {
        case 'smtp':
          return await this.sendWithSMTP(emailData, fromAddress)
        case 'resend':
          return await this.sendWithResend(emailData, fromAddress)
        default:
          throw new Error(`Unsupported email provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async sendWithSMTP(emailData: EmailData, fromAddress: string) {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized')
    }

    const result = await this.transporter.sendMail({
      from: fromAddress,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments
    })

    return {
      success: true,
      messageId: result.messageId
    }
  }

  private async sendWithResend(emailData: EmailData, fromAddress: string) {
    if (!this.resend) {
      throw new Error('Resend client not initialized')
    }

    const result = await this.resend.emails.send({
      from: fromAddress,
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    })

    return {
      success: true,
      messageId: result.data?.id
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'smtp':
          if (this.transporter) {
            await this.transporter.verify()
            return true
          }
          return false
        case 'resend':
          // Resend doesn't have a verify method, so we'll assume it's working if API key is set
          return !!this.config.resend?.apiKey
        default:
          return false
      }
    } catch (error) {
      console.error('Email connection verification failed:', error)
      return false
    }
  }
}

// Email templates
export const emailTemplates = {
  verificationRequest: (data: {
    lecturerName: string
    courseName: string
    classGroup: string
    sessionDate: string
    location: string
    classRepName: string
    verificationUrl: string
  }): EmailTemplate => ({
    subject: `Attendance Verification Required - ${data.courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Attendance Verification Required</h2>
        <p>Dear ${data.lecturerName},</p>
        <p>A class representative has submitted an attendance verification request for your session:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Session Details</h3>
          <p><strong>Course:</strong> ${data.courseName}</p>
          <p><strong>Class Group:</strong> ${data.classGroup}</p>
          <p><strong>Date & Time:</strong> ${data.sessionDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Submitted by:</strong> ${data.classRepName}</p>
        </div>
        
        <p>Please review and respond to this verification request:</p>
        <a href="${data.verificationUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Review Verification Request</a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from the UPSA Attendance Management System.
        </p>
      </div>
    `,
    text: `
      Attendance Verification Required
      
      Dear ${data.lecturerName},
      
      A class representative has submitted an attendance verification request for your session:
      
      Course: ${data.courseName}
      Class Group: ${data.classGroup}
      Date & Time: ${data.sessionDate}
      Location: ${data.location}
      Submitted by: ${data.classRepName}
      
      Please review and respond to this verification request: ${data.verificationUrl}
      
      This is an automated message from the UPSA Attendance Management System.
    `
  }),

  verificationStatusUpdate: (data: {
    classRepName: string
    courseName: string
    sessionDate: string
    status: string
    reviewNotes?: string
    dashboardUrl: string
  }): EmailTemplate => ({
    subject: `Verification ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} - ${data.courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Verification Request ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</h2>
        <p>Dear ${data.classRepName},</p>
        <p>Your attendance verification request has been <strong>${data.status}</strong>:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Session Details</h3>
          <p><strong>Course:</strong> ${data.courseName}</p>
          <p><strong>Date & Time:</strong> ${data.sessionDate}</p>
          <p><strong>Status:</strong> <span style="color: ${data.status === 'approved' ? '#059669' : data.status === 'rejected' ? '#dc2626' : '#d97706'}; font-weight: bold;">${data.status.toUpperCase()}</span></p>
          ${data.reviewNotes ? `<p><strong>Review Notes:</strong> ${data.reviewNotes}</p>` : ''}
        </div>
        
        <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Dashboard</a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated message from the UPSA Attendance Management System.
        </p>
      </div>
    `,
    text: `
      Verification Request ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}
      
      Dear ${data.classRepName},
      
      Your attendance verification request has been ${data.status}:
      
      Course: ${data.courseName}
      Date & Time: ${data.sessionDate}
      Status: ${data.status.toUpperCase()}
      ${data.reviewNotes ? `Review Notes: ${data.reviewNotes}` : ''}
      
      View your dashboard: ${data.dashboardUrl}
      
      This is an automated message from the UPSA Attendance Management System.
    `
  }),

  attendanceReminder: (data: {
    recipientName: string
    courseName: string
    sessionTime: string
    location: string
    sessionType: string
  }): EmailTemplate => ({
    subject: `Upcoming Class Session - ${data.courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Upcoming Class Session Reminder</h2>
        <p>Dear ${data.recipientName},</p>
        <p>This is a reminder about your upcoming class session:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Session Details</h3>
          <p><strong>Course:</strong> ${data.courseName}</p>
          <p><strong>Time:</strong> ${data.sessionTime}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Type:</strong> ${data.sessionType}</p>
        </div>
        
        <p>Please ensure you are prepared and arrive on time.</p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated reminder from the UPSA Attendance Management System.
        </p>
      </div>
    `,
    text: `
      Upcoming Class Session Reminder
      
      Dear ${data.recipientName},
      
      This is a reminder about your upcoming class session:
      
      Course: ${data.courseName}
      Time: ${data.sessionTime}
      Location: ${data.location}
      Type: ${data.sessionType}
      
      Please ensure you are prepared and arrive on time.
      
      This is an automated reminder from the UPSA Attendance Management System.
    `
  })
}

// Singleton instance
export const emailService = new EmailService()