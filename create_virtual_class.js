const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createVirtualClassForDrJohnDoe() {
  try {
    console.log('🎓 Creating virtual class attendance for Dr. John Doe that starts now...')
    
    // Get current time and day
    const now = new Date()
    const currentDayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000).toTimeString().slice(0, 5) // 3 hours later
    
    console.log(`📅 Current day: ${currentDayOfWeek}, Time: ${currentTime} - ${endTime}`)
    
    // Find Dr. John Doe's lecturer record
    const drJohnDoe = await prisma.lecturer.findFirst({
      where: {
        user: {
          firstName: 'Dr. John',
          lastName: 'Doe'
        }
      },
      include: {
        user: true
      }
    })
    
    if (!drJohnDoe) {
      console.error('❌ Dr. John Doe not found in database')
      return
    }
    
    console.log(`👨‍🏫 Found Dr. John Doe (ID: ${drJohnDoe.id})`)
    
    // Find an available course for him to teach (Accounting course since he's in Accounting dept)
    const availableCourse = await prisma.course.findFirst({
      where: {
        courseCode: 'MBA-ACC-501' // Advanced Financial Accounting
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
    
    // Find a virtual classroom
    const virtualClassroom = await prisma.classroom.findFirst({
      where: {
        roomCode: 'VIRTUAL-01',
        roomType: 'Virtual',
        availabilityStatus: 'available'
      }
    })
    
    if (!virtualClassroom) {
      console.error('❌ No virtual classroom found')
      return
    }
    
    console.log(`💻 Using virtual classroom: ${virtualClassroom.name} (${virtualClassroom.roomCode})`)
    
    // Check if there's already a schedule for this exact time slot
    const existingSchedule = await prisma.courseSchedule.findFirst({
      where: {
        lecturerId: drJohnDoe.id,
        dayOfWeek: currentDayOfWeek,
        startTime: currentTime,
        endTime: endTime
      }
    })
    
    if (existingSchedule) {
      console.log('⚠️  Dr. John Doe already has a class scheduled at this exact time')
      console.log(`📋 Existing Schedule ID: ${existingSchedule.id}`)
      return { scheduleId: existingSchedule.id }
    }
    
    // Create the new virtual course schedule
    const newSchedule = await prisma.courseSchedule.create({
      data: {
        courseId: availableCourse.id,
        classGroupId: availableClassGroup.id,
        lecturerId: drJohnDoe.id,
        dayOfWeek: currentDayOfWeek,
        startTime: currentTime,
        endTime: endTime,
        classroomId: virtualClassroom.id,
        sessionType: 'LECTURE'
      }
    })
    
    console.log('✅ Successfully created virtual class schedule!')
    console.log(`📋 Schedule Details:`)
    console.log(`   - Lecturer: Dr. John Doe`)
    console.log(`   - Course: ${availableCourse.title} (${availableCourse.courseCode})`)
    console.log(`   - Class Group: ${availableClassGroup.name}`)
    console.log(`   - Day: ${currentDayOfWeek} (Today)`)
    console.log(`   - Time: ${currentTime} - ${endTime}`)
    console.log(`   - Virtual Classroom: ${virtualClassroom.name} (${virtualClassroom.roomCode})`)
    console.log(`   - Virtual Link: ${virtualClassroom.virtualLink || 'N/A'}`)
    console.log(`   - Session Type: LECTURE`)
    console.log(`   - Schedule ID: ${newSchedule.id}`)
    
    return { scheduleId: newSchedule.id }
    
  } catch (error) {
    console.error('❌ Error creating virtual class schedule:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createVirtualClassForDrJohnDoe()
    .then((result) => {
      if (result) {
        console.log(`🎉 Virtual class created successfully! Schedule ID: ${result.scheduleId}`)
      }
    })
    .catch((error) => {
      console.error('Failed to create virtual class:', error)
      process.exit(1)
    })
}

module.exports = { createVirtualClassForDrJohnDoe }