-- UPSA Attendance System Database Schema and Seed Data
-- This file creates the complete database schema and populates it with demo data

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'LECTURER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Programme table
CREATE TABLE IF NOT EXISTS "Programme" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Course table
CREATE TABLE IF NOT EXISTS "Course" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    credits INTEGER NOT NULL DEFAULT 3,
    "programmeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("programmeId") REFERENCES "Programme"(id) ON DELETE CASCADE
);

-- Create ClassGroup table
CREATE TABLE IF NOT EXISTS "ClassGroup" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "programmeId" INTEGER NOT NULL,
    year INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("programmeId") REFERENCES "Programme"(id) ON DELETE CASCADE
);

-- Create Building table
CREATE TABLE IF NOT EXISTS "Building" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Classroom table
CREATE TABLE IF NOT EXISTS "Classroom" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "buildingId" INTEGER NOT NULL,
    capacity INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("buildingId") REFERENCES "Building"(id) ON DELETE CASCADE
);

-- Create CourseSchedule table
CREATE TABLE IF NOT EXISTS "CourseSchedule" (
    id SERIAL PRIMARY KEY,
    "courseId" INTEGER NOT NULL,
    "lecturerId" INTEGER NOT NULL,
    "classGroupId" INTEGER NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("courseId") REFERENCES "Course"(id) ON DELETE CASCADE,
    FOREIGN KEY ("lecturerId") REFERENCES "User"(id) ON DELETE CASCADE,
    FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"(id) ON DELETE CASCADE,
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"(id) ON DELETE CASCADE
);

-- Create AttendanceSession table
CREATE TABLE IF NOT EXISTS "AttendanceSession" (
    id SERIAL PRIMARY KEY,
    "scheduleId" INTEGER NOT NULL,
    date DATE NOT NULL,
    "startTime" TIMESTAMP WITH TIME ZONE,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "sessionType" VARCHAR(20) NOT NULL DEFAULT 'LECTURE',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("scheduleId") REFERENCES "CourseSchedule"(id) ON DELETE CASCADE
);

-- Create AttendanceRecord table
CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
    id SERIAL PRIMARY KEY,
    "sessionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "checkInTime" TIMESTAMP WITH TIME ZONE,
    "checkOutTime" TIMESTAMP WITH TIME ZONE,
    "isPresent" BOOLEAN NOT NULL DEFAULT false,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"(id) ON DELETE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Insert demo data

-- Insert Users (Admin, Coordinators, Lecturers, Students)
INSERT INTO "User" (email, "passwordHash", "firstName", "lastName", role, "isActive") VALUES
-- Admin user (password: admin123)
('admin@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'System', 'Administrator', 'ADMIN', true),

-- Coordinators (password: coord123)
('coordinator@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Dr. Sarah', 'Johnson', 'COORDINATOR', true),
('coordinator2@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Prof. Michael', 'Brown', 'COORDINATOR', true),

-- Lecturers (password: lecturer123)
('lecturer@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Dr. John', 'Smith', 'LECTURER', true),
('lecturer2@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Prof. Emily', 'Davis', 'LECTURER', true),
('lecturer3@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Dr. Robert', 'Wilson', 'LECTURER', true),
('lecturer4@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Dr. Lisa', 'Anderson', 'LECTURER', true),
('lecturer5@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Prof. David', 'Taylor', 'LECTURER', true),

-- Class Representatives (password: student123)
('classrep@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Alice', 'Johnson', 'CLASS_REP', true),
('classrep2@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Bob', 'Williams', 'CLASS_REP', true),
('classrep3@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Carol', 'Brown', 'CLASS_REP', true),

-- Students (password: student123)
('student1@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'James', 'Miller', 'STUDENT', true),
('student2@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Emma', 'Davis', 'STUDENT', true),
('student3@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Michael', 'Wilson', 'STUDENT', true),
('student4@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'Sophia', 'Moore', 'STUDENT', true),
('student5@upsa.edu.gh', '$2b$10$rQJ8YQZ9X1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3', 'William', 'Taylor', 'STUDENT', true);

-- Insert Programmes
INSERT INTO "Programme" (name, code, description) VALUES
('Computer Science', 'CS', 'Bachelor of Science in Computer Science'),
('Business Administration', 'BA', 'Bachelor of Business Administration'),
('Information Technology', 'IT', 'Bachelor of Science in Information Technology'),
('Accounting', 'ACC', 'Bachelor of Science in Accounting'),
('Marketing', 'MKT', 'Bachelor of Science in Marketing');

-- Insert Courses
INSERT INTO "Course" (name, code, credits, "programmeId") VALUES
-- Computer Science Courses
('Introduction to Programming', 'CS101', 3, 1),
('Data Structures and Algorithms', 'CS201', 4, 1),
('Database Systems', 'CS301', 3, 1),
('Software Engineering', 'CS401', 4, 1),
('Computer Networks', 'CS501', 3, 1),

-- Business Administration Courses
('Principles of Management', 'BA101', 3, 2),
('Financial Accounting', 'BA201', 3, 2),
('Marketing Management', 'BA301', 3, 2),
('Operations Management', 'BA401', 3, 2),
('Strategic Management', 'BA501', 4, 2),

-- Information Technology Courses
('IT Fundamentals', 'IT101', 3, 3),
('Web Development', 'IT201', 3, 3),
('System Administration', 'IT301', 3, 3),
('Cybersecurity', 'IT401', 4, 3),
('Cloud Computing', 'IT501', 3, 3);

-- Insert Class Groups
INSERT INTO "ClassGroup" (name, "programmeId", year, semester) VALUES
('CS Year 1 Semester 1', 1, 1, 1),
('CS Year 2 Semester 1', 1, 2, 1),
('CS Year 3 Semester 1', 1, 3, 1),
('BA Year 1 Semester 1', 2, 1, 1),
('BA Year 2 Semester 1', 2, 2, 1),
('IT Year 1 Semester 1', 3, 1, 1),
('IT Year 2 Semester 1', 3, 2, 1);

-- Insert Buildings
INSERT INTO "Building" (name, code, description) VALUES
('Main Academic Block', 'MAB', 'Primary academic building with lecture halls'),
('Science Complex', 'SC', 'Science laboratories and lecture rooms'),
('Business School', 'BS', 'Business and management classrooms'),
('IT Center', 'ITC', 'Computer labs and IT facilities'),
('Library Complex', 'LC', 'Library and study areas');

-- Insert Classrooms
INSERT INTO "Classroom" (name, "buildingId", capacity) VALUES
-- Main Academic Block
('MAB-101', 1, 50),
('MAB-102', 1, 60),
('MAB-201', 1, 45),
('MAB-202', 1, 55),

-- Science Complex
('SC-Lab1', 2, 30),
('SC-Lab2', 2, 30),
('SC-201', 2, 40),

-- Business School
('BS-101', 3, 70),
('BS-102', 3, 65),
('BS-201', 3, 50),

-- IT Center
('ITC-Lab1', 4, 35),
('ITC-Lab2', 4, 35),
('ITC-201', 4, 40);

-- Insert Course Schedules
INSERT INTO "CourseSchedule" ("courseId", "lecturerId", "classGroupId", "classroomId", "dayOfWeek", "startTime", "endTime") VALUES
-- Monday schedules
(1, 4, 1, 11, 1, '08:00:00', '10:00:00'), -- CS101 with Dr. John Smith
(6, 5, 4, 8, 1, '10:00:00', '12:00:00'),  -- BA101 with Prof. Emily Davis
(11, 6, 6, 12, 1, '14:00:00', '16:00:00'), -- IT101 with Dr. Robert Wilson

-- Tuesday schedules
(2, 4, 2, 11, 2, '08:00:00', '11:00:00'), -- CS201 with Dr. John Smith
(7, 7, 4, 9, 2, '11:00:00', '13:00:00'),  -- BA201 with Dr. Lisa Anderson
(12, 8, 7, 13, 2, '14:00:00', '16:00:00'), -- IT201 with Prof. David Taylor

-- Wednesday schedules
(3, 5, 3, 5, 3, '09:00:00', '11:00:00'),  -- CS301 with Prof. Emily Davis
(8, 6, 5, 10, 3, '11:00:00', '13:00:00'), -- BA301 with Dr. Robert Wilson
(13, 7, 7, 12, 3, '14:00:00', '16:00:00'), -- IT301 with Dr. Lisa Anderson

-- Thursday schedules
(4, 7, 3, 6, 4, '08:00:00', '11:00:00'),  -- CS401 with Dr. Lisa Anderson
(9, 8, 5, 8, 4, '11:00:00', '13:00:00'),  -- BA401 with Prof. David Taylor
(14, 4, 7, 11, 4, '14:00:00', '17:00:00'), -- IT401 with Dr. John Smith

-- Friday schedules
(5, 6, 2, 7, 5, '09:00:00', '11:00:00'),  -- CS501 with Dr. Robert Wilson
(10, 5, 5, 9, 5, '11:00:00', '14:00:00'), -- BA501 with Prof. Emily Davis
(15, 8, 6, 13, 5, '14:00:00', '16:00:00'); -- IT501 with Prof. David Taylor

-- Insert some sample Attendance Sessions
INSERT INTO "AttendanceSession" ("scheduleId", date, "startTime", "endTime", "sessionType", "isActive") VALUES
(1, '2024-08-20', '2024-08-20 08:00:00+00', '2024-08-20 10:00:00+00', 'LECTURE', false),
(2, '2024-08-20', '2024-08-20 10:00:00+00', '2024-08-20 12:00:00+00', 'LECTURE', false),
(3, '2024-08-20', '2024-08-20 14:00:00+00', '2024-08-20 16:00:00+00', 'LECTURE', false),
(4, '2024-08-21', '2024-08-21 08:00:00+00', '2024-08-21 11:00:00+00', 'LECTURE', false),
(5, '2024-08-21', '2024-08-21 11:00:00+00', '2024-08-21 13:00:00+00', 'LECTURE', false);

-- Insert some sample Attendance Records
INSERT INTO "AttendanceRecord" ("sessionId", "studentId", "checkInTime", "checkOutTime", "isPresent", "isLate") VALUES
-- Session 1 attendance
(1, 12, '2024-08-20 08:05:00+00', '2024-08-20 09:55:00+00', true, true),
(1, 13, '2024-08-20 07:58:00+00', '2024-08-20 09:58:00+00', true, false),
(1, 14, '2024-08-20 08:00:00+00', '2024-08-20 10:00:00+00', true, false),

-- Session 2 attendance
(2, 12, '2024-08-20 10:02:00+00', '2024-08-20 11:58:00+00', true, true),
(2, 13, '2024-08-20 09:59:00+00', '2024-08-20 12:00:00+00', true, false),

-- Session 3 attendance
(3, 14, '2024-08-20 14:01:00+00', '2024-08-20 15:59:00+00', true, false),
(3, 15, '2024-08-20 14:10:00+00', '2024-08-20 16:00:00+00', true, true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);
CREATE INDEX IF NOT EXISTS idx_course_code ON "Course"(code);
CREATE INDEX IF NOT EXISTS idx_programme_code ON "Programme"(code);
CREATE INDEX IF NOT EXISTS idx_building_code ON "Building"(code);
CREATE INDEX IF NOT EXISTS idx_attendance_session_date ON "AttendanceSession"(date);
CREATE INDEX IF NOT EXISTS idx_attendance_record_session ON "AttendanceRecord"("sessionId");
CREATE INDEX IF NOT EXISTS idx_course_schedule_day ON "CourseSchedule"("dayOfWeek");

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programme_updated_at BEFORE UPDATE ON "Programme" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_updated_at BEFORE UPDATE ON "Course" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classgroup_updated_at BEFORE UPDATE ON "ClassGroup" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_building_updated_at BEFORE UPDATE ON "Building" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classroom_updated_at BEFORE UPDATE ON "Classroom" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courseschedule_updated_at BEFORE UPDATE ON "CourseSchedule" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendancesession_updated_at BEFORE UPDATE ON "AttendanceSession" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendancerecord_updated_at BEFORE UPDATE ON "AttendanceRecord" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'UPSA Attendance System database schema and seed data created successfully!' AS result;