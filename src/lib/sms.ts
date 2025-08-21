import twilio from 'twilio'

export interface SMSConfig {
  provider: 'twilio' | 'africastalking' | 'mock'
  twilio?: {
    accountSid: string
    authToken: string
    fromNumber: string
  }
  africastalking?: {
    username: string
    apiKey: string
    from: string
  }
}

export interface SMSData {
  to: string
  message: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface SMSTemplate {
  message: string
}

class SMSService {
  private config: SMSConfig
  private twilioClient: twilio.Twilio | null = null

  constructor() {
    this.config = this.getSMSConfig()
    this.initializeProvider()
  }

  private getSMSConfig(): SMSConfig {
    const provider = (process.env.SMS_PROVIDER || 'mock') as SMSConfig['provider']
    
    const config: SMSConfig = { provider }

    switch (provider) {
      case 'twilio':
        config.twilio = {
          accountSid: process.env.TWILIO_ACCOUNT_SID || '',
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          fromNumber: process.env.TWILIO_FROM_NUMBER || ''
        }
        break
      case 'africastalking':
        config.africastalking = {
          username: process.env.AFRICASTALKING_USERNAME || '',
          apiKey: process.env.AFRICASTALKING_API_KEY || '',
          from: process.env.AFRICASTALKING_FROM || ''
        }
        break
    }

    return config
  }

  private initializeProvider() {
    switch (this.config.provider) {
      case 'twilio':
        if (this.config.twilio?.accountSid && this.config.twilio?.authToken) {
          this.twilioClient = twilio(
            this.config.twilio.accountSid,
            this.config.twilio.authToken
          )
        }
        break
    }
  }

  async sendSMS(smsData: SMSData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate phone number format
      const phoneNumber = this.formatPhoneNumber(smsData.to)
      if (!phoneNumber) {
        throw new Error('Invalid phone number format')
      }

      switch (this.config.provider) {
        case 'twilio':
          return await this.sendWithTwilio({ ...smsData, to: phoneNumber })
        case 'mock':
          return await this.sendWithMock(smsData)
        default:
          throw new Error(`Unsupported SMS provider: ${this.config.provider}`)
      }
    } catch (error) {
      console.error('SMS sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async sendWithTwilio(smsData: SMSData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.twilioClient || !this.config.twilio?.fromNumber) {
      throw new Error('Twilio client not initialized or from number not configured')
    }

    const message = await this.twilioClient.messages.create({
      body: smsData.message,
      from: this.config.twilio.fromNumber,
      to: smsData.to
    })

    return {
      success: true,
      messageId: message.sid
    }
  }

  private async sendWithMock(smsData: SMSData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Mock implementation for development/testing
    console.log('Mock SMS sent:', {
      to: smsData.to,
      message: smsData.message,
      priority: smsData.priority
    })

    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  private formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // Ghana phone number validation and formatting
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // Convert local format (0XXXXXXXXX) to international (+233XXXXXXXXX)
      return `+233${cleaned.substring(1)}`
    } else if (cleaned.length === 12 && cleaned.startsWith('233')) {
      // Already in international format without +
      return `+${cleaned}`
    } else if (cleaned.length === 13 && cleaned.startsWith('+233')) {
      // Already in correct international format
      return cleaned
    } else if (cleaned.length >= 10) {
      // Assume it's a valid international number
      return `+${cleaned}`
    }
    
    return null
  }

  async verifyConnection(): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'twilio':
          if (this.twilioClient) {
            // Test the connection by fetching account info
            await this.twilioClient.api.accounts(this.config.twilio?.accountSid).fetch()
            return true
          }
          return false
        case 'mock':
          return true
        default:
          return false
      }
    } catch (error) {
      console.error('SMS connection verification failed:', error)
      return false
    }
  }

  async sendBulkSMS(recipients: string[], message: string, priority: SMSData['priority'] = 'normal'): Promise<{
    success: boolean
    results: Array<{ to: string; success: boolean; messageId?: string; error?: string }>
  }> {
    const results = await Promise.allSettled(
      recipients.map(async (to) => {
        const result = await this.sendSMS({ to, message, priority })
        return { to, ...result }
      })
    )

    const successfulSends = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length

    return {
      success: successfulSends > 0,
      results: results.map(result => 
        result.status === 'fulfilled' 
          ? result.value 
          : { to: '', success: false, error: 'Promise rejected' }
      )
    }
  }
}

// SMS templates
export const smsTemplates = {
  verificationUrgent: (data: {
    courseName: string
    sessionDate: string
    lecturerName: string
  }): SMSTemplate => ({
    message: `URGENT: Attendance verification required for ${data.courseName} on ${data.sessionDate}. Lecturer: ${data.lecturerName}. Please check your email or dashboard immediately.`
  }),

  verificationApproved: (data: {
    courseName: string
    sessionDate: string
  }): SMSTemplate => ({
    message: `Your attendance verification for ${data.courseName} on ${data.sessionDate} has been APPROVED. Thank you for your diligence.`
  }),

  verificationRejected: (data: {
    courseName: string
    sessionDate: string
  }): SMSTemplate => ({
    message: `Your attendance verification for ${data.courseName} on ${data.sessionDate} has been REJECTED. Please check your email for details and next steps.`
  }),

  attendanceReminder: (data: {
    courseName: string
    sessionTime: string
    location: string
  }): SMSTemplate => ({
    message: `Reminder: ${data.courseName} class at ${data.sessionTime} in ${data.location}. Please arrive on time.`
  }),

  systemAlert: (data: {
    alertType: string
    message: string
  }): SMSTemplate => ({
    message: `UPSA Alert [${data.alertType}]: ${data.message}`
  }),

  escalationAlert: (data: {
    courseName: string
    issueType: string
    reporterName: string
  }): SMSTemplate => ({
    message: `ESCALATION: ${data.issueType} reported for ${data.courseName} by ${data.reporterName}. Immediate attention required. Check dashboard.`
  })
}

// Singleton instance
export const smsService = new SMSService()