import { Coordinates } from './geolocation'

// Virtual classroom verification configuration
const VIRTUAL_TIME_WINDOW_MINUTES = 15 // Allow ±15 minutes from scheduled time
const MINIMUM_SESSION_DURATION_PERCENTAGE = 0.75 // 75% of scheduled duration
const MEETING_LINK_TIMEOUT_MS = 5000 // 5 seconds timeout for link verification

export interface VirtualVerificationResult {
  verified: boolean
  timeWindowVerified: boolean
  meetingLinkVerified: boolean
  sessionDurationMet: boolean
  errors: string[]
}

export interface SessionTimeInfo {
  scheduledStart: Date
  scheduledEnd: Date
  currentTime: Date
  allowedStartTime: Date
  allowedEndTime: Date
}

/**
 * Verify if current time is within allowed window for virtual class
 */
export function verifyTimeWindow(scheduledStartTime: string, scheduledEndTime: string): {
  verified: boolean
  timeInfo: SessionTimeInfo
  error?: string
} {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const scheduledStart = new Date(`${today}T${scheduledStartTime}`)
    const scheduledEnd = new Date(`${today}T${scheduledEndTime}`)
    
    // Allow attendance marking from 15 minutes before to 15 minutes after scheduled start
    const allowedStartTime = new Date(scheduledStart.getTime() - VIRTUAL_TIME_WINDOW_MINUTES * 60 * 1000)
    const allowedEndTime = new Date(scheduledStart.getTime() + VIRTUAL_TIME_WINDOW_MINUTES * 60 * 1000)
    
    const timeInfo: SessionTimeInfo = {
      scheduledStart,
      scheduledEnd,
      currentTime: now,
      allowedStartTime,
      allowedEndTime
    }
    
    const isWithinWindow = now >= allowedStartTime && now <= allowedEndTime
    
    return {
      verified: isWithinWindow,
      timeInfo,
      error: isWithinWindow ? undefined : `Current time is outside allowed window. Class can be started between ${allowedStartTime.toLocaleTimeString()} and ${allowedEndTime.toLocaleTimeString()}`
    }
  } catch (error) {
    return {
      verified: false,
      timeInfo: {} as SessionTimeInfo,
      error: 'Invalid time format'
    }
  }
}

/**
 * Verify if meeting link is accessible
 */
export async function verifyMeetingLink(meetingLink: string): Promise<{
  verified: boolean
  error?: string
}> {
  if (!meetingLink) {
    return {
      verified: false,
      error: 'No meeting link provided'
    }
  }

  try {
    // Basic URL validation
    const url = new URL(meetingLink)
    
    // Check if it's a known meeting platform
    const supportedDomains = [
      'zoom.us',
      'meet.google.com',
      'teams.microsoft.com',
      'teams.live.com',
      'webex.com',
      'gotomeeting.com'
    ]
    
    const isKnownPlatform = supportedDomains.some(domain => 
      url.hostname.includes(domain)
    )
    
    if (!isKnownPlatform) {
      return {
        verified: false,
        error: 'Meeting link must be from a supported platform (Zoom, Google Meet, Teams, WebEx, GoToMeeting)'
      }
    }

    // For known platforms, we'll trust the URL format validation
    // Skip HTTP verification to avoid CORS issues and network dependencies
    return {
      verified: true,
      error: undefined
    }
  } catch (error) {
    return {
      verified: false,
      error: 'Invalid meeting link format'
    }
  }
}

/**
 * Check if session duration meets minimum requirements
 */
export function verifySessionDuration(
  sessionStartTime: Date,
  sessionEndTime: Date,
  scheduledStartTime: string,
  scheduledEndTime: string
): {
  verified: boolean
  actualDurationMinutes: number
  requiredDurationMinutes: number
  error?: string
} {
  try {
    const actualDurationMs = sessionEndTime.getTime() - sessionStartTime.getTime()
    const actualDurationMinutes = Math.floor(actualDurationMs / (1000 * 60))
    
    // Calculate scheduled duration
    const [startHour, startMin] = scheduledStartTime.split(':').map(Number)
    const [endHour, endMin] = scheduledEndTime.split(':').map(Number)
    const scheduledDurationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    
    const requiredDurationMinutes = Math.floor(scheduledDurationMinutes * MINIMUM_SESSION_DURATION_PERCENTAGE)
    
    const verified = actualDurationMinutes >= requiredDurationMinutes
    
    return {
      verified,
      actualDurationMinutes,
      requiredDurationMinutes,
      error: verified ? undefined : `Session duration (${actualDurationMinutes} min) is less than required minimum (${requiredDurationMinutes} min)`
    }
  } catch (error) {
    return {
      verified: false,
      actualDurationMinutes: 0,
      requiredDurationMinutes: 0,
      error: 'Error calculating session duration'
    }
  }
}

/**
 * Generate device fingerprint for tracking consistency
 */
export function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
  // Simple fingerprint based on user agent and IP
  // In production, you might want to use more sophisticated fingerprinting
  const combined = `${userAgent}|${ipAddress}`
  
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Comprehensive virtual classroom verification
 */
export async function verifyVirtualClassroom({
  meetingLink,
  scheduledStartTime,
  scheduledEndTime,
  sessionStartTime,
  sessionEndTime,
  userAgent,
  ipAddress
}: {
  meetingLink: string
  scheduledStartTime: string
  scheduledEndTime: string
  sessionStartTime?: Date
  sessionEndTime?: Date
  userAgent: string
  ipAddress: string
}): Promise<VirtualVerificationResult> {
  const errors: string[] = []
  
  // Verify time window
  const timeVerification = verifyTimeWindow(scheduledStartTime, scheduledEndTime)
  if (!timeVerification.verified && timeVerification.error) {
    errors.push(timeVerification.error)
  }
  
  // Verify meeting link
  const linkVerification = await verifyMeetingLink(meetingLink)
  if (!linkVerification.verified && linkVerification.error) {
    errors.push(linkVerification.error)
  }
  
  // Verify session duration (only if session has ended)
  let sessionDurationMet = true
  if (sessionStartTime && sessionEndTime) {
    const durationVerification = verifySessionDuration(
      sessionStartTime,
      sessionEndTime,
      scheduledStartTime,
      scheduledEndTime
    )
    sessionDurationMet = durationVerification.verified
    if (!durationVerification.verified && durationVerification.error) {
      errors.push(durationVerification.error)
    }
  }
  
  const allVerified = timeVerification.verified && linkVerification.verified && sessionDurationMet
  
  return {
    verified: allVerified,
    timeWindowVerified: timeVerification.verified,
    meetingLinkVerified: linkVerification.verified,
    sessionDurationMet,
    errors
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIpAddress(headers: Headers): string {
  // Check various headers that might contain the real IP
  const possibleHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]
  
  for (const header of possibleHeaders) {
    const value = headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim()
    }
  }
  
  // Fallback to a default value if no IP found
  return 'unknown'
}