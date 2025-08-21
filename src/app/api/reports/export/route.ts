import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const range = searchParams.get('range') || 'month'
    const tab = searchParams.get('tab') || 'overview'
    const lecturerId = searchParams.get('lecturerId') // For individual lecturer filtering

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate = new Date()

    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'semester':
        const currentMonth = now.getMonth()
        if (currentMonth >= 8) {
          startDate = new Date(now.getFullYear(), 8, 1)
        } else {
          startDate = new Date(now.getFullYear(), 0, 1)
        }
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Build where clause for lecturer filtering
    let whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }

    if (lecturerId) {
      whereClause.lecturerId = lecturerId
    }

    // Get attendance data based on tab
    let data: any[] = []
    let filename = `attendance-report-${tab}-${range}`

    switch (tab) {
      case 'overview':
        data = await getOverviewData(whereClause)
        break
      case 'by-course':
      case 'courses':
        data = await getCourseData(whereClause)
        break
      case 'by-lecturer':
      case 'lecturers':
        data = await getLecturerData(whereClause)
        break
      case 'by-student':
      case 'students':
        data = await getStudentData(whereClause)
        break
      case 'daily-trends':
      case 'trends':
        data = await getDailyTrendsData(whereClause)
        break
      default:
        data = await getOverviewData(whereClause)
    }

    if (lecturerId) {
      const lecturer = await prisma.lecturer.findUnique({
        where: { id: lecturerId },
        include: { user: true }
      })
      if (lecturer) {
        filename += `-${lecturer.user.firstName}-${lecturer.user.lastName}`
      }
    }

    if (format === 'csv') {
      const csv = generateCSV(data, tab)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      })
    } else if (format === 'pdf') {
      // For now, return a simple text response for PDF
      // In a real implementation, you'd use a PDF library like puppeteer or jsPDF
      const pdfContent = generatePDFContent(data, tab, range)
      return new NextResponse(pdfContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`
        }
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}

async function getOverviewData(whereClause: any) {
  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      lecturer: {
        include: {
          user: true
        }
      },
      courseSchedule: {
        include: {
          course: true,
          classGroup: true,
          classroom: {
            include: {
              building: true
            }
          }
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  })

  return records.map(record => ({
    Date: record.timestamp.toLocaleDateString(),
    Time: record.timestamp.toLocaleTimeString(),
    Lecturer: `${record.lecturer.user.firstName} ${record.lecturer.user.lastName}`,
    Course: `${record.courseSchedule.course.code} - ${record.courseSchedule.course.title}`,
    ClassGroup: record.courseSchedule.classGroup.name,
    Classroom: `${record.courseSchedule.classroom?.name || 'N/A'} (${record.courseSchedule.classroom?.building?.name || 'N/A'})`,
    Status: record.classRepVerified === true ? 'Verified' : record.classRepVerified === false ? 'Disputed' : 'Pending',
    CheckIn: record.checkInTime?.toLocaleTimeString() || 'N/A',
    CheckOut: record.checkOutTime?.toLocaleTimeString() || 'N/A',
    Location: record.location || 'N/A',
    Remarks: record.remarks || 'N/A'
  }))
}

async function getCourseData(whereClause: any) {
  const records = await prisma.attendanceRecord.groupBy({
    by: ['courseScheduleId'],
    where: whereClause,
    _count: {
      id: true
    }
  })

  const courseData = await Promise.all(
    records.map(async (record) => {
      const schedule = await prisma.courseSchedule.findUnique({
        where: { id: record.courseScheduleId },
        include: {
          course: true,
          classGroup: true
        }
      })

      return {
        CourseCode: schedule?.course.code || 'N/A',
        CourseTitle: schedule?.course.title || 'N/A',
        ClassGroup: schedule?.classGroup.name || 'N/A',
        AttendanceCount: record._count.id
      }
    })
  )

  return courseData
}

async function getLecturerData(whereClause: any) {
  const records = await prisma.attendanceRecord.groupBy({
    by: ['lecturerId'],
    where: whereClause,
    _count: {
      id: true
    }
  })

  const lecturerData = await Promise.all(
    records.map(async (record) => {
      const lecturer = await prisma.lecturer.findUnique({
        where: { id: record.lecturerId },
        include: {
          user: true
        }
      })

      return {
        LecturerName: `${lecturer?.user.firstName || 'N/A'} ${lecturer?.user.lastName || ''}`,
        Email: lecturer?.user.email || 'N/A',
        AttendanceCount: record._count.id
      }
    })
  )

  return lecturerData
}

async function getStudentData(whereClause: any) {
  // For now, return empty array as student data structure needs clarification
  return []
}

async function getDailyTrendsData(whereClause: any) {
  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    select: {
      timestamp: true
    }
  })

  const dailyCounts: { [key: string]: number } = {}
  
  records.forEach(record => {
    const date = record.timestamp.toLocaleDateString()
    dailyCounts[date] = (dailyCounts[date] || 0) + 1
  })

  return Object.entries(dailyCounts).map(([date, count]) => ({
    Date: date,
    AttendanceCount: count
  }))
}

function generateCSV(data: any[], tab: string): string {
  if (data.length === 0) {
    return 'No data available'
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  return csvContent
}

function generatePDFContent(data: any[], tab: string, range: string): Buffer {
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(20)
  doc.text('Attendance Report', 20, 20)
  
  // Add subtitle
  doc.setFontSize(14)
  doc.text(`${tab.toUpperCase()} - ${range.toUpperCase()}`, 20, 35)
  
  // Add generation date
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45)
  doc.text(`Total Records: ${data.length}`, 20, 55)
  
  if (data.length > 0) {
    // Prepare table data
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(header => row[header] || ''))
    
    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 65,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })
  } else {
    doc.text('No data available for the selected criteria.', 20, 70)
  }
  
  return Buffer.from(doc.output('arraybuffer'))
}