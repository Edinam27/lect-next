# Supabase Database Seeding Guide

This guide explains how to seed your Supabase database with the UPSA Attendance System schema and demo data.

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Execute the Seed Script
1. Open the `supabase_seed.sql` file in this project
2. Copy the entire contents of the file
3. Paste it into the SQL Editor
4. Click **Run** to execute the script

### Step 3: Verify the Setup
After running the script, you should see:
- All tables created in the **Table Editor**
- Demo users, programmes, courses, and other data populated
- Success message: "UPSA Attendance System database schema and seed data created successfully!"

## Method 2: Using Supabase CLI (Alternative)

If you have the Supabase CLI installed:

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the seed file
psql -h db.your-project-ref.supabase.co -p 5432 -d postgres -U postgres -f supabase_seed.sql
```

## Demo Credentials

After seeding, you can use these demo accounts:

### Admin Account
- **Email**: admin@upsa.edu.gh
- **Password**: admin123
- **Role**: Administrator

### Coordinator Accounts
- **Email**: coordinator@upsa.edu.gh
- **Password**: coord123
- **Role**: Coordinator

- **Email**: coordinator2@upsa.edu.gh
- **Password**: coord123
- **Role**: Coordinator

### Lecturer Accounts
- **Email**: lecturer@upsa.edu.gh
- **Password**: lecturer123
- **Role**: Lecturer

- **Email**: lecturer2@upsa.edu.gh through lecturer5@upsa.edu.gh
- **Password**: lecturer123
- **Role**: Lecturer

### Class Representative Accounts
- **Email**: classrep@upsa.edu.gh
- **Password**: student123
- **Role**: Class Representative

- **Email**: classrep2@upsa.edu.gh, classrep3@upsa.edu.gh
- **Password**: student123
- **Role**: Class Representative

### Student Accounts
- **Email**: student1@upsa.edu.gh through student5@upsa.edu.gh
- **Password**: student123
- **Role**: Student

## Database Schema Overview

The seed script creates the following tables:

1. **User** - System users (admins, coordinators, lecturers, students)
2. **Programme** - Academic programmes (CS, BA, IT, etc.)
3. **Course** - Individual courses within programmes
4. **ClassGroup** - Class groups by programme, year, and semester
5. **Building** - Campus buildings
6. **Classroom** - Individual classrooms within buildings
7. **CourseSchedule** - Weekly course schedules
8. **AttendanceSession** - Individual attendance sessions
9. **AttendanceRecord** - Student attendance records

## Sample Data Included

- **5 Programmes**: Computer Science, Business Administration, IT, Accounting, Marketing
- **15 Courses**: Distributed across the programmes
- **7 Class Groups**: Different year/semester combinations
- **5 Buildings**: Various campus buildings
- **13 Classrooms**: Distributed across buildings
- **15 Course Schedules**: Weekly timetable entries
- **5 Attendance Sessions**: Sample past sessions
- **7 Attendance Records**: Sample student attendance data

## Troubleshooting

### If you get permission errors:
1. Make sure you're using the correct database credentials
2. Verify your Supabase project is active
3. Check that your IP address is allowed in Supabase settings

### If tables already exist:
The script uses `CREATE TABLE IF NOT EXISTS` so it won't overwrite existing tables. If you need to reset:
1. Drop existing tables manually in the SQL Editor
2. Re-run the seed script

### If you need to update environment variables:
After seeding, update your production environment variables:
```env
DATABASE_URL="postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres?pgbouncer=true&sslmode=require"
```

## Next Steps

1. **Update Vercel Environment Variables**: Set the `DATABASE_URL` to your Supabase connection string
2. **Deploy to Vercel**: Push your code and deploy
3. **Test the Application**: Use the demo credentials to test functionality
4. **Customize Data**: Modify the seed script for your specific needs

## Security Notes

- Change default passwords in production
- The password hashes in the seed file are for demo purposes only
- Enable Row Level Security (RLS) policies as needed
- Review and adjust user permissions

---

**Note**: This seeding approach bypasses Prisma connection issues and works directly with Supabase PostgreSQL. Once seeded, your application can connect normally using the Prisma client.