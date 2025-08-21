import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (!type || !['users', 'programmes', 'courses', 'schedules', 'classgroups'].includes(type)) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    let csvContent = ''
    let filename = ''

    switch (type) {
      case 'users':
        csvContent = generateUsersTemplate()
        filename = 'users-template.csv'
        break
      case 'programmes':
        csvContent = generateProgrammesTemplate()
        filename = 'programmes-template.csv'
        break
      case 'courses':
        csvContent = generateCoursesTemplate()
        filename = 'courses-template.csv'
        break
      case 'schedules':
        csvContent = generateSchedulesTemplate()
        filename = 'schedules-template.csv'
        break
      case 'classgroups':
        csvContent = generateClassGroupsTemplate()
        filename = 'classgroups-template.csv'
        break
      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Template generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}

function generateUsersTemplate(): string {
  const headers = [
    'firstName',
    'lastName', 
    'email',
    'role',
    'employeeId',
    'department',
    'employmentType',
    'rank',
    'studentId',
    'programme',
    'classGroup'
  ]
  
  const exampleRows = [
    [
      'John',
      'Doe',
      'john.doe@upsa.edu.gh',
      'STUDENT',
      '',
      '',
      '',
      '',
      'ST2024001',
      'Computer Science',
      'CS-2024-A'
    ],
    [
      'Jane',
      'Smith',
      'jane.smith@upsa.edu.gh',
      'LECTURER',
      'EMP001',
      'Computer Science',
      'FULL_TIME',
      'SENIOR_LECTURER',
      '',
      '',
      ''
    ],
    [
      'Admin',
      'User',
      'admin@upsa.edu.gh',
      'ADMIN',
      'ADM001',
      'Administration',
      'FULL_TIME',
      'ADMINISTRATOR',
      '',
      '',
      ''
    ]
  ]
  
  return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n')
}

function generateProgrammesTemplate(): string {
  const headers = [
    'name',
    'level',
    'durationSemesters',
    'description',
    'deliveryModes'
  ]
  
  const exampleRows = [
    [
      'Computer Science',
      'UNDERGRADUATE',
      '8',
      'Bachelor of Science in Computer Science',
      'FULL_TIME,PART_TIME'
    ],
    [
      'Business Administration',
      'UNDERGRADUATE',
      '8',
      'Bachelor of Business Administration',
      'FULL_TIME,PART_TIME,DISTANCE'
    ],
    [
      'Data Science',
      'POSTGRADUATE',
      '4',
      'Master of Science in Data Science',
      'FULL_TIME'
    ]
  ]
  
  return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n')
}

function generateCoursesTemplate(): string {
  const headers = [
    'code',
    'name',
    'credits',
    'semester',
    'isElective',
    'description',
    'programmeId'
  ]
  
  const exampleRows = [
    [
      'CS101',
      'Introduction to Programming',
      '3',
      '1',
      'false',
      'Basic programming concepts and fundamentals',
      'Computer Science'
    ],
    [
      'CS201',
      'Data Structures and Algorithms',
      '3',
      '2',
      'false',
      'Advanced data structures and algorithm design',
      'Computer Science'
    ],
    [
      'CS301',
      'Machine Learning',
      '3',
      '3',
      'true',
      'Introduction to machine learning concepts',
      'Computer Science'
    ]
  ]
  
  return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n')
}

function generateSchedulesTemplate(): string {
  const headers = [
    'courseCode',
    'classGroup',
    'lecturerEmail',
    'dayOfWeek',
    'startTime',
    'endTime',
    'venue'
  ]
  
  const exampleRows = [
    [
      'CS101',
      'CS-2024-A',
      'lecturer@upsa.edu.gh',
      'MONDAY',
      '08:00',
      '10:00',
      'Room 101'
    ],
    [
      'CS201',
      'CS-2023-A',
      'lecturer@upsa.edu.gh',
      'TUESDAY',
      '10:00',
      '12:00',
      'Lab 201'
    ],
    [
      'CS301',
      'CS-2022-A',
      'lecturer@upsa.edu.gh',
      'WEDNESDAY',
      '14:00',
      '16:00',
      'Room 301'
    ]
  ]
  
  return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n')
}

function generateClassGroupsTemplate(): string {
  const headers = [
    'name',
    'programmeId',
    'academicYear',
    'semester',
    'maxStudents'
  ]
  
  const exampleRows = [
    [
      'CS-2024-A',
      'Computer Science',
      '2024/2025',
      '1',
      '50'
    ],
    [
      'CS-2024-B',
      'Computer Science',
      '2024/2025',
      '1',
      '45'
    ],
    [
      'BA-2024-A',
      'Business Administration',
      '2024/2025',
      '1',
      '60'
    ]
  ]
  
  return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n')
}