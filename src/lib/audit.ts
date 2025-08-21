import { prisma } from './db'
import crypto from 'crypto'
import { UserRole } from '@prisma/client'

export interface AuditLogData {
  userId: string
  action: string
  targetType: string
  targetId: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  riskScore?: number
}

export interface AuditLogFilter {
  userId?: string
  action?: string
  targetType?: string
  startDate?: Date
  endDate?: Date
  riskScoreMin?: number
  riskScoreMax?: number
  limit?: number
  offset?: number
}

export interface AuditAnalytics {
  totalLogs: number
  uniqueUsers: number
  topActions: { action: string; count: number }[]
  riskDistribution: { level: string; count: number }[]
  dailyActivity: { date: string; count: number }[]
  suspiciousActivity: number
}

export class AuditService {
  /**
   * Create an audit log entry with data integrity hash
   */
  static async createAuditLog(data: AuditLogData): Promise<void> {
    try {
      // Calculate risk score based on action and context
      const riskScore = this.calculateRiskScore(data)
      
      // Create data hash for integrity verification
      const dataHash = this.createDataHash(data)
      
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          sessionId: data.sessionId,
          riskScore,
          dataHash
        }
      })
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(filter: AuditLogFilter = {}) {
    const {
      userId,
      action,
      targetType,
      startDate,
      endDate,
      riskScoreMin,
      riskScoreMax,
      limit = 50,
      offset = 0
    } = filter

    const where: any = {}

    if (userId) where.userId = userId
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (targetType) where.targetType = targetType
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }
    if (riskScoreMin !== undefined || riskScoreMax !== undefined) {
      where.riskScore = {}
      if (riskScoreMin !== undefined) where.riskScore.gte = riskScoreMin
      if (riskScoreMax !== undefined) where.riskScore.lte = riskScoreMax
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.auditLog.count({ where })
    ])

    return {
      logs: logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null
      })),
      total,
      hasMore: offset + limit < total
    }
  }

  /**
   * Get audit analytics for dashboard
   */
  static async getAuditAnalytics(days: number = 30): Promise<AuditAnalytics> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [totalLogs, uniqueUsers, topActions, riskDistribution, dailyActivity, suspiciousActivity] = await Promise.all([
      // Total logs count
      prisma.auditLog.count({
        where: { timestamp: { gte: startDate } }
      }),
      
      // Unique users count
      prisma.auditLog.findMany({
        where: { timestamp: { gte: startDate } },
        select: { userId: true },
        distinct: ['userId']
      }).then(users => users.length),
      
      // Top actions
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: startDate } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }).then(actions => actions.map(a => ({ action: a.action, count: a._count.action }))),
      
      // Risk distribution
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN risk_score >= 8 THEN 'High'
            WHEN risk_score >= 5 THEN 'Medium'
            WHEN risk_score >= 2 THEN 'Low'
            ELSE 'Minimal'
          END as level,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= ${startDate}
        GROUP BY level
      ` as { level: string; count: bigint }[],
      
      // Daily activity
      prisma.$queryRaw`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM audit_logs 
        WHERE timestamp >= ${startDate}
        GROUP BY DATE(timestamp)
        ORDER BY date
      ` as { date: string; count: bigint }[],
      
      // Suspicious activity (high risk score)
      prisma.auditLog.count({
        where: {
          timestamp: { gte: startDate },
          riskScore: { gte: 7 }
        }
      })
    ])

    return {
      totalLogs,
      uniqueUsers,
      topActions,
      riskDistribution: riskDistribution.map(r => ({ level: r.level, count: Number(r.count) })),
      dailyActivity: dailyActivity.map(d => ({ date: d.date, count: Number(d.count) })),
      suspiciousActivity
    }
  }

  /**
   * Verify audit log integrity
   */
  static async verifyAuditLogIntegrity(logId: string): Promise<boolean> {
    try {
      const log = await prisma.auditLog.findUnique({
        where: { id: logId }
      })

      if (!log || !log.dataHash) return false

      const expectedHash = this.createDataHash({
        userId: log.userId,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        sessionId: log.sessionId || undefined,
        riskScore: log.riskScore || undefined
      })

      return log.dataHash === expectedHash
    } catch (error) {
      console.error('Failed to verify audit log integrity:', error)
      return false
    }
  }

  /**
   * Export audit logs for compliance
   */
  static async exportAuditLogs(filter: AuditLogFilter, format: 'csv' | 'json' = 'csv') {
    const { logs } = await this.getAuditLogs({ ...filter, limit: 10000 })
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2)
    }
    
    // CSV format
    const headers = ['ID', 'User ID', 'User Name', 'Action', 'Target Type', 'Target ID', 'Timestamp', 'Risk Score', 'IP Address']
    const rows = logs.map(log => [
      log.id,
      log.userId,
      `${log.user.firstName} ${log.user.lastName}`,
      log.action,
      log.targetType,
      log.targetId,
      log.timestamp.toISOString(),
      log.riskScore || 0,
      log.ipAddress || ''
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
        riskScore: { lt: 5 } // Keep high-risk logs longer
      }
    })

    return result.count
  }

  /**
   * Calculate risk score based on action and context
   */
  private static calculateRiskScore(data: AuditLogData): number {
    let score = 1 // Base score

    // High-risk actions
    const highRiskActions = [
      'USER_DELETED',
      'ROLE_CHANGED',
      'SYSTEM_CONFIG_CHANGED',
      'BULK_DELETE',
      'SECURITY_SETTING_CHANGED'
    ]
    
    const mediumRiskActions = [
      'ATTENDANCE_MODIFIED',
      'VERIFICATION_OVERRIDDEN',
      'SCHEDULE_DELETED',
      'USER_CREATED'
    ]

    if (highRiskActions.includes(data.action)) {
      score += 7
    } else if (mediumRiskActions.includes(data.action)) {
      score += 3
    } else if (data.action.includes('DELETE')) {
      score += 2
    } else if (data.action.includes('CREATE') || data.action.includes('UPDATE')) {
      score += 1
    }

    // Time-based risk (unusual hours)
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) {
      score += 1
    }

    // IP-based risk (could be enhanced with geolocation)
    if (data.ipAddress && data.ipAddress.startsWith('10.')) {
      score -= 1 // Internal network, lower risk
    }

    return Math.min(Math.max(score, 1), 10) // Clamp between 1-10
  }

  /**
   * Create data hash for integrity verification
   */
  private static createDataHash(data: AuditLogData): string {
    const hashData = {
      userId: data.userId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      metadata: data.metadata,
      timestamp: new Date().toISOString()
    }
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex')
  }
}

// Audit action constants
export const AUDIT_ACTIONS = {
  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  ROLE_CHANGED: 'ROLE_CHANGED',
  
  // Attendance
  ATTENDANCE_RECORDED: 'ATTENDANCE_RECORDED',
  ATTENDANCE_VERIFIED: 'ATTENDANCE_VERIFIED',
  ATTENDANCE_DISPUTED: 'ATTENDANCE_DISPUTED',
  ATTENDANCE_MODIFIED: 'ATTENDANCE_MODIFIED',
  
  // Verification
  VERIFICATION_REQUEST_CREATED: 'VERIFICATION_REQUEST_CREATED',
  VERIFICATION_REQUEST_UPDATED: 'VERIFICATION_REQUEST_UPDATED',
  VERIFICATION_OVERRIDDEN: 'VERIFICATION_OVERRIDDEN',
  
  // System
  SYSTEM_CONFIG_CHANGED: 'SYSTEM_CONFIG_CHANGED',
  BULK_IMPORT: 'BULK_IMPORT',
  BULK_DELETE: 'BULK_DELETE',
  SECURITY_SETTING_CHANGED: 'SECURITY_SETTING_CHANGED',
  
  // Schedules
  SCHEDULE_CREATED: 'SCHEDULE_CREATED',
  SCHEDULE_UPDATED: 'SCHEDULE_UPDATED',
  SCHEDULE_DELETED: 'SCHEDULE_DELETED',
  
  // Notifications
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  NOTIFICATION_PREFERENCES_UPDATED: 'NOTIFICATION_PREFERENCES_UPDATED'
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]