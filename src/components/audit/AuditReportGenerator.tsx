'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Calendar, Download, FileText, Settings, Clock, Users, Shield, TrendingUp } from 'lucide-react'
import { format, subDays, subMonths, subYears } from 'date-fns'

interface ReportConfig {
  title: string
  description: string
  startDate: string
  endDate: string
  includeUserActivity: boolean
  includeSecurityEvents: boolean
  includeDataChanges: boolean
  includeSystemEvents: boolean
  includeRiskAnalysis: boolean
  includeComplianceMetrics: boolean
  filterByRiskLevel: string[]
  filterByUserRoles: string[]
  filterByActions: string[]
  groupBy: 'day' | 'week' | 'month' | 'user' | 'action'
  format: 'pdf' | 'csv' | 'json' | 'html'
  includeCharts: boolean
  includeExecutiveSummary: boolean
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  config: Partial<ReportConfig>
}

const PREDEFINED_TEMPLATES: ReportTemplate[] = [
  {
    id: 'security-audit',
    name: 'Security Audit Report',
    description: 'Comprehensive security audit with risk analysis',
    config: {
      includeSecurityEvents: true,
      includeRiskAnalysis: true,
      filterByRiskLevel: ['High', 'Medium'],
      includeCharts: true,
      includeExecutiveSummary: true,
      format: 'pdf'
    }
  },
  {
    id: 'compliance-monthly',
    name: 'Monthly Compliance Report',
    description: 'Monthly compliance and activity summary',
    config: {
      includeUserActivity: true,
      includeComplianceMetrics: true,
      includeDataChanges: true,
      groupBy: 'week',
      format: 'pdf',
      includeExecutiveSummary: true
    }
  },
  {
    id: 'user-activity',
    name: 'User Activity Report',
    description: 'Detailed user activity and behavior analysis',
    config: {
      includeUserActivity: true,
      groupBy: 'user',
      includeCharts: true,
      format: 'html'
    }
  },
  {
    id: 'data-export',
    name: 'Data Export Report',
    description: 'Raw data export for external analysis',
    config: {
      includeUserActivity: true,
      includeSecurityEvents: true,
      includeDataChanges: true,
      includeSystemEvents: true,
      format: 'csv'
    }
  }
]

const RISK_LEVELS = ['Minimal', 'Low', 'Medium', 'High']
const USER_ROLES = ['ADMIN', 'ACADEMIC_COORDINATOR', 'LECTURER', 'CLASS_REP']
const COMMON_ACTIONS = [
  'ATTENDANCE_RECORDED',
  'ATTENDANCE_VERIFIED',
  'VERIFICATION_REQUEST_CREATED',
  'VERIFICATION_REQUEST_UPDATED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'COURSE_CREATED',
  'COURSE_UPDATED',
  'SCHEDULE_CREATED',
  'SCHEDULE_UPDATED'
]

export default function AuditReportGenerator() {
  const [config, setConfig] = useState<ReportConfig>({
    title: 'Audit Report',
    description: '',
    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    includeUserActivity: true,
    includeSecurityEvents: true,
    includeDataChanges: true,
    includeSystemEvents: false,
    includeRiskAnalysis: true,
    includeComplianceMetrics: true,
    filterByRiskLevel: [],
    filterByUserRoles: [],
    filterByActions: [],
    groupBy: 'day',
    format: 'pdf',
    includeCharts: true,
    includeExecutiveSummary: true
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleTemplateSelect = (templateId: string) => {
    const template = PREDEFINED_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setConfig(prev => ({
        ...prev,
        ...template.config,
        title: template.name,
        description: template.description
      }))
    }
  }

  const handleQuickDateRange = (range: string) => {
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case 'last-7-days':
        startDate = subDays(now, 7)
        break
      case 'last-30-days':
        startDate = subDays(now, 30)
        break
      case 'last-3-months':
        startDate = subMonths(now, 3)
        break
      case 'last-6-months':
        startDate = subMonths(now, 6)
        break
      case 'last-year':
        startDate = subYears(now, 1)
        break
      default:
        return
    }
    
    setConfig(prev => ({
      ...prev,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd')
    }))
  }

  const handleArrayFilter = (field: keyof ReportConfig, value: string, checked: boolean) => {
    setConfig(prev => {
      const currentArray = prev[field] as string[]
      const newArray = checked 
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value)
      
      return {
        ...prev,
        [field]: newArray
      }
    })
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/audit/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${config.title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.${config.format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setSuccess('Report generated and downloaded successfully!')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to generate report')
      }
    } catch (err) {
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const previewReport = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/audit/reports/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        const data = await response.json()
        // Open preview in new window
        const previewWindow = window.open('', '_blank')
        if (previewWindow) {
          previewWindow.document.write(data.preview)
          previewWindow.document.close()
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to generate preview')
      }
    } catch (err) {
      setError('Failed to generate preview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit Report Generator</h1>
        <div className="flex gap-2">
          <Button onClick={previewReport} variant="outline" disabled={loading}>
            <FileText className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={generateReport} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Report Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PREDEFINED_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Report Title</Label>
                  <Input
                    id="title"
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="format">Output Format</Label>
                  <Select value={config.format} onValueChange={(value: any) => setConfig(prev => ({ ...prev, format: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional report description..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Last 7 Days', value: 'last-7-days' },
                  { label: 'Last 30 Days', value: 'last-30-days' },
                  { label: 'Last 3 Months', value: 'last-3-months' },
                  { label: 'Last 6 Months', value: 'last-6-months' },
                  { label: 'Last Year', value: 'last-year' }
                ].map((range) => (
                  <Button
                    key={range.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateRange(range.value)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={config.startDate}
                    onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={config.endDate}
                    onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Sections */}
          <Card>
            <CardHeader>
              <CardTitle>Content Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'includeUserActivity', label: 'User Activity', icon: Users },
                  { key: 'includeSecurityEvents', label: 'Security Events', icon: Shield },
                  { key: 'includeDataChanges', label: 'Data Changes', icon: FileText },
                  { key: 'includeSystemEvents', label: 'System Events', icon: Settings },
                  { key: 'includeRiskAnalysis', label: 'Risk Analysis', icon: TrendingUp },
                  { key: 'includeComplianceMetrics', label: 'Compliance Metrics', icon: Badge }
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={config[key as keyof ReportConfig] as boolean}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, [key]: checked }))}
                    />
                    <Label htmlFor={key} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={config.includeCharts}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: checked }))}
                  />
                  <Label htmlFor="includeCharts">Include Charts & Graphs</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeExecutiveSummary"
                    checked={config.includeExecutiveSummary}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeExecutiveSummary: checked }))}
                  />
                  <Label htmlFor="includeExecutiveSummary">Executive Summary</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Risk Levels</Label>
                <div className="space-y-2 mt-2">
                  {RISK_LEVELS.map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={`risk-${level}`}
                        checked={config.filterByRiskLevel.includes(level)}
                        onCheckedChange={(checked) => handleArrayFilter('filterByRiskLevel', level, checked as boolean)}
                      />
                      <Label htmlFor={`risk-${level}`}>{level}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>User Roles</Label>
                <div className="space-y-2 mt-2">
                  {USER_ROLES.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={config.filterByUserRoles.includes(role)}
                        onCheckedChange={(checked) => handleArrayFilter('filterByUserRoles', role, checked as boolean)}
                      />
                      <Label htmlFor={`role-${role}`}>{role.replace('_', ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Actions</Label>
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {COMMON_ACTIONS.map((action) => (
                    <div key={action} className="flex items-center space-x-2">
                      <Checkbox
                        id={`action-${action}`}
                        checked={config.filterByActions.includes(action)}
                        onCheckedChange={(checked) => handleArrayFilter('filterByActions', action, checked as boolean)}
                      />
                      <Label htmlFor={`action-${action}`} className="text-sm">
                        {action.replace(/_/g, ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grouping */}
          <Card>
            <CardHeader>
              <CardTitle>Grouping & Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="groupBy">Group By</Label>
                <Select value={config.groupBy} onValueChange={(value: any) => setConfig(prev => ({ ...prev, groupBy: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}