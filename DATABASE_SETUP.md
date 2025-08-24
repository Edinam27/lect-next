# Database Setup Guide

## Overview

This application uses a dual database setup:
- **Development**: SQLite (local file database)
- **Production**: PostgreSQL (Supabase cloud database)

## Current Configuration

### Local Development (SQLite)
- Database: `prisma/dev.db`
- Provider: `sqlite`
- Connection: `DATABASE_URL="file:./dev.db"`
- Status: ✅ Working with seeded demo data

### Production (Supabase PostgreSQL)
- Database: Supabase PostgreSQL
- Provider: `postgresql`
- Connection: Configured in environment variables
- Status: ⚠️ Requires manual seeding via Supabase Dashboard

## Demo Credentials

### Admin Users
- **Admin**: admin@upsa.edu.gh / admin123
- **Coordinator**: coordinator@upsa.edu.gh / coord123
- **Coordinator 2**: coordinator2@upsa.edu.gh / coord123

### Lecturers
- **Dr. John Doe**: lecturer1@upsa.edu.gh / lecturer123
- **Prof. Mary Smith**: lecturer2@upsa.edu.gh / lecturer123
- **Dr. James Wilson**: lecturer3@upsa.edu.gh / lecturer123
- **Dr. Emily Davis**: lecturer4@upsa.edu.gh / lecturer123
- **Prof. Robert Miller**: lecturer5@upsa.edu.gh / lecturer123
- **Dr. Lisa Anderson**: lecturer6@upsa.edu.gh / lecturer123
- **Dr. David Taylor**: lecturer7@upsa.edu.gh / lecturer123
- **Prof. Jennifer White**: lecturer8@upsa.edu.gh / lecturer123

### Class Representatives
- **Jane Smith**: classrep1@upsa.edu.gh / classrep123
- **Michael Johnson**: classrep2@upsa.edu.gh / classrep123
- **Sarah Williams**: classrep3@upsa.edu.gh / classrep123
- **Daniel Brown**: classrep4@upsa.edu.gh / classrep123
- **Emma Davis**: classrep5@upsa.edu.gh / classrep123

## Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

3. **Push schema to database**:
   ```bash
   npx prisma db push
   ```

4. **Seed database with demo data**:
   ```bash
   npm run db:seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## Production Deployment (Vercel + Supabase)

### Environment Variables for Vercel

Set these in your Vercel dashboard:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# NextAuth
NEXTAUTH_SECRET=your-production-secret-key
NEXTAUTH_URL=https://your-app.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# UPSA GPS Coordinates
UPSA_GPS_LATITUDE=5.6605
UPSA_GPS_LONGITUDE=-0.1667
```

### Supabase Database Setup

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and anon key

2. **Seed Database**:
   - Use the `supabase_seed.sql` file provided
   - Execute it in the Supabase SQL Editor
   - See `SUPABASE_SEEDING_GUIDE.md` for detailed instructions

3. **Update Schema for Production**:
   - The `prisma/schema.production.prisma` file is configured for PostgreSQL
   - Use this for production deployments

## Troubleshooting

### Connection Issues

If you encounter database connection errors:

1. **Check Supabase Status**:
   - Ensure your Supabase project is active
   - Check if the database is paused (free tier limitation)

2. **Verify Credentials**:
   - Double-check database URL format
   - Ensure password is correctly encoded

3. **Network Issues**:
   - Try different connection string formats:
     - Direct: `postgresql://postgres:password@db.project.supabase.co:5432/postgres`
     - Pooler: `postgresql://postgres.project:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

4. **Local Development Fallback**:
   - If Supabase is unavailable, switch back to SQLite:
     ```env
     DATABASE_URL="file:./dev.db"
     ```
   - Update `prisma/schema.prisma` provider to `sqlite`
   - Run `npx prisma generate` and `npm run db:seed`

### Common Errors

- **"Can't reach database server"**: Network/connectivity issue
- **"Tenant or user not found"**: Incorrect credentials or project paused
- **"FATAL: password authentication failed"**: Wrong password
- **"P1001"**: General connection error

## Data Summary

The seeded database includes:
- **17 Programmes** (MBA, MSc, BSc, etc.)
- **15 Courses** across different programmes
- **6 Class Groups** with assigned lecturers
- **3 Buildings** (Main, Science, Business)
- **9 Classrooms** with capacity and equipment
- **13 Course Schedules** for the current semester
- **Attendance Records** for the past 8 weeks

## Security Notes

- Change default passwords in production
- Use strong `NEXTAUTH_SECRET` in production
- Ensure Supabase RLS (Row Level Security) is properly configured
- Never commit real credentials to version control