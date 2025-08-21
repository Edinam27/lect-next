'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Download, Search, Shield, AlertTriangle, Activity, Users, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

interface AuditLog {
  id: string
  userId: string
  action: string
  targetType: string
  targetId: string
  metadata: any
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  riskScore?: number
  dataHash?: string
  timestamp: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

interface AuditAnalytics {
  totalLogs: number
  uniqueUsers: number
  topActions: { action: string; count: number }[]
  riskDistribution: { level: string; count: number }[]
  dailyActivity: { date: string; count: number }[]
  suspiciousActivity: number
}

interface AuditFilter {
  userId?: string
  action?: string
  targetType?: string
  startDate?: string
  endDate?: string
  riskScoreMin?: number
  riskScoreMax?: number
  limit: number
  offset: number
}

export default function AuditTrailDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AuditFilter>({
    limit: 50,
    offset: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('')
  const [selectedTargetType, setSelectedTargetType] = useState<string>('')
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchAuditLogs()
    fetchAnalytics()
  }, [filter])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/audit/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs)
        setTotal(data.data.total)
        setHasMore(data.data.hasMore)
      } else {
        setError(data.error || 'Failed to fetch audit logs')
      }
    } catch (err) {
      setError('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/audit/analytics?days=30')
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    }
  }

  const handleSearch = () => {
    setFilter(prev => ({
      ...prev,
      action: searchTerm || undefined,
      offset: 0
    }))
  }

  const handleRiskFilter = (riskLevel: string) => {
    let riskScoreMin: number | undefined
    let riskScoreMax: number | undefined

    switch (riskLevel) {
      case 'high':
        riskScoreMin = 8
        break
      case 'medium':
        riskScoreMin = 5
        riskScoreMax = 7
        break
      case 'low':
        riskScoreMin = 2
        riskScoreMax = 4
        break
      case 'minimal':
        riskScoreMax = 1
        break
      default:
        riskScoreMin = undefined
        riskScoreMax = undefined
    }

    setFilter(prev => ({
      ...prev,
      riskScoreMin,
      riskScoreMax,
      offset: 0
    }))
  }

  const handleTargetTypeFilter = (targetType: string) => {
    setFilter(prev => ({
      ...prev,
      targetType: targetType || undefined,
      offset: 0
    }))
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch('/api/audit/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format,
          filter: {
            userId: filter.userId,
            action: filter.action,
            targetType: filter.targetType,
            startDate: filter.startDate,
            endDate: filter.endDate,
            riskScoreMin: filter.riskScoreMin,
            riskScoreMax: filter.riskScoreMax
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError('Failed to export audit logs')
      }
    } catch (err) {
      setError('Failed to export audit logs')
    }
  }

  const loadMore = () => {
    setFilter(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }))
  }

  const getRiskBadgeColor = (riskScore?: number) => {
    if (!riskScore) return 'secondary'
    if (riskScore >= 8) return 'destructive'
    if (riskScore >= 5) return 'warning'
    if (riskScore >= 2) return 'default'
    return 'secondary'
  }

  const getRiskLevel = (riskScore?: number) => {
    if (!riskScore) return 'Unknown'
    if (riskScore >= 8) return 'High'
    if (riskScore >= 5) return 'Medium'
    if (riskScore >= 2) return 'Low'
    return 'Minimal'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit Trail Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalLogs.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.uniqueUsers}</div>
                  <p className="text-xs text-muted-foreground">Unique users with activity</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{analytics.suspiciousActivity}</div>
                  <p className="text-xs text-muted-foreground">High-risk actions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(analytics.totalLogs / 30)}
                  </div>
                  <p className="text-xs text-muted-foreground">Actions per day</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search actions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                <Select value={selectedRiskLevel} onValueChange={(value) => {
                  setSelectedRiskLevel(value)
                  handleRiskFilter(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Risk Levels</SelectItem>
                    <SelectItem value="high">High (8-10)</SelectItem>
                    <SelectItem value="medium">Medium (5-7)</SelectItem>
                    <SelectItem value="low">Low (2-4)</SelectItem>
                    <SelectItem value="minimal">Minimal (1)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedTargetType} onValueChange={(value) => {
                  setSelectedTargetType(value)
                  handleTargetTypeFilter(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Target Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="AttendanceRecord">Attendance Record</SelectItem>
                    <SelectItem value="VerificationRequest">Verification Request</SelectItem>
                    <SelectItem value="CourseSchedule">Course Schedule</SelectItem>
                    <SelectItem value="AuditLog">Audit Log</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Start Date"
                    onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value, offset: 0 }))}
                  />
                  <Input
                    type="date"
                    placeholder="End Date"
                    onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value, offset: 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Logs ({total.toLocaleString()} total)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading audit logs...</div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getRiskBadgeColor(log.riskScore)}>
                              {getRiskLevel(log.riskScore)}
                            </Badge>
                            <span className="font-medium">{log.action}</span>
                            <span className="text-sm text-muted-foreground">
                              on {log.targetType}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            by {log.user.firstName} {log.user.lastName} ({log.user.email})
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{format(new Date(log.timestamp), 'MMM dd, yyyy')}</div>
                          <div>{format(new Date(log.timestamp), 'HH:mm:ss')}</div>
                        </div>
                      </div>
                      
                      {log.metadata && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Target ID: {log.targetId}</span>
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                        {log.dataHash && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {hasMore && (
                    <div className="text-center">
                      <Button onClick={loadMore} variant="outline">
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.topActions.map((action, index) => (
                      <div key={action.action} className="flex justify-between items-center">
                        <span className="text-sm">{action.action}</span>
                        <Badge variant="secondary">{action.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.riskDistribution.map((risk) => (
                      <div key={risk.level} className="flex justify-between items-center">
                        <span className="text-sm">{risk.level} Risk</span>
                        <Badge 
                          variant={risk.level === 'High' ? 'destructive' : 
                                  risk.level === 'Medium' ? 'warning' : 'secondary'}
                        >
                          {risk.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}