import { prisma } from '@/lib/db'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import fs from 'fs/promises'
import path from 'path'
import * as cron from 'node-cron'

export interface ReportParameters {
  dateRange?: {
    startDate: string
    endDate: string
  }
  lecturerId?: string
  courseId?: string
  classGroupId?: string
  reportType?: string
  includeDetails?: boolean
}

export interface ReportGenerationOptions {
  type: string
  format: 'csv' | 'pdf' | 'excel' | 'json'
  parameters: ReportParameters
  generatedBy: string
}

export interface ReportResult {
  data: any
  filePath: string
  fileSize: number
  fileName: string
}

// Ensure reports directory exists
const ensureReportsDirectory = async () => {
  const reportsDir = path.join(process.cwd(), 'public', 'reports')
  try {
    await fs.access(reportsDir)
  } catch {
    await fs.mkdir(reportsDir, { recursive: true })
  }
  return reportsDir
}

// Generate attendance overview report
const generateAttendanceOverview = async (parameters: ReportParameters) => {
  const { dateRange, lecturerId, courseId, classGroupId } = parameters
  
  const whereClause: any = {}
  
  if (dateRange) {
    whereClause.date = {
      gte: new Date(dateRange.startDate),
      lte: new Date(dateRange.endDate)
    }
  }
  
  if (lecturerId) {
    whereClause.lecturerId = lecturerId
  }
  
  if (courseId) {
    whereClause.courseSchedule = {
      courseId
    }
  }
  
  if (classGroupId) {
    whereClause.courseSchedule = {
      ...whereClause.courseSchedule,
      classGroupId
    }
  }

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      lecturer: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      },
      courseSchedule: {
        include: {
          course: {
            select: {
              title: true,
              courseCode: true
            }
          },
          classGroup: {
            select: {
              name: true
            }
          }
        }
      },
      verifications: {
        include: {
          verifiedBy: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: {
      date: 'desc'
    }
  })

  // Calculate statistics
  const totalRecords = attendanceRecords.length
  const verifiedRecords = attendanceRecords.filter(r => r.status === 'verified').length
  const pendingRecords = attendanceRecords.filter(r => r.status === 'pending').length
  const disputedRecords = attendanceRecords.filter(r => r.status === 'disputed').length
  
  const verificationRate = totalRecords > 0 ? (verifiedRecords / totalRecords) * 100 : 0
  
  // Group by lecturer
  const lecturerStats = attendanceRecords.reduce((acc, record) => {
    const lecturerName = `${record.lecturer.user.firstName} ${record.lecturer.user.lastName}`
    if (!acc[lecturerName]) {
      acc[lecturerName] = {
        total: 0,
        verified: 0,
        pending: 0,
        disputed: 0
      }
    }
    acc[lecturerName].total++
    acc[lecturerName][record.status]++
    return acc
  }, {} as Record<string, any>)
  
  // Group by course
  const courseStats = attendanceRecords.reduce((acc, record) => {
    const courseName = `${record.courseSchedule.course.courseCode} - ${record.courseSchedule.course.title}`
    if (!acc[courseName]) {
      acc[courseName] = {
        total: 0,
        verified: 0,
        pending: 0,
        disputed: 0
      }
    }
    acc[courseName].total++
    acc[courseName][record.status]++
    return acc
  }, {} as Record<string, any>)

  return {
    summary: {
      totalRecords,
      verifiedRecords,
      pendingRecords,
      disputedRecords,
      verificationRate: Math.round(verificationRate * 100) / 100
    },
    lecturerStats,
    courseStats,
    records: parameters.includeDetails ? attendanceRecords.map(record => ({
      id: record.id,
      date: record.date.toISOString().split('T')[0],
      startTime: record.startTime,
      endTime: record.endTime,
      lecturer: `${record.lecturer.user.firstName} ${record.lecturer.user.lastName}`,
      course: `${record.courseSchedule.course.courseCode} - ${record.courseSchedule.course.title}`,
      classGroup: record.courseSchedule.classGroup.name,
      status: record.status,
      studentsPresent: record.studentsPresent,
      totalStudents: record.totalStudents,
      attendanceRate: record.totalStudents > 0 ? Math.round((record.studentsPresent / record.totalStudents) * 100) : 0,
      verificationCount: record.verifications.length,
      lastVerification: record.verifications.length > 0 
        ? record.verifications[record.verifications.length - 1].verifiedAt.toISOString()
        : null
    })) : []
  }
}

// Generate lecturer performance report
const generateLecturerPerformance = async (parameters: ReportParameters) => {
  const { dateRange, lecturerId } = parameters
  
  const whereClause: any = {}
  
  if (dateRange) {
    whereClause.date = {
      gte: new Date(dateRange.startDate),
      lte: new Date(dateRange.endDate)
    }
  }
  
  if (lecturerId) {
    whereClause.lecturerId = lecturerId
  }

  const lecturers = await prisma.lecturer.findMany({
    where: lecturerId ? { id: lecturerId } : {},
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      attendanceRecords: {
        where: whereClause,
        include: {
          courseSchedule: {
            include: {
              course: {
                select: {
                  title: true,
                  courseCode: true
                }
              }
            }
          }
        }
      }
    }
  })

  const lecturerPerformance = lecturers.map(lecturer => {
    const records = lecturer.attendanceRecords
    const totalRecords = records.length
    const verifiedRecords = records.filter(r => r.status === 'verified').length
    const pendingRecords = records.filter(r => r.status === 'pending').length
    const disputedRecords = records.filter(r => r.status === 'disputed').length
    
    const totalStudentsPresent = records.reduce((sum, r) => sum + r.studentsPresent, 0)
    const totalStudentsExpected = records.reduce((sum, r) => sum + r.totalStudents, 0)
    const averageAttendanceRate = totalStudentsExpected > 0 
      ? (totalStudentsPresent / totalStudentsExpected) * 100 
      : 0
    
    const verificationRate = totalRecords > 0 ? (verifiedRecords / totalRecords) * 100 : 0
    
    // Course breakdown
    const courseBreakdown = records.reduce((acc, record) => {
      const courseKey = `${record.courseSchedule.course.courseCode} - ${record.courseSchedule.course.title}`
      if (!acc[courseKey]) {
        acc[courseKey] = {
          total: 0,
          verified: 0,
          pending: 0,
          disputed: 0,
          studentsPresent: 0,
          totalStudents: 0
        }
      }
      acc[courseKey].total++
      acc[courseKey][record.status]++
      acc[courseKey].studentsPresent += record.studentsPresent
      acc[courseKey].totalStudents += record.totalStudents
      return acc
    }, {} as Record<string, any>)

    return {
      lecturer: {
        id: lecturer.id,
        name: `${lecturer.user.firstName} ${lecturer.user.lastName}`,
        email: lecturer.user.email
      },
      statistics: {
        totalRecords,
        verifiedRecords,
        pendingRecords,
        disputedRecords,
        verificationRate: Math.round(verificationRate * 100) / 100,
        averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100
      },
      courseBreakdown
    }
  })

  return {
    lecturers: lecturerPerformance,
    summary: {
      totalLecturers: lecturers.length,
      totalRecords: lecturerPerformance.reduce((sum, l) => sum + l.statistics.totalRecords, 0),
      averageVerificationRate: lecturerPerformance.length > 0 
        ? lecturerPerformance.reduce((sum, l) => sum + l.statistics.verificationRate, 0) / lecturerPerformance.length
        : 0
    }
  }
}

// Export data to CSV format
const exportToCSV = async (data: any, fileName: string): Promise<string> => {
  const reportsDir = await ensureReportsDirectory()
  const filePath = path.join(reportsDir, fileName)
  
  let csvContent = ''
  
  if (data.records && Array.isArray(data.records)) {
    // Export detailed records
    const headers = Object.keys(data.records[0] || {})
    csvContent = headers.join(',') + '\n'
    
    data.records.forEach((record: any) => {
      const row = headers.map(header => {
        const value = record[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      })
      csvContent += row.join(',') + '\n'
    })
  } else {
    // Export summary data
    csvContent = 'Metric,Value\n'
    Object.entries(data.summary || data).forEach(([key, value]) => {
      csvContent += `${key},${value}\n`
    })
  }
  
  await fs.writeFile(filePath, csvContent, 'utf-8')
  return filePath
}

// Export data to Excel format
const exportToExcel = async (data: any, fileName: string): Promise<string> => {
  const reportsDir = await ensureReportsDirectory()
  const filePath = path.join(reportsDir, fileName)
  
  const workbook = XLSX.utils.book_new()
  
  // Add summary sheet
  if (data.summary) {
    const summaryData = Object.entries(data.summary).map(([key, value]) => ({ Metric: key, Value: value }))
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  }
  
  // Add detailed records sheet
  if (data.records && Array.isArray(data.records)) {
    const recordsSheet = XLSX.utils.json_to_sheet(data.records)
    XLSX.utils.book_append_sheet(workbook, recordsSheet, 'Records')
  }
  
  // Add lecturer stats sheet
  if (data.lecturerStats) {
    const lecturerData = Object.entries(data.lecturerStats).map(([lecturer, stats]) => ({
      Lecturer: lecturer,
      ...stats
    }))
    const lecturerSheet = XLSX.utils.json_to_sheet(lecturerData)
    XLSX.utils.book_append_sheet(workbook, lecturerSheet, 'Lecturer Stats')
  }
  
  // Add course stats sheet
  if (data.courseStats) {
    const courseData = Object.entries(data.courseStats).map(([course, stats]) => ({
      Course: course,
      ...stats
    }))
    const courseSheet = XLSX.utils.json_to_sheet(courseData)
    XLSX.utils.book_append_sheet(workbook, courseSheet, 'Course Stats')
  }
  
  XLSX.writeFile(workbook, filePath)
  return filePath
}

// Export data to PDF format
const exportToPDF = async (data: any, fileName: string, reportType: string): Promise<string> => {
  const reportsDir = await ensureReportsDirectory()
  const filePath = path.join(reportsDir, fileName)
  
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(20)
  doc.text(reportType.replace(/([A-Z])/g, ' $1').trim(), 20, 30)
  
  // Add generation date
  doc.setFontSize(12)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45)
  
  let yPosition = 60
  
  // Add summary section
  if (data.summary) {
    doc.setFontSize(16)
    doc.text('Summary', 20, yPosition)
    yPosition += 15
    
    doc.setFontSize(12)
    Object.entries(data.summary).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 25, yPosition)
      yPosition += 10
    })
    yPosition += 10
  }
  
  // Add detailed records table
  if (data.records && Array.isArray(data.records) && data.records.length > 0) {
    const tableData = data.records.map((record: any) => [
      record.date || '',
      record.lecturer || '',
      record.course || '',
      record.status || '',
      record.studentsPresent?.toString() || '0',
      record.totalStudents?.toString() || '0',
      record.attendanceRate ? `${record.attendanceRate}%` : '0%'
    ])
    
    ;(doc as any).autoTable({
      head: [['Date', 'Lecturer', 'Course', 'Status', 'Present', 'Total', 'Rate']],
      body: tableData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    })
  }
  
  doc.save(filePath)
  return filePath
}

// Export data to JSON format
const exportToJSON = async (data: any, fileName: string): Promise<string> => {
  const reportsDir = await ensureReportsDirectory()
  const filePath = path.join(reportsDir, fileName)
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return filePath
}

// Main report generation function
export const generateReport = async (options: ReportGenerationOptions): Promise<ReportResult> => {
  const { type, format, parameters } = options
  
  let data: any
  
  // Generate data based on report type
  switch (type) {
    case 'attendanceOverview':
      data = await generateAttendanceOverview(parameters)
      break
    case 'lecturerPerformance':
      data = await generateLecturerPerformance(parameters)
      break
    default:
      throw new Error(`Unsupported report type: ${type}`)
  }
  
  // Generate file name
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `${type}_${timestamp}.${format === 'excel' ? 'xlsx' : format}`
  
  let filePath: string
  
  // Export data based on format
  switch (format) {
    case 'csv':
      filePath = await exportToCSV(data, fileName)
      break
    case 'excel':
      filePath = await exportToExcel(data, fileName)
      break
    case 'pdf':
      filePath = await exportToPDF(data, fileName, type)
      break
    case 'json':
      filePath = await exportToJSON(data, fileName)
      break
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
  
  // Get file size
  const stats = await fs.stat(filePath)
  const fileSize = stats.size
  
  return {
    data,
    filePath,
    fileSize,
    fileName
  }
}

/**
 * Calculate next run time based on cron expression
 */
export const calculateNextRun = (cronExpression: string, fromDate: Date = new Date()): Date => {
  try {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`)
    }
    
    const nextRun = new Date(fromDate)
    
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
        if (nextRun <= fromDate) {
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
        
        if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextRun <= fromDate)) {
          daysUntilTarget += 7
        }
        
        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
        return nextRun
      }
      
      // Handle monthly patterns (0 9 1 * *)
      if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
        const targetDay = parseInt(dayOfMonth)
        const targetHour = parseInt(hour)
        const targetMinute = parseInt(minute)
        
        nextRun.setHours(targetHour, targetMinute, 0, 0)
        nextRun.setDate(targetDay)
        
        if (nextRun <= fromDate) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        
        return nextRun
      }
    }
    
    // Fallback: add 1 day
    nextRun.setDate(nextRun.getDate() + 1)
    return nextRun
  } catch (error) {
    console.error('Error calculating next run:', error)
    // Fallback: add 1 day
    const fallback = new Date(fromDate)
    fallback.setDate(fallback.getDate() + 1)
    return fallback
  }
}