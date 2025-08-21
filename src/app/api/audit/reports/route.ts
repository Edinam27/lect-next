import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { auditService } from '@/lib/audit'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'

const reportConfigSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  includeUserActivity: z.boolean().default(true),
  includeSecurityEvents: z.boolean().default(true),
  includeDataChanges: z.boolean().default(true),
  includeSystemEvents: z.boolean().default(false),
  includeRiskAnalysis: z.boolean().default(true),
  includeComplianceMetrics: z.boolean().default(true),
  filterByRiskLevel: z.array(z.string()).default([]),
  filterByUserRoles: z.array(z.string()).default([]),
  filterByActions: z.array(z.string()).default([]),
  groupBy: z.enum(['day', 'week', 'month', 'user', 'action']).default('day'),
  format: z.enum(['pdf', 'csv', 'json', 'html']).default('pdf'),
  includeCharts: z.boolean().default(true),
  includeExecutiveSummary: z.boolean().default(true)
})

type ReportConfig = z.infer<typeof reportConfigSchema>

// Generate CSV format
function generateCSV(logs: any[], config: ReportConfig): string {
  const headers = [
    'Timestamp',
    'User',
    'Action',
    'Target Type',
    'Target ID',
    'Risk Score',
    'IP Address',
    'User Agent'
  ]
  
  const rows = logs.map(log => [
    format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    `${log.user.firstName} ${log.user.lastName} (${log.user.email})`,
    log.action,
    log.targetType,
    log.targetId,
    log.riskScore || 'N/A',
    log.ipAddress || 'N/A',
    log.userAgent || 'N/A'
  ])
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
}

// Generate JSON format
function generateJSON(logs: any[], analytics: any, config: ReportConfig): string {
  return JSON.stringify({
    report: {
      title: config.title,
      description: config.description,
      generatedAt: new Date().toISOString(),
      period: {
        startDate: config.startDate,
        endDate: config.endDate
      },
      config,
      analytics,
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        user: {
          id: log.user.id,
          name: `${log.user.firstName} ${log.user.lastName}`,
          email: log.user.email,
          role: log.user.role
        },
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        riskScore: log.riskScore,
        ipAddress: log.ipAddress,
        metadata: log.metadata
      }))
    }
  }, null, 2)
}

// Generate HTML format
function generateHTML(logs: any[], analytics: any, config: ReportConfig): string {
  const executiveSummary = config.includeExecutiveSummary ? `
    <section class="executive-summary">
      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Events</h3>
          <p class="metric">${analytics.totalLogs.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h3>Active Users</h3>
          <p class="metric">${analytics.uniqueUsers}</p>
        </div>
        <div class="summary-card">
          <h3>High Risk Events</h3>
          <p class="metric">${analytics.suspiciousActivity}</p>
        </div>
        <div class="summary-card">
          <h3>Period</h3>
          <p class="metric">${format(parseISO(config.startDate), 'MMM dd')} - ${format(parseISO(config.endDate), 'MMM dd, yyyy')}</p>
        </div>
      </div>
    </section>
  ` : ''
  
  const riskAnalysis = config.includeRiskAnalysis ? `
    <section class="risk-analysis">
      <h2>Risk Analysis</h2>
      <div class="risk-distribution">
        ${analytics.riskDistribution.map((risk: any) => `
          <div class="risk-item">
            <span class="risk-level risk-${risk.level.toLowerCase()}">${risk.level} Risk</span>
            <span class="risk-count">${risk.count} events</span>
          </div>
        `).join('')}
      </div>
    </section>
  ` : ''
  
  const topActions = analytics.topActions.map((action: any) => `
    <tr>
      <td>${action.action}</td>
      <td>${action.count}</td>
    </tr>
  `).join('')
  
  const logRows = logs.slice(0, 100).map(log => `
    <tr>
      <td>${format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}</td>
      <td>${log.user.firstName} ${log.user.lastName}</td>
      <td>${log.action}</td>
      <td>${log.targetType}</td>
      <td><span class="risk-badge risk-${log.riskScore >= 8 ? 'high' : log.riskScore >= 5 ? 'medium' : 'low'}">${log.riskScore || 'N/A'}</span></td>
      <td>${log.ipAddress || 'N/A'}</td>
    </tr>
  `).join('')
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #1f2937;
        }
        .header .meta {
          color: #6b7280;
          margin-top: 10px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .summary-card {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
        }
        .metric {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin: 0;
        }
        .risk-distribution {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin: 20px 0;
        }
        .risk-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 15px;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .risk-level {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .risk-high { background: #fee2e2; color: #dc2626; }
        .risk-medium { background: #fef3c7; color: #d97706; }
        .risk-low { background: #dcfce7; color: #16a34a; }
        .risk-minimal { background: #f3f4f6; color: #6b7280; }
        .risk-badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        tr:hover {
          background: #f9fafb;
        }
        section {
          margin: 40px 0;
        }
        h2 {
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${config.title}</h1>
        <div class="meta">
          <p>Generated on ${format(new Date(), 'MMMM dd, yyyy \\at HH:mm')}</p>
          ${config.description ? `<p>${config.description}</p>` : ''}
          <p>Period: ${format(parseISO(config.startDate), 'MMMM dd, yyyy')} - ${format(parseISO(config.endDate), 'MMMM dd, yyyy')}</p>
        </div>
      </div>
      
      ${executiveSummary}
      
      ${riskAnalysis}
      
      <section class="top-actions">
        <h2>Top Actions</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${topActions}
          </tbody>
        </table>
      </section>
      
      <section class="recent-logs">
        <h2>Recent Activity (Last 100 events)</h2>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
              <th>Risk</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            ${logRows}
          </tbody>
        </table>
      </section>
      
      <div class="footer">
        <p>This report contains ${logs.length.toLocaleString()} audit log entries from the UPSA Attendance Management System.</p>
        <p>Report generated by the Audit Trail System - Confidential</p>
      </div>
    </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only allow ADMIN to generate reports
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const config = reportConfigSchema.parse(body)
    
    // Build filter for audit logs
    const filter = {
      startDate: config.startDate,
      endDate: config.endDate,
      riskScoreMin: config.filterByRiskLevel.includes('High') ? 8 : 
                   config.filterByRiskLevel.includes('Medium') ? 5 : undefined,
      riskScoreMax: config.filterByRiskLevel.includes('Low') ? 4 : undefined,
      limit: 10000, // Large limit for reports
      offset: 0
    }
    
    // Add role filter if specified
    if (config.filterByUserRoles.length > 0) {
      // This would need to be implemented in the audit service
      // filter.userRoles = config.filterByUserRoles
    }
    
    // Add action filter if specified
    if (config.filterByActions.length > 0) {
      // This would need to be implemented in the audit service
      // filter.actions = config.filterByActions
    }
    
    // Fetch audit logs and analytics
    const [logsResult, analytics] = await Promise.all([
      auditService.getAuditLogs(filter),
      auditService.getAuditAnalytics(30) // Last 30 days for analytics
    ])
    
    const logs = logsResult.logs
    
    // Generate report based on format
    let content: string
    let contentType: string
    let filename: string
    
    switch (config.format) {
      case 'csv':
        content = generateCSV(logs, config)
        contentType = 'text/csv'
        filename = `${config.title.toLowerCase().replace(/\s+/g, '-')}.csv`
        break
        
      case 'json':
        content = generateJSON(logs, analytics, config)
        contentType = 'application/json'
        filename = `${config.title.toLowerCase().replace(/\s+/g, '-')}.json`
        break
        
      case 'html':
        content = generateHTML(logs, analytics, config)
        contentType = 'text/html'
        filename = `${config.title.toLowerCase().replace(/\s+/g, '-')}.html`
        break
        
      case 'pdf':
      default:
        // For PDF, we'll return HTML that can be converted to PDF on the client side
        content = generateHTML(logs, analytics, config)
        contentType = 'text/html'
        filename = `${config.title.toLowerCase().replace(/\s+/g, '-')}.html`
        break
    }
    
    // Create audit log for report generation
    await auditService.createAuditLog({
      userId: session.user.id,
      action: 'AUDIT_REPORT_GENERATED',
      targetType: 'AuditReport',
      targetId: 'report-' + Date.now(),
      metadata: {
        reportTitle: config.title,
        format: config.format,
        period: {
          startDate: config.startDate,
          endDate: config.endDate
        },
        recordCount: logs.length
      },
      riskScore: 3 // Medium risk for report generation
    })
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('Report generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}