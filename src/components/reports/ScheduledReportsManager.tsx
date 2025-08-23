'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface ScheduledReport {
  id: string
  name: string
  description?: string
  reportType: string
  format: string
  schedule: string
  parameters: string
  recipients: string
  isActive: boolean
  nextRun?: string
  lastRun?: string
  runCount: number
  lastError?: string
  creator: {
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface ServiceStatus {
  isRunning: boolean
  nextCheck?: string
}

interface ServiceStatistics {
  totalScheduledReports: number
  activeScheduledReports: number
  totalReportsGenerated: number
  reportsGeneratedToday: number
  nextDueReport?: {
    id: string
    name: string
    nextRun: string
  }
}

const scheduledReportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  reportType: z.string().min(1, 'Report type is required'),
  format: z.enum(['csv', 'pdf', 'excel', 'json']),
  schedule: z.string().min(1, 'Schedule is required'),
  recipients: z.string().min(1, 'At least one recipient is required'),
  isActive: z.boolean().default(true),
  parameters: z.object({
    dateRange: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }).optional(),
    lecturerId: z.string().optional(),
    courseId: z.string().optional(),
    classGroupId: z.string().optional(),
    includeDetails: z.boolean().default(false)
  }).optional()
})

type ScheduledReportFormData = z.infer<typeof scheduledReportSchema>

const SCHEDULE_PRESETS = [
  { value: '0 9 * * *', label: 'Daily at 9:00 AM' },
  { value: '0 9 * * 1', label: 'Weekly on Monday at 9:00 AM' },
  { value: '0 9 1 * *', label: 'Monthly on 1st at 9:00 AM' },
  { value: '0 9 1 1,4,7,10 *', label: 'Quarterly on 1st at 9:00 AM' }
]

const REPORT_TYPES = [
  { value: 'attendanceOverview', label: 'Attendance Overview' },
  { value: 'lecturerPerformance', label: 'Lecturer Performance' }
]

const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
  { value: 'json', label: 'JSON' }
]

export default function ScheduledReportsManager() {
  const { data: session } = useSession()
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null)
  const [serviceStatistics, setServiceStatistics] = useState<ServiceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const form = useForm<ScheduledReportFormData>({
    resolver: zodResolver(scheduledReportSchema),
    defaultValues: {
      name: '',
      description: '',
      reportType: '',
      format: 'csv',
      schedule: '',
      recipients: '',
      isActive: true,
      parameters: {
        includeDetails: false
      }
    }
  })

  const fetchScheduledReports = async () => {
    try {
      const response = await fetch('/api/reports/scheduled')
      if (response.ok) {
        const data = await response.json()
        setScheduledReports(data.scheduledReports || [])
      }
    } catch (error) {
      console.error('Error fetching scheduled reports:', error)
      toast.error('Failed to fetch scheduled reports')
    }
  }

  const fetchServiceStatus = async () => {
    try {
      const response = await fetch('/api/reports/scheduled/service')
      if (response.ok) {
        const data = await response.json()
        setServiceStatus(data.status)
        setServiceStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Error fetching service status:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchScheduledReports(), fetchServiceStatus()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleSubmit = async (data: ScheduledReportFormData) => {
    try {
      setActionLoading('submit')
      
      const payload = {
        ...data,
        recipients: data.recipients.split(',').map(email => email.trim()),
        parameters: JSON.stringify(data.parameters || {})
      }

      const url = editingReport 
        ? `/api/reports/scheduled/${editingReport.id}`
        : '/api/reports/scheduled'
      
      const method = editingReport ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(editingReport ? 'Scheduled report updated' : 'Scheduled report created')
        setDialogOpen(false)
        setEditingReport(null)
        form.reset()
        await fetchScheduledReports()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save scheduled report')
      }
    } catch (error) {
      console.error('Error saving scheduled report:', error)
      toast.error('Failed to save scheduled report')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEdit = (report: ScheduledReport) => {
    setEditingReport(report)
    const parameters = JSON.parse(report.parameters || '{}')
    const recipients = JSON.parse(report.recipients || '[]').join(', ')
    
    form.reset({
      name: report.name,
      description: report.description || '',
      reportType: report.reportType,
      format: report.format as any,
      schedule: report.schedule,
      recipients,
      isActive: report.isActive,
      parameters
    })
    setDialogOpen(true)
  }

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return
    }

    try {
      setActionLoading(reportId)
      const response = await fetch(`/api/reports/scheduled/${reportId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Scheduled report deleted')
        await fetchScheduledReports()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete scheduled report')
      }
    } catch (error) {
      console.error('Error deleting scheduled report:', error)
      toast.error('Failed to delete scheduled report')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTrigger = async (reportId: string) => {
    try {
      setActionLoading(reportId)
      const response = await fetch(`/api/reports/scheduled/${reportId}/trigger`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Report generation triggered successfully')
        await fetchScheduledReports()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to trigger report generation')
      }
    } catch (error) {
      console.error('Error triggering report:', error)
      toast.error('Failed to trigger report generation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleServiceControl = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setActionLoading(action)
      const response = await fetch('/api/reports/scheduled/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        await fetchServiceStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to ${action} service`)
      }
    } catch (error) {
      console.error(`Error ${action}ing service:`, error)
      toast.error(`Failed to ${action} service`)
    } finally {
      setActionLoading(null)
    }
  }

  const formatNextRun = (dateString?: string) => {
    if (!dateString) return 'Not scheduled'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`
    } else if (diffHours > 0) {
      return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`
    } else if (diffMs > 0) {
      return 'Soon'
    } else {
      return 'Overdue'
    }
  }

  const getStatusBadge = (report: ScheduledReport) => {
    if (!report.isActive) {
      return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Inactive</Badge>
    }
    if (report.lastError) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>
    }
    if (report.lastRun) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Status Card */}
      {session?.user?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scheduled Reports Service</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceControl('restart')}
                  disabled={actionLoading === 'restart'}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading === 'restart' ? 'animate-spin' : ''}`} />
                  Restart
                </Button>
                {serviceStatus?.isRunning ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleServiceControl('stop')}
                    disabled={actionLoading === 'stop'}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleServiceControl('start')}
                    disabled={actionLoading === 'start'}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Status: {serviceStatus?.isRunning ? (
                <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Running</Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Stopped</Badge>
              )}
            </CardDescription>
          </CardHeader>
          {serviceStatistics && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatistics.totalScheduledReports}</div>
                  <div className="text-sm text-muted-foreground">Total Scheduled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatistics.activeScheduledReports}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatistics.totalReportsGenerated}</div>
                  <div className="text-sm text-muted-foreground">Total Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{serviceStatistics.reportsGeneratedToday}</div>
                  <div className="text-sm text-muted-foreground">Generated Today</div>
                </div>
              </div>
              {serviceStatistics.nextDueReport && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Next Due Report:</div>
                  <div className="text-sm text-muted-foreground">
                    {serviceStatistics.nextDueReport.name} - {formatNextRun(serviceStatistics.nextDueReport.nextRun)}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Scheduled Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scheduled Reports</span>
            {['ADMIN', 'COORDINATOR'].includes(session?.user?.role || '') && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingReport(null); form.reset(); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Scheduled Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure automatic report generation and delivery
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Report Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Weekly Attendance Report" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Optional description..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="reportType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Report Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {REPORT_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="format"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Format</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {FORMATS.map(format => (
                                    <SelectItem key={format.value} value={format.value}>
                                      {format.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="schedule"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select schedule" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SCHEDULE_PRESETS.map(preset => (
                                  <SelectItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose when the report should be generated automatically
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="recipients"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipients</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="email1@example.com, email2@example.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated list of email addresses
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active</FormLabel>
                              <FormDescription>
                                Enable automatic report generation
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={actionLoading === 'submit'}>
                          {actionLoading === 'submit' && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                          {editingReport ? 'Update' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled reports found. Create your first scheduled report to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        {report.description && (
                          <div className="text-sm text-muted-foreground">{report.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="capitalize">{report.reportType.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-sm text-muted-foreground">{report.format.toUpperCase()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {SCHEDULE_PRESETS.find(p => p.value === report.schedule)?.label || report.schedule}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatNextRun(report.nextRun)}</div>
                      {report.lastRun && (
                        <div className="text-xs text-muted-foreground">
                          Last: {new Date(report.lastRun).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(report)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTrigger(report.id)}
                          disabled={actionLoading === report.id || !report.isActive}
                          title="Trigger now"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        {['ADMIN', 'COORDINATOR'].includes(session?.user?.role || '') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(report)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(report.id)}
                              disabled={actionLoading === report.id}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}