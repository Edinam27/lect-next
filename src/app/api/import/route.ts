import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth-config'
import * as XLSX from 'xlsx'
import { hash } from 'bcryptjs'

interface ImportResult {
  success: boolean
  message: string
  imported: number
  errors: string[]
  warnings: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!type || !['users', 'programmes', 'courses', 'schedules', 'classgroups'].includes(type)) {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 })
    }

    // Read file content
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data found in file',
        imported: 0,
        errors: ['File is empty or contains no valid data'],
        warnings: []
      })
    }

    let result: ImportResult

    switch (type) {
      case 'users':
        result = await importUsers(data)
        break
      case 'programmes':
        result = await importProgrammes(data)
        break
      case 'courses':
        result = await importCourses(data)
        break
      case 'schedules':
        result = await importSchedules(data)
        break
      case 'classgroups':
        result = await importClassGroups(data)
        break
      default:
        return NextResponse.json({ error: 'Invalid import type' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      success: false,
      message: 'Import failed due to server error',
      imported: 0,
      errors: ['Internal server error occurred'],
      warnings: []
    }, { status: 500 })
  }
}

async function importUsers(data: any[]): Promise<ImportResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let imported = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 2 // Account for header row

    try {
      // Validate required fields
      if (!row.firstName || !row.lastName || !row.email || !row.role) {
        errors.push(`Row ${rowNum}: Missing required fields (firstName, lastName, email, role)`)
        continue
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: row.email }
      })

      if (existingUser) {
        warnings.push(`Row ${rowNum}: User with email ${row.email} already exists, skipping`)
        continue
      }

      // Create user
      const hashedPassword = await hash('defaultPassword123', 12)
      const user = await prisma.user.create({
        data: {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          password: hashedPassword,
          role: row.role.toUpperCase(),
          isActive: true
        }
      })

      // Create role-specific records
      if (row.role.toUpperCase() === 'LECTURER' && row.employeeId) {
        await prisma.lecturer.create({
          data: {
            userId: user.id,
            employeeId: row.employeeId,
            department: row.department || 'General',
            employmentType: row.employmentType || 'FULL_TIME',
            rank: row.rank || 'LECTURER'
          }
        })
      }

      imported++
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'Users imported successfully' : 'Import completed with errors',
    imported,
    errors,
    warnings
  }
}

async function importProgrammes(data: any[]): Promise<ImportResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let imported = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 2

    try {
      if (!row.name || !row.level || !row.durationSemesters) {
        errors.push(`Row ${rowNum}: Missing required fields (name, level, durationSemesters)`)
        continue
      }

      const existingProgramme = await prisma.programme.findFirst({
        where: { name: row.name }
      })

      if (existingProgramme) {
        warnings.push(`Row ${rowNum}: Programme ${row.name} already exists, skipping`)
        continue
      }

      await prisma.programme.create({
        data: {
          name: row.name,
          level: row.level.toUpperCase(),
          durationSemesters: parseInt(row.durationSemesters),
          description: row.description || '',
          deliveryModes: row.deliveryModes ? JSON.stringify(row.deliveryModes.split(',')) : JSON.stringify(['FULL_TIME'])
        }
      })

      imported++
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'Programmes imported successfully' : 'Import completed with errors',
    imported,
    errors,
    warnings
  }
}

async function importCourses(data: any[]): Promise<ImportResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let imported = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 2

    try {
      if (!row.code || !row.name || !row.credits || !row.programmeId) {
        errors.push(`Row ${rowNum}: Missing required fields (code, name, credits, programmeId)`)
        continue
      }

      const existingCourse = await prisma.course.findFirst({
        where: { courseCode: row.code }
      })

      if (existingCourse) {
        warnings.push(`Row ${rowNum}: Course ${row.code} already exists, skipping`)
        continue
      }

      // Find programme
      const programme = await prisma.programme.findFirst({
        where: { name: row.programmeId }
      })

      if (!programme) {
        errors.push(`Row ${rowNum}: Programme ${row.programmeId} not found`)
        continue
      }

      await prisma.course.create({
        data: {
          courseCode: row.code,
          title: row.name,
          creditHours: parseInt(row.credits),
          semester: parseInt(row.semester) || 1,
          isElective: row.isElective === 'true' || row.isElective === true,
          description: row.description || '',
          programmeId: programme.id
        }
      })

      imported++
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'Courses imported successfully' : 'Import completed with errors',
    imported,
    errors,
    warnings
  }
}

async function importSchedules(data: any[]): Promise<ImportResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let imported = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 2

    try {
      if (!row.courseCode || !row.classGroup || !row.lecturerEmail || !row.dayOfWeek || !row.startTime || !row.endTime) {
        errors.push(`Row ${rowNum}: Missing required fields`)
        continue
      }

      // Find course
      const course = await prisma.course.findFirst({
        where: { courseCode: row.courseCode }
      })

      if (!course) {
        errors.push(`Row ${rowNum}: Course ${row.courseCode} not found`)
        continue
      }

      // Find lecturer
      const lecturer = await prisma.lecturer.findFirst({
        where: { user: { email: row.lecturerEmail } }
      })

      if (!lecturer) {
        errors.push(`Row ${rowNum}: Lecturer ${row.lecturerEmail} not found`)
        continue
      }

      // Find class group
      const classGroup = await prisma.classGroup.findFirst({
        where: { name: row.classGroup }
      })

      if (!classGroup) {
        errors.push(`Row ${rowNum}: Class group ${row.classGroup} not found`)
        continue
      }

      await prisma.courseSchedule.create({
        data: {
          courseId: course.id,
          classGroupId: classGroup.id,
          lecturerId: lecturer.id,
          dayOfWeek: row.dayOfWeek.toUpperCase(),
          startTime: row.startTime,
          endTime: row.endTime,
          sessionType: 'LECTURE',
          isActive: true
        }
      })

      imported++
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'Schedules imported successfully' : 'Import completed with errors',
    imported,
    errors,
    warnings
  }
}

async function importClassGroups(data: any[]): Promise<ImportResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let imported = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 2

    try {
      if (!row.name || !row.programmeId || !row.academicYear) {
        errors.push(`Row ${rowNum}: Missing required fields (name, programmeId, academicYear)`)
        continue
      }

      const existingGroup = await prisma.classGroup.findFirst({
        where: { name: row.name }
      })

      if (existingGroup) {
        warnings.push(`Row ${rowNum}: Class group ${row.name} already exists, skipping`)
        continue
      }

      // Find programme
      const programme = await prisma.programme.findFirst({
        where: { name: row.programmeId }
      })

      if (!programme) {
        errors.push(`Row ${rowNum}: Programme ${row.programmeId} not found`)
        continue
      }

      await prisma.classGroup.create({
        data: {
          name: row.name,
          programmeId: programme.id,
          admissionYear: parseInt(row.academicYear.split('/')[0]),
          currentSemester: parseInt(row.semester) || 1,
          maxStudents: parseInt(row.maxStudents) || 50
        }
      })

      imported++
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 ? 'Class groups imported successfully' : 'Import completed with errors',
    imported,
    errors,
    warnings
  }
}