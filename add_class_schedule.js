const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addClassSchedule() {
  try {
    console.log('🕐 Adding new class schedule for Prof. Mary Smith at 12:40pm today...')
    
    // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    console.log(`📅 Today is day ${dayOfWeek} of the week`)
    
    // Find Prof. Mary Smith's lecturer record
    const marySmith = await prisma.lecturer.findFirst({
      where: {
        user: {
          firstName: 'Prof. Mary',
          lastName: 'Smith'
        }
      },
      include: {
        user: true
      }
    })
    
    if (!marySmith) {
      console.error('❌ Prof. Mary Smith not found in database')
      return
    }
    
    console.log(`👩‍🏫 Found Prof. Mary Smith (ID: ${marySmith.id})`)
    
    // Find an available course for her to teach
    const availableCourse = await prisma.course.findFirst({
      where: {
        courseCode: 'MBA-FIN-502' // Corporate Finance - matches her Finance department
      }
    })
    
    if (!availableCourse) {
      console.error('❌ No suitable course found')
      return
    }
    
    console.log(`📚 Using course: ${availableCourse.title} (${availableCourse.courseCode})`)
    
    // Find an available class group
    const availableClassGroup = await prisma.classGroup.findFirst({
      where: {
        name: 'MBA-AF-2024-FT' // MBA Accounting & Finance 2024 Full-time
      }
    })
    
    if (!availableClassGroup) {
      console.error('❌ No suitable class group found')
      return
    }
    
    console.log(`👥 Using class group: ${availableClassGroup.name}`)
    
    // Find an available classroom
    const availableClassroom = await prisma.classroom.findFirst({
      where: {
        roomCode: 'MAIN-201', // Use an existing classroom from seed data
        availabilityStatus: 'available'
      }
    })
    
    if (!availableClassroom) {
      console.error('❌ No available classroom found')
      return
    }
    
    console.log(`🏫 Using classroom: ${availableClassroom.name} (${availableClassroom.roomCode})`)
    
    // Check if there's already a schedule for this time slot
    const existingSchedule = await prisma.courseSchedule.findFirst({
      where: {
        lecturerId: marySmith.id,
        dayOfWeek: dayOfWeek,
        startTime: '12:40',
        endTime: '15:40'
      }
    })
    
    if (existingSchedule) {
      console.log('⚠️  Prof. Mary Smith already has a class scheduled at this time today')
      return
    }
    
    // Create the new course schedule
    const newSchedule = await prisma.courseSchedule.create({
      data: {
        courseId: availableCourse.id,
        classGroupId: availableClassGroup.id,
        lecturerId: marySmith.id,
        dayOfWeek: dayOfWeek,
        startTime: '12:40',
        endTime: '15:40', // 3-hour class
        classroomId: availableClassroom.id,
        sessionType: 'LECTURE'
      }
    })
    
    console.log('✅ Successfully created new class schedule!')
    console.log(`📋 Schedule Details:`)
    console.log(`   - Lecturer: Prof. Mary Smith`)
    console.log(`   - Course: ${availableCourse.title} (${availableCourse.courseCode})`)
    console.log(`   - Class Group: ${availableClassGroup.name}`)
    console.log(`   - Day: ${dayOfWeek} (Today)`)
    console.log(`   - Time: 12:40 - 15:40`)
    console.log(`   - Classroom: ${availableClassroom.name} (${availableClassroom.roomCode})`)
    console.log(`   - Session Type: LECTURE`)
    console.log(`   - Schedule ID: ${newSchedule.id}`)
    
  } catch (error) {
    console.error('❌ Error adding class schedule:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addClassSchedule()