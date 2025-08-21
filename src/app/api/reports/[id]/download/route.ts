import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import fs from 'fs/promises'
import path from 'path'

// GET /api/reports/[id]/download - Download a generated report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get report record
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        generatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canAccess = 
      // User is admin or coordinator
      ['ADMIN', 'COORDINATOR'].includes(session.user.role) ||
      // User generated the report
      report.generatedBy.id === session.user.id ||
      // Lecturer can access their own reports
      (session.user.role === 'LECTURER' && report.reportType === 'lecturerPerformance')

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (report.status !== 'completed') {
      return NextResponse.json(
        { error: 'Report is not ready for download' },
        { status: 400 }
      )
    }

    if (!report.filePath) {
      return NextResponse.json(
        { error: 'Report file not found' },
        { status: 404 }
      )
    }

    try {
      // Check if file exists
      await fs.access(report.filePath)
      
      // Read file
      const fileBuffer = await fs.readFile(report.filePath)
      
      // Determine content type based on format
      const contentTypes = {
        csv: 'text/csv',
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        json: 'application/json'
      }
      
      const contentType = contentTypes[report.format as keyof typeof contentTypes] || 'application/octet-stream'
      
      // Get file name from path
      const fileName = path.basename(report.filePath)
      
      // Update download count
      await prisma.report.update({
        where: { id: params.id },
        data: {
          downloadCount: {
            increment: 1
          },
          lastDownloaded: new Date()
        }
      })
      
      // Return file
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
    } catch (fileError) {
      console.error('File access error:', fileError)
      return NextResponse.json(
        { error: 'Report file not accessible' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('Error downloading report:', error)
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    )
  }
}