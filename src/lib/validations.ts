import { z } from 'zod'
import { UserRole, SessionType } from '@prisma/client'

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true)
})

export const userUpdateSchema = userCreateSchema.partial().omit({ password: true })

// Lecturer validation schemas
export const lecturerCreateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  rank: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.string().optional()
})

// Programme validation schemas
export const programmeCreateSchema = z.object({
  name: z.string().min(1, 'Programme name is required'),
  level: z.string().min(1, 'Level is required'),
  durationSemesters: z.number().min(1, 'Duration must be at least 1 semester'),
  description: z.string().optional(),
  deliveryModes: z.array(z.string()).min(1, 'At least one delivery mode is required')
})

// Course validation schemas
export const courseCreateSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Course title is required'),
  creditHours: z.number().min(1, 'Credit hours must be at least 1'),
  programmeId: z.string().min(1, 'Programme is required'),
  semesterLevel: z.number().min(1, 'Semester level must be at least 1'),
  isElective: z.boolean().default(false),
  description: z.string().optional()
})

// Class Group validation schemas
export const classGroupCreateSchema = z.object({
  name: z.string().min(1, 'Class group name is required'),
  programmeId: z.string().min(1, 'Programme is required'),
  admissionYear: z.number().min(2000, 'Invalid admission year'),
  deliveryMode: z.string().min(1, 'Delivery mode is required'),
  classRepId: z.string().optional()
})

// Building validation schemas
export const buildingCreateSchema = z.object({
  code: z.string().min(1, 'Building code is required'),
  name: z.string().min(1, 'Building name is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  gpsLatitude: z.number().min(-90).max(90, 'Invalid latitude'),
  gpsLongitude: z.number().min(-180).max(180, 'Invalid longitude'),
  totalFloors: z.number().optional()
})

// Classroom validation schemas
export const classroomCreateSchema = z.object({
  roomCode: z.string().min(1, 'Room code is required'),
  name: z.string().min(1, 'Room name is required'),
  buildingId: z.string().min(1, 'Building is required'),
  capacity: z.number().optional(),
  roomType: z.string().optional(),
  equipmentList: z.array(z.string()).optional(),
  gpsLatitude: z.number().min(-90).max(90, 'Invalid latitude').optional(),
  gpsLongitude: z.number().min(-180).max(180, 'Invalid longitude').optional(),
  availabilityStatus: z.string().default('available'),
  virtualLink: z.string().url('Invalid URL').optional()
})

// Course Schedule validation schemas
export const courseScheduleCreateSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  classGroupId: z.string().min(1, 'Class group is required'),
  lecturerId: z.string().min(1, 'Lecturer is required'),
  dayOfWeek: z.number().min(0).max(6, 'Invalid day of week'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  classroomId: z.string().optional(),
  sessionType: z.nativeEnum(SessionType)
})

// Attendance validation schemas
export const attendanceCreateSchema = z.object({
  courseScheduleId: z.string().min(1, 'Course schedule is required'),
  gpsLatitude: z.number().min(-90).max(90, 'Invalid latitude').optional(),
  gpsLongitude: z.number().min(-180).max(180, 'Invalid longitude').optional(),
  method: z.enum(['onsite', 'virtual'], { required_error: 'Method is required' }),
  classRepComment: z.string().optional()
})

// Import validation schemas
export const userImportSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true)
})

export const programmeImportSchema = z.object({
  name: z.string().min(1, 'Programme name is required'),
  level: z.string().min(1, 'Level is required'),
  durationSemesters: z.number().min(1, 'Duration must be at least 1 semester'),
  description: z.string().optional(),
  deliveryModes: z.string().min(1, 'Delivery modes are required') // Will be parsed as JSON
})

export const courseImportSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Course title is required'),
  creditHours: z.number().min(1, 'Credit hours must be at least 1'),
  programmeName: z.string().min(1, 'Programme name is required'),
  semesterLevel: z.number().min(1, 'Semester level must be at least 1'),
  isElective: z.boolean().default(false),
  description: z.string().optional()
})

export const classGroupImportSchema = z.object({
  name: z.string().min(1, 'Class group name is required'),
  programmeName: z.string().min(1, 'Programme name is required'),
  admissionYear: z.number().min(2000, 'Invalid admission year'),
  deliveryMode: z.string().min(1, 'Delivery mode is required'),
  classRepEmail: z.string().email('Invalid class rep email').optional()
})

export const buildingImportSchema = z.object({
  code: z.string().min(1, 'Building code is required'),
  name: z.string().min(1, 'Building name is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  gpsLatitude: z.number().min(-90).max(90, 'Invalid latitude'),
  gpsLongitude: z.number().min(-180).max(180, 'Invalid longitude'),
  totalFloors: z.number().optional()
})

export const classroomImportSchema = z.object({
  roomCode: z.string().min(1, 'Room code is required'),
  name: z.string().min(1, 'Room name is required'),
  buildingCode: z.string().min(1, 'Building code is required'),
  capacity: z.number().optional(),
  roomType: z.string().optional(),
  equipmentList: z.string().optional(), // Will be parsed as JSON
  gpsLatitude: z.number().min(-90).max(90, 'Invalid latitude').optional(),
  gpsLongitude: z.number().min(-180).max(180, 'Invalid longitude').optional(),
  availabilityStatus: z.string().default('available'),
  virtualLink: z.string().url('Invalid URL').optional()
})

export const courseScheduleImportSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  classGroupName: z.string().min(1, 'Class group name is required'),
  lecturerEmail: z.string().email('Invalid lecturer email'),
  dayOfWeek: z.number().min(0).max(6, 'Invalid day of week'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  roomCode: z.string().optional(),
  sessionType: z.nativeEnum(SessionType)
})