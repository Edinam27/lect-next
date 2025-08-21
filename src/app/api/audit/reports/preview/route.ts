import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { auditService } from '@/lib/audit'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'

const previewConfigSchema = z.object({
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

type PreviewConfig = z.infer<typeof previewConfigSchema>

// Generate preview HTML with sample data
function generatePreviewHTML(sampleLogs: any[], sampleAnalytics: any, config: PreviewConfig): string {
  const executiveSummary = config.includeExecutiveSummary ? `
    <section class="executive-summary">
      <h2>📊 Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Events</h3>
          <p class="metric">${sampleAnalytics.totalLogs.toLocaleString()}</p>
          <p class="trend">📈 +12% from last period</p>
        </div>
        <div class="summary-card">
          <h3>Active Users</h3>
          <p class="metric">${sampleAnalytics.uniqueUsers}</p>
          <p class="trend">👥 Across all roles</p>
        </div>
        <div class="summary-card">
          <h3>High Risk Events</h3>
          <p class="metric">${sampleAnalytics.suspiciousActivity}</p>
          <p class="trend">⚠️ Requires attention</p>
        </div>
        <div class="summary-card">
          <h3>Period</h3>
          <p class="metric">${format(parseISO(config.startDate), 'MMM dd')} - ${format(parseISO(config.endDate), 'MMM dd')}</p>
          <p class="trend">📅 ${Math.ceil((new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</p>
        </div>
      </div>
    </section>
  ` : ''
  
  const riskAnalysis = config.includeRiskAnalysis ? `
    <section class="risk-analysis">
      <h2>🛡️ Risk Analysis</h2>
      <div class="risk-distribution">
        ${sampleAnalytics.riskDistribution.map((risk: any) => `
          <div class="risk-item">
            <span class="risk-level risk-${risk.level.toLowerCase()}">${risk.level} Risk</span>
            <span class="risk-count">${risk.count} events</span>
            <div class="risk-bar">
              <div class="risk-fill risk-${risk.level.toLowerCase()}" style="width: ${(risk.count / sampleAnalytics.totalLogs) * 100}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="risk-insights">
        <h3>🔍 Key Insights</h3>
        <ul>
          <li>Most high-risk events occur during administrative operations</li>
          <li>User verification activities show normal risk patterns</li>
          <li>No suspicious login patterns detected in this period</li>
          <li>Data export activities are properly audited</li>
        </ul>
      </div>
    </section>
  ` : ''
  
  const complianceMetrics = config.includeComplianceMetrics ? `
    <section class="compliance-metrics">
      <h2>✅ Compliance Metrics</h2>
      <div class="compliance-grid">
        <div class="compliance-card">
          <h3>Data Integrity</h3>
          <div class="compliance-score">98.5%</div>
          <p>All audit logs verified with hash integrity</p>
        </div>
        <div class="compliance-card">
          <h3>Access Control</h3>
          <div class="compliance-score">100%</div>
          <p>All access attempts properly logged</p>
        </div>
        <div class="compliance-card">
          <h3>Retention Policy</h3>
          <div class="compliance-score">95.2%</div>
          <p>Logs retained according to policy</p>
        </div>
        <div class="compliance-card">
          <h3>Audit Coverage</h3>
          <div class="compliance-score">99.1%</div>
          <p>Critical operations fully audited</p>
        </div>
      </div>
    </section>
  ` : ''
  
  const topActions = sampleAnalytics.topActions.map((action: any, index: number) => `
    <tr>
      <td><span class="action-rank">#${index + 1}</span> ${action.action}</td>
      <td><span class="action-count">${action.count}</span></td>
      <td>
        <div class="action-bar">
          <div class="action-fill" style="width: ${(action.count / sampleAnalytics.topActions[0].count) * 100}%"></div>
        </div>
      </td>
    </tr>
  `).join('')
  
  const logRows = sampleLogs.slice(0, 20).map((log, index) => `
    <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
      <td>${format(new Date(log.timestamp), 'MMM dd, HH:mm')}</td>
      <td>
        <div class="user-info">
          <span class="user-name">${log.user.firstName} ${log.user.lastName}</span>
          <span class="user-role">${log.user.role}</span>
        </div>
      </td>
      <td><span class="action-badge">${log.action}</span></td>
      <td>${log.targetType}</td>
      <td><span class="risk-badge risk-${log.riskScore >= 8 ? 'high' : log.riskScore >= 5 ? 'medium' : 'low'}">${log.riskScore || 'N/A'}</span></td>
      <td class="ip-address">${log.ipAddress || 'N/A'}</td>
    </tr>
  `).join('')
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>📋 ${config.title} - Preview</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .preview-banner {
          background: linear-gradient(135deg, #ff6b6b, #feca57);
          color: white;
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .preview-banner h2 {
          margin: 0;
          font-size: 18px;
        }
        .report-container {
          background: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header .meta {
          margin-top: 15px;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .summary-card {
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          padding: 25px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s ease;
        }
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
          line-height: 1;
        }
        .trend {
          font-size: 12px;
          color: #64748b;
          margin: 8px 0 0 0;
        }
        .risk-distribution {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin: 20px 0;
        }
        .risk-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .risk-level {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          min-width: 80px;
          text-align: center;
        }
        .risk-high { background: #fee2e2; color: #dc2626; }
        .risk-medium { background: #fef3c7; color: #d97706; }
        .risk-low { background: #dcfce7; color: #16a34a; }
        .risk-minimal { background: #f3f4f6; color: #6b7280; }
        .risk-count {
          font-weight: 600;
          min-width: 80px;
        }
        .risk-bar {
          flex: 1;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .risk-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        .risk-fill.risk-high { background: #dc2626; }
        .risk-fill.risk-medium { background: #d97706; }
        .risk-fill.risk-low { background: #16a34a; }
        .risk-fill.risk-minimal { background: #6b7280; }
        .risk-insights {
          margin-top: 25px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        .risk-insights h3 {
          margin: 0 0 15px 0;
          color: #1e293b;
        }
        .risk-insights ul {
          list-style: none;
          padding: 0;
        }
        .risk-insights li {
          padding: 5px 0;
          color: #475569;
          position: relative;
          padding-left: 20px;
        }
        .risk-insights li:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #16a34a;
          font-weight: bold;
        }
        .compliance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .compliance-card {
          text-align: center;
          padding: 25px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border-radius: 12px;
          border: 1px solid #bae6fd;
        }
        .compliance-card h3 {
          margin: 0 0 15px 0;
          color: #0c4a6e;
          font-size: 14px;
          font-weight: 600;
        }
        .compliance-score {
          font-size: 36px;
          font-weight: 800;
          color: #0369a1;
          margin: 0 0 10px 0;
        }
        .compliance-card p {
          color: #075985;
          font-size: 12px;
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th {
          background: linear-gradient(135deg, #1e293b, #334155);
          color: white;
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr.even {
          background: #f8fafc;
        }
        tr:hover {
          background: #e2e8f0;
        }
        .action-rank {
          background: #3b82f6;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          margin-right: 8px;
        }
        .action-count {
          background: #e2e8f0;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 12px;
        }
        .action-bar {
          width: 100px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }
        .action-fill {
          height: 100%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          transition: width 0.3s ease;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .user-name {
          font-weight: 600;
          color: #1e293b;
        }
        .user-role {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .action-badge {
          background: #ddd6fe;
          color: #5b21b6;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .risk-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .ip-address {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 11px;
          color: #64748b;
        }
        section {
          margin: 40px 0;
        }
        h2 {
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
          margin-bottom: 20px;
          font-size: 20px;
          font-weight: 700;
        }
        .footer {
          margin-top: 50px;
          padding: 25px;
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          border-radius: 8px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }
        .footer p {
          margin: 5px 0;
        }
        .preview-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          color: #92400e;
          padding: 10px 15px;
          border-radius: 6px;
          margin: 20px 0;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="preview-banner">
          <h2>🔍 Report Preview - This is a sample with mock data</h2>
        </div>
        
        <div class="report-container">
          <div class="header">
            <h1>${config.title}</h1>
            <div class="meta">
              <p>📅 Generated on ${format(new Date(), 'MMMM dd, yyyy \\at HH:mm')}</p>
              ${config.description ? `<p>📝 ${config.description}</p>` : ''}
              <p>📊 Period: ${format(parseISO(config.startDate), 'MMMM dd, yyyy')} - ${format(parseISO(config.endDate), 'MMMM dd, yyyy')}</p>
            </div>
          </div>
          
          <div class="content">
            <div class="preview-note">
              ⚠️ <strong>Preview Mode:</strong> This preview shows sample data to demonstrate the report layout. The actual report will contain real audit data from your system.
            </div>
            
            ${executiveSummary}
            
            ${riskAnalysis}
            
            ${complianceMetrics}
            
            <section class="top-actions">
              <h2>📈 Top Actions</h2>
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Count</th>
                    <th>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  ${topActions}
                </tbody>
              </table>
            </section>
            
            <section class="recent-logs">
              <h2>📋 Recent Activity (Sample - Last 20 events)</h2>
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
              <p>📊 This preview contains ${sampleLogs.length} sample audit log entries</p>
              <p>🔒 Actual report will be generated from the UPSA Attendance Management System</p>
              <p>⚡ Report generated by the Enhanced Audit Trail System</p>
            </div>
          </div>
        </div>
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
    
    // Only allow ADMIN and ACADEMIC_COORDINATOR to preview reports
    if (!['ADMIN', 'ACADEMIC_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const config = previewConfigSchema.parse(body)
    
    // Generate sample data for preview
    const sampleLogs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@upsa.edu.gh', role: 'LECTURER' },
        action: 'ATTENDANCE_VERIFIED',
        targetType: 'AttendanceRecord',
        targetId: 'att_001',
        riskScore: 3,
        ipAddress: '192.168.1.100'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@upsa.edu.gh', role: 'CLASS_REP' },
        action: 'VERIFICATION_REQUEST_CREATED',
        targetType: 'VerificationRequest',
        targetId: 'vr_002',
        riskScore: 2,
        ipAddress: '192.168.1.101'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        user: { firstName: 'Admin', lastName: 'User', email: 'admin@upsa.edu.gh', role: 'ADMIN' },
        action: 'USER_CREATED',
        targetType: 'User',
        targetId: 'usr_003',
        riskScore: 5,
        ipAddress: '192.168.1.102'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        user: { firstName: 'Mary', lastName: 'Johnson', email: 'mary.johnson@upsa.edu.gh', role: 'ACADEMIC_COORDINATOR' },
        action: 'COURSE_UPDATED',
        targetType: 'Course',
        targetId: 'crs_004',
        riskScore: 4,
        ipAddress: '192.168.1.103'
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        user: { firstName: 'Bob', lastName: 'Wilson', email: 'bob.wilson@upsa.edu.gh', role: 'LECTURER' },
        action: 'ATTENDANCE_RECORDED',
        targetType: 'AttendanceRecord',
        targetId: 'att_005',
        riskScore: 1,
        ipAddress: '192.168.1.104'
      }
    ]
    
    // Duplicate and vary the sample logs to create more entries
    const expandedLogs = []
    for (let i = 0; i < 20; i++) {
      const baseLogs = sampleLogs.map((log, index) => ({
        ...log,
        id: `${log.id}_${i}_${index}`,
        timestamp: new Date(Date.now() - (i * 3600000) - (index * 600000)).toISOString(),
        targetId: `${log.targetId}_${i}_${index}`
      }))
      expandedLogs.push(...baseLogs)
    }
    
    const sampleAnalytics = {
      totalLogs: 1247,
      uniqueUsers: 23,
      suspiciousActivity: 3,
      topActions: [
        { action: 'ATTENDANCE_RECORDED', count: 456 },
        { action: 'ATTENDANCE_VERIFIED', count: 234 },
        { action: 'VERIFICATION_REQUEST_CREATED', count: 189 },
        { action: 'USER_UPDATED', count: 123 },
        { action: 'COURSE_UPDATED', count: 89 }
      ],
      riskDistribution: [
        { level: 'High', count: 12 },
        { level: 'Medium', count: 45 },
        { level: 'Low', count: 234 },
        { level: 'Minimal', count: 956 }
      ]
    }
    
    const previewHTML = generatePreviewHTML(expandedLogs.slice(0, 20), sampleAnalytics, config)
    
    return NextResponse.json({
      success: true,
      preview: previewHTML
    })
    
  } catch (error) {
    console.error('Preview generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}