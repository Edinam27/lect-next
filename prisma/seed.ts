import { PrismaClient, UserRole, SessionType } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with comprehensive test data...')

  // Create admin users
  const adminPassword = await hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@upsa.edu.gh' },
    update: {},
    create: {
      email: 'admin@upsa.edu.gh',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true
    }
  })

  // Create coordinators
  const coordinatorPassword = await hashPassword('coord123')
  const coordinator1 = await prisma.user.upsert({
    where: { email: 'coordinator@upsa.edu.gh' },
    update: {},
    create: {
      email: 'coordinator@upsa.edu.gh',
      passwordHash: coordinatorPassword,
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: UserRole.COORDINATOR,
      isActive: true
    }
  })

  const coordinator2 = await prisma.user.upsert({
    where: { email: 'coordinator2@upsa.edu.gh' },
    update: {},
    create: {
      email: 'coordinator2@upsa.edu.gh',
      passwordHash: coordinatorPassword,
      firstName: 'Prof. Michael',
      lastName: 'Brown',
      role: UserRole.COORDINATOR,
      isActive: true
    }
  })

  // Create multiple lecturers
  const lecturerPassword = await hashPassword('lecturer123')
  const lecturerUsers = []
  const lecturerData = [
    { email: 'lecturer1@upsa.edu.gh', firstName: 'Dr. John', lastName: 'Doe', employeeId: 'EMP001', rank: 'Senior Lecturer', department: 'Accounting' },
    { email: 'lecturer2@upsa.edu.gh', firstName: 'Prof. Mary', lastName: 'Smith', employeeId: 'EMP002', rank: 'Professor', department: 'Finance' },
    { email: 'lecturer3@upsa.edu.gh', firstName: 'Dr. James', lastName: 'Wilson', employeeId: 'EMP003', rank: 'Associate Professor', department: 'Marketing' },
    { email: 'lecturer4@upsa.edu.gh', firstName: 'Dr. Emily', lastName: 'Davis', employeeId: 'EMP004', rank: 'Senior Lecturer', department: 'Management' },
    { email: 'lecturer5@upsa.edu.gh', firstName: 'Prof. Robert', lastName: 'Miller', employeeId: 'EMP005', rank: 'Professor', department: 'Leadership' },
    { email: 'lecturer6@upsa.edu.gh', firstName: 'Dr. Lisa', lastName: 'Anderson', employeeId: 'EMP006', rank: 'Lecturer', department: 'Procurement' },
    { email: 'lecturer7@upsa.edu.gh', firstName: 'Dr. David', lastName: 'Taylor', employeeId: 'EMP007', rank: 'Senior Lecturer', department: 'Law' },
    { email: 'lecturer8@upsa.edu.gh', firstName: 'Prof. Jennifer', lastName: 'White', employeeId: 'EMP008', rank: 'Associate Professor', department: 'Auditing' }
  ]

  for (const data of lecturerData) {
    const lecturerUser = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: lecturerPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: UserRole.LECTURER,
        isActive: true
      }
    })
    lecturerUsers.push(lecturerUser)

    // Create lecturer profile
    await prisma.lecturer.upsert({
      where: { userId: lecturerUser.id },
      update: {},
      create: {
        userId: lecturerUser.id,
        employeeId: data.employeeId,
        rank: data.rank,
        department: data.department,
        employmentType: 'Full-time'
      }
    })
  }

  // Create class representatives
  const classRepPassword = await hashPassword('classrep123')
  const classRepUsers = []
  const classRepData = [
    { email: 'classrep1@upsa.edu.gh', firstName: 'Jane', lastName: 'Smith' },
    { email: 'classrep2@upsa.edu.gh', firstName: 'Michael', lastName: 'Johnson' },
    { email: 'classrep3@upsa.edu.gh', firstName: 'Sarah', lastName: 'Williams' },
    { email: 'classrep4@upsa.edu.gh', firstName: 'Daniel', lastName: 'Brown' },
    { email: 'classrep5@upsa.edu.gh', firstName: 'Emma', lastName: 'Davis' }
  ]

  for (const data of classRepData) {
    const classRep = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: classRepPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: UserRole.CLASS_REP,
        isActive: true
      }
    })
    classRepUsers.push(classRep)
  }

  // Create UPSA Graduate School Programmes
  const programmes = [
    // PhD Programmes
    {
      name: 'PhD in Accounting',
      level: 'PhD',
      durationSemesters: 6,
      description: 'Doctor of Philosophy in Accounting',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    {
      name: 'PhD in Finance',
      level: 'PhD',
      durationSemesters: 6,
      description: 'Doctor of Philosophy in Finance',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    {
      name: 'PhD in Marketing',
      level: 'PhD',
      durationSemesters: 6,
      description: 'Doctor of Philosophy in Marketing',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    // MPhil Programmes
    {
      name: 'MPhil in Accounting',
      level: 'MPhil',
      durationSemesters: 4,
      description: 'Master of Philosophy in Accounting',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    {
      name: 'MPhil in Finance',
      level: 'MPhil',
      durationSemesters: 4,
      description: 'Master of Philosophy in Finance',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    {
      name: 'MPhil in Marketing',
      level: 'MPhil',
      durationSemesters: 4,
      description: 'Master of Philosophy in Marketing',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    {
      name: 'MPhil in Leadership',
      level: 'MPhil',
      durationSemesters: 4,
      description: 'Master of Philosophy in Leadership',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    // MBA Programmes
    {
      name: 'MBA in Accounting & Finance',
      level: 'MBA',
      durationSemesters: 4,
      description: 'Master of Business Administration in Accounting & Finance',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time', 'Executive'])
    },
    {
      name: 'MBA in Marketing',
      level: 'MBA',
      durationSemesters: 4,
      description: 'Master of Business Administration in Marketing',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time', 'Executive'])
    },
    {
      name: 'MBA in Corporate Governance',
      level: 'MBA',
      durationSemesters: 4,
      description: 'Master of Business Administration in Corporate Governance',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time', 'Executive'])
    },
    {
      name: 'MBA in Internal Auditing',
      level: 'MBA',
      durationSemesters: 4,
      description: 'Master of Business Administration in Internal Auditing',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time', 'Executive'])
    },
    {
      name: 'MBA in Project Management',
      level: 'MBA',
      durationSemesters: 4,
      description: 'Master of Business Administration in Project Management',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time', 'Executive'])
    },
    // MSc Programmes
    {
      name: 'MSc in Leadership',
      level: 'MSc',
      durationSemesters: 4,
      description: 'Master of Science in Leadership',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    {
      name: 'MSc in Procurement',
      level: 'MSc',
      durationSemesters: 4,
      description: 'Master of Science in Procurement',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    {
      name: 'MSc in Accounting & Finance',
      level: 'MSc',
      durationSemesters: 4,
      description: 'Master of Science in Accounting & Finance',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    // MA Programme
    {
      name: 'MA in Brands and Communication Management',
      level: 'MA',
      durationSemesters: 4,
      description: 'Master of Arts in Brands and Communication Management',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    },
    // LL.M. Programme
    {
      name: 'LL.M. in Alternative Dispute Resolution',
      level: 'LL.M.',
      durationSemesters: 4,
      description: 'Master of Laws in Alternative Dispute Resolution',
      deliveryModes: JSON.stringify(['Full-time', 'Part-time'])
    }
  ]

  const createdProgrammes = []
  for (const programmeData of programmes) {
    const programme = await prisma.programme.upsert({
      where: { name: programmeData.name },
      update: {},
      create: programmeData
    })
    createdProgrammes.push(programme)
  }

  // Create multiple buildings
  const buildings = [
    {
      code: 'MAIN',
      name: 'Main Academic Building',
      description: 'Primary academic building for graduate school',
      address: 'UPSA Graduate School, Accra',
      gpsLatitude: 5.6037,
      gpsLongitude: -0.1870,
      totalFloors: 4
    },
    {
      code: 'ANNEX',
      name: 'Annex Building',
      description: 'Secondary academic building',
      address: 'UPSA Graduate School Annex, Accra',
      gpsLatitude: 5.6040,
      gpsLongitude: -0.1875,
      totalFloors: 3
    },
    {
      code: 'EXEC',
      name: 'Executive Education Center',
      description: 'Executive education and conference center',
      address: 'UPSA Executive Center, Accra',
      gpsLatitude: 5.6035,
      gpsLongitude: -0.1865,
      totalFloors: 2
    }
  ]

  const createdBuildings = []
  for (const buildingData of buildings) {
    const building = await prisma.building.upsert({
      where: { code: buildingData.code },
      update: {},
      create: buildingData
    })
    createdBuildings.push(building)
  }

  // Create multiple classrooms
  const classrooms = [
    // Main Building Classrooms
    {
      roomCode: 'MAIN-101',
      name: 'Lecture Hall 1',
      buildingId: createdBuildings[0].id,
      capacity: 80,
      roomType: 'Lecture Hall',
      equipmentList: JSON.stringify(['Projector', 'Sound System', 'Whiteboard', 'Air Conditioning']),
      gpsLatitude: 5.6037,
      gpsLongitude: -0.1870,
      availabilityStatus: 'available'
    },
    {
      roomCode: 'MAIN-102',
      name: 'Lecture Hall 2',
      buildingId: createdBuildings[0].id,
      capacity: 60,
      roomType: 'Lecture Hall',
      equipmentList: JSON.stringify(['Projector', 'Sound System', 'Whiteboard']),
      gpsLatitude: 5.6037,
      gpsLongitude: -0.1870,
      availabilityStatus: 'available'
    },
    {
      roomCode: 'MAIN-201',
      name: 'Seminar Room 1',
      buildingId: createdBuildings[0].id,
      capacity: 30,
      roomType: 'Seminar Room',
      equipmentList: JSON.stringify(['Projector', 'Whiteboard', 'Round Tables']),
      gpsLatitude: 5.6037,
      gpsLongitude: -0.1870,
      availabilityStatus: 'available'
    },
    {
      roomCode: 'MAIN-202',
      name: 'Seminar Room 2',
      buildingId: createdBuildings[0].id,
      capacity: 25,
      roomType: 'Seminar Room',
      equipmentList: JSON.stringify(['Projector', 'Whiteboard']),
      gpsLatitude: 5.6037,
      gpsLongitude: -0.1870,
      availabilityStatus: 'available'
    },
    // Annex Building Classrooms
    {
      roomCode: 'ANNEX-101',
      name: 'Workshop Room 1',
      buildingId: createdBuildings[1].id,
      capacity: 40,
      roomType: 'Workshop Room',
      equipmentList: JSON.stringify(['Projector', 'Flipcharts', 'Group Tables']),
      gpsLatitude: 5.6040,
      gpsLongitude: -0.1875,
      availabilityStatus: 'available'
    },
    {
      roomCode: 'ANNEX-201',
      name: 'Computer Lab',
      buildingId: createdBuildings[1].id,
      capacity: 35,
      roomType: 'Computer Lab',
      equipmentList: JSON.stringify(['Computers', 'Projector', 'Software']),
      gpsLatitude: 5.6040,
      gpsLongitude: -0.1875,
      availabilityStatus: 'available'
    },
    // Executive Center
    {
      roomCode: 'EXEC-101',
      name: 'Executive Boardroom',
      buildingId: createdBuildings[2].id,
      capacity: 20,
      roomType: 'Boardroom',
      equipmentList: JSON.stringify(['Video Conferencing', 'Projector', 'Executive Furniture']),
      gpsLatitude: 5.6035,
      gpsLongitude: -0.1865,
      availabilityStatus: 'available'
    },
    // Virtual Classrooms
    {
      roomCode: 'VIRTUAL-01',
      name: 'Virtual Classroom 1',
      buildingId: createdBuildings[0].id,
      capacity: 100,
      roomType: 'Virtual',
      equipmentList: JSON.stringify(['Video Conferencing', 'Recording Equipment']),
      virtualLink: 'https://meet.google.com/virtual-classroom-1',
      availabilityStatus: 'available'
    },
    {
      roomCode: 'VIRTUAL-02',
      name: 'Virtual Classroom 2',
      buildingId: createdBuildings[0].id,
      capacity: 150,
      roomType: 'Virtual',
      equipmentList: JSON.stringify(['Video Conferencing', 'Recording Equipment']),
      virtualLink: 'https://meet.google.com/virtual-classroom-2',
      availabilityStatus: 'available'
    }
  ]

  const createdClassrooms = []
  for (const classroomData of classrooms) {
    const classroom = await prisma.classroom.upsert({
      where: { roomCode: classroomData.roomCode },
      update: {},
      create: classroomData
    })
    createdClassrooms.push(classroom)
  }

  // Create comprehensive courses for multiple programmes
  const coursesByProgramme = {
    'MBA in Accounting & Finance': [
      { code: 'MBA-ACC-501', title: 'Advanced Financial Accounting', credits: 3, semester: 1, elective: false },
      { code: 'MBA-FIN-502', title: 'Corporate Finance', credits: 3, semester: 1, elective: false },
      { code: 'MBA-MGT-503', title: 'Strategic Management', credits: 3, semester: 1, elective: false },
      { code: 'MBA-ACC-504', title: 'Management Accounting', credits: 3, semester: 2, elective: false },
      { code: 'MBA-FIN-505', title: 'Investment Analysis', credits: 3, semester: 2, elective: true }
    ],
    'MBA in Marketing': [
      { code: 'MBA-MKT-501', title: 'Strategic Marketing Management', credits: 3, semester: 1, elective: false },
      { code: 'MBA-MKT-502', title: 'Consumer Behavior', credits: 3, semester: 1, elective: false },
      { code: 'MBA-MKT-503', title: 'Digital Marketing', credits: 3, semester: 2, elective: false },
      { code: 'MBA-MKT-504', title: 'Brand Management', credits: 3, semester: 2, elective: true }
    ],
    'MSc in Leadership': [
      { code: 'MSC-LDR-501', title: 'Leadership Theory and Practice', credits: 3, semester: 1, elective: false },
      { code: 'MSC-LDR-502', title: 'Organizational Behavior', credits: 3, semester: 1, elective: false },
      { code: 'MSC-LDR-503', title: 'Change Management', credits: 3, semester: 2, elective: false }
    ],
    'MBA in Project Management': [
      { code: 'MBA-PM-501', title: 'Project Planning and Control', credits: 3, semester: 1, elective: false },
      { code: 'MBA-PM-502', title: 'Risk Management', credits: 3, semester: 1, elective: false },
      { code: 'MBA-PM-503', title: 'Quality Management', credits: 3, semester: 2, elective: false }
    ]
  }

  const createdCourses = []
  for (const [programmeName, courses] of Object.entries(coursesByProgramme)) {
    const programme = createdProgrammes.find(p => p.name === programmeName)
    if (programme) {
      for (const courseData of courses) {
        const course = await prisma.course.upsert({
          where: { courseCode: courseData.code },
          update: {},
          create: {
            courseCode: courseData.code,
            title: courseData.title,
            creditHours: courseData.credits,
            programmeId: programme.id,
            semesterLevel: courseData.semester,
            isElective: courseData.elective,
            description: `${courseData.title} - ${programme.name}`
          }
        })
        createdCourses.push(course)
      }
    }
  }

  // Create multiple class groups
  const classGroups = [
    { name: 'MBA-AF-2024-FT', programme: 'MBA in Accounting & Finance', year: 2024, mode: 'Full-time', repIndex: 0 },
    { name: 'MBA-AF-2024-PT', programme: 'MBA in Accounting & Finance', year: 2024, mode: 'Part-time', repIndex: 1 },
    { name: 'MBA-MKT-2024-FT', programme: 'MBA in Marketing', year: 2024, mode: 'Full-time', repIndex: 2 },
    { name: 'MSC-LDR-2024-FT', programme: 'MSc in Leadership', year: 2024, mode: 'Full-time', repIndex: 3 },
    { name: 'MBA-PM-2024-PT', programme: 'MBA in Project Management', year: 2024, mode: 'Part-time', repIndex: 4 },
    { name: 'MBA-AF-2023-FT', programme: 'MBA in Accounting & Finance', year: 2023, mode: 'Full-time', repIndex: 0 }
  ]

  const createdClassGroups = []
  for (const groupData of classGroups) {
    const programme = createdProgrammes.find(p => p.name === groupData.programme)
    if (programme) {
      const classGroup = await prisma.classGroup.upsert({
        where: {
          name_programmeId_admissionYear: {
            name: groupData.name,
            programmeId: programme.id,
            admissionYear: groupData.year
          }
        },
        update: {},
        create: {
          name: groupData.name,
          programmeId: programme.id,
          admissionYear: groupData.year,
          deliveryMode: groupData.mode,
          classRepId: classRepUsers[groupData.repIndex]?.id
        }
      })
      createdClassGroups.push(classGroup)
    }
  }

  // Get all lecturers for schedule assignment
  const allLecturers = await prisma.lecturer.findMany({
    include: { user: true }
  })

  // Create comprehensive course schedules
  const scheduleData = [
    // MBA Accounting & Finance 2024 Full-time
    { courseCode: 'MBA-ACC-501', classGroup: 'MBA-AF-2024-FT', lecturerIndex: 0, day: 1, start: '09:00', end: '12:00', classroom: 'MAIN-101', type: 'LECTURE' },
    { courseCode: 'MBA-FIN-502', classGroup: 'MBA-AF-2024-FT', lecturerIndex: 1, day: 2, start: '09:00', end: '12:00', classroom: 'MAIN-102', type: 'LECTURE' },
    { courseCode: 'MBA-MGT-503', classGroup: 'MBA-AF-2024-FT', lecturerIndex: 3, day: 3, start: '14:00', end: '17:00', classroom: 'MAIN-201', type: 'SEMINAR' },
    
    // MBA Accounting & Finance 2024 Part-time
    { courseCode: 'MBA-ACC-501', classGroup: 'MBA-AF-2024-PT', lecturerIndex: 0, day: 6, start: '09:00', end: '12:00', classroom: 'MAIN-101', type: 'LECTURE' },
    { courseCode: 'MBA-FIN-502', classGroup: 'MBA-AF-2024-PT', lecturerIndex: 1, day: 6, start: '14:00', end: '17:00', classroom: 'MAIN-102', type: 'LECTURE' },
    
    // MBA Marketing 2024 Full-time
    { courseCode: 'MBA-MKT-501', classGroup: 'MBA-MKT-2024-FT', lecturerIndex: 2, day: 1, start: '14:00', end: '17:00', classroom: 'ANNEX-101', type: 'LECTURE' },
    { courseCode: 'MBA-MKT-502', classGroup: 'MBA-MKT-2024-FT', lecturerIndex: 2, day: 4, start: '09:00', end: '12:00', classroom: 'VIRTUAL-01', type: 'VIRTUAL' },
    
    // MSc Leadership 2024 Full-time
    { courseCode: 'MSC-LDR-501', classGroup: 'MSC-LDR-2024-FT', lecturerIndex: 4, day: 2, start: '14:00', end: '17:00', classroom: 'EXEC-101', type: 'SEMINAR' },
    { courseCode: 'MSC-LDR-502', classGroup: 'MSC-LDR-2024-FT', lecturerIndex: 4, day: 5, start: '09:00', end: '12:00', classroom: 'MAIN-201', type: 'LECTURE' },
    
    // MBA Project Management 2024 Part-time
    { courseCode: 'MBA-PM-501', classGroup: 'MBA-PM-2024-PT', lecturerIndex: 5, day: 0, start: '09:00', end: '12:00', classroom: 'ANNEX-101', type: 'LECTURE' },
    { courseCode: 'MBA-PM-502', classGroup: 'MBA-PM-2024-PT', lecturerIndex: 6, day: 0, start: '14:00', end: '17:00', classroom: 'VIRTUAL-02', type: 'VIRTUAL' },
    
    // Additional schedules for 2023 cohort
    { courseCode: 'MBA-ACC-504', classGroup: 'MBA-AF-2023-FT', lecturerIndex: 7, day: 3, start: '09:00', end: '12:00', classroom: 'MAIN-102', type: 'LECTURE' },
    { courseCode: 'MBA-FIN-505', classGroup: 'MBA-AF-2023-FT', lecturerIndex: 1, day: 4, start: '14:00', end: '17:00', classroom: 'ANNEX-201', type: 'LAB' }
  ]

  const createdSchedules = []
  for (const schedule of scheduleData) {
    const course = createdCourses.find(c => c.courseCode === schedule.courseCode)
    const classGroup = createdClassGroups.find(cg => cg.name === schedule.classGroup)
    const classroom = createdClassrooms.find(cr => cr.roomCode === schedule.classroom)
    const lecturer = allLecturers[schedule.lecturerIndex]

    if (course && classGroup && lecturer) {
      const courseSchedule = await prisma.courseSchedule.create({
        data: {
          courseId: course.id,
          classGroupId: classGroup.id,
          lecturerId: lecturer.id,
          dayOfWeek: schedule.day,
          startTime: schedule.start,
          endTime: schedule.end,
          classroomId: classroom?.id,
          sessionType: schedule.type as SessionType
        }
      })
      createdSchedules.push(courseSchedule)
    }
  }

  // Create realistic attendance records for the past few weeks
  const today = new Date()
  const attendanceRecords = []
  
  for (const schedule of createdSchedules) {
    // Create attendance records for the past 8 weeks
    for (let week = 0; week < 8; week++) {
      const sessionDate = new Date(today)
      sessionDate.setDate(today.getDate() - (week * 7) + (schedule.dayOfWeek - today.getDay()))
      
      // Only create records for past dates
      if (sessionDate < today) {
        // 85% attendance rate - some lecturers miss occasionally
        const attended = Math.random() > 0.15
        
        if (attended) {
          const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
          const sessionDateTime = new Date(sessionDate)
          sessionDateTime.setHours(startHour, startMinute, 0, 0)
          
          // Add some realistic variance to attendance time (±15 minutes)
          const variance = (Math.random() - 0.5) * 30 * 60 * 1000 // ±15 minutes in milliseconds
          sessionDateTime.setTime(sessionDateTime.getTime() + variance)
          
          const classroom = createdClassrooms.find(c => c.id === schedule.classroomId)
          const isVirtual = schedule.sessionType === 'VIRTUAL'
          
          await prisma.attendanceRecord.create({
            data: {
              lecturerId: schedule.lecturerId,
              courseScheduleId: schedule.id,
              timestamp: sessionDateTime,
              gpsLatitude: isVirtual ? null : (classroom?.gpsLatitude || 5.6037),
              gpsLongitude: isVirtual ? null : (classroom?.gpsLongitude || -0.1870),
              locationVerified: !isVirtual,
              method: isVirtual ? 'virtual' : 'onsite',
              classRepVerified: Math.random() > 0.1, // 90% class rep verification rate
              classRepComment: Math.random() > 0.7 ? 'Lecturer arrived on time and conducted full session' : null
            }
          })
        }
      }
    }
  }

  console.log('✅ Database seeded successfully with comprehensive test data!')
  console.log('\n👤 Default users created:')
  console.log('📧 Admin: admin@upsa.edu.gh (password: admin123)')
  console.log('📧 Coordinator: coordinator@upsa.edu.gh (password: coord123)')
  console.log('📧 Coordinator 2: coordinator2@upsa.edu.gh (password: coord123)')
  console.log('\n👨‍🏫 Lecturers created:')
  lecturerData.forEach((lecturer, index) => {
    console.log(`📧 ${lecturer.firstName} ${lecturer.lastName}: ${lecturer.email} (password: lecturer123)`)
  })
  console.log('\n👥 Class Representatives created:')
  classRepData.forEach((rep, index) => {
    console.log(`📧 ${rep.firstName} ${rep.lastName}: ${rep.email} (password: classrep123)`)
  })
  console.log(`\n📊 Data Summary:`)
  console.log(`- ${createdProgrammes.length} Programmes`)
  console.log(`- ${createdCourses.length} Courses`)
  console.log(`- ${createdClassGroups.length} Class Groups`)
  console.log(`- ${createdBuildings.length} Buildings`)
  console.log(`- ${createdClassrooms.length} Classrooms`)
  console.log(`- ${createdSchedules.length} Course Schedules`)
  console.log(`- ${allLecturers.length} Lecturers`)
  console.log(`- Attendance records for past 8 weeks created`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })