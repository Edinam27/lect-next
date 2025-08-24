# Vercel Deployment Guide

This guide will help you deploy the UPSA Attendance System to Vercel with Supabase PostgreSQL database.

## Prerequisites

1. Vercel account
2. GitHub repository with your code
3. Supabase project (already configured)

## Step 1: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `https://github.com/Edinam27/lect-next.git`
4. Configure the project settings:
   - Framework Preset: Next.js
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

## Step 2: Configure Environment Variables

In your Vercel project settings, add the following environment variables:

### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:ekajiEKAJI1$@db.nakmigqljujdiokzxayd.supabase.co:5432/postgres?connect_timeout=30&sslmode=require

# NextAuth Configuration
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-vercel-app.vercel.app

# JWT Secret
JWT_SECRET=your-jwt-secret-here

# UPSA GPS Configuration
UPSA_GPS_LATITUDE=5.6037
UPSA_GPS_LONGITUDE=-0.1870
UPSA_GPS_RADIUS=100

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nakmigqljujdiokzxayd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ha21pZ3FsanVqZGlva3p4YXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTQ5MDgsImV4cCI6MjA3MTU3MDkwOH0.E2s-fzq1f63v8bwhDWQY04SH6GPG2k_6ft--lIYKuqY
```

### Generate Secure Secrets

For `NEXTAUTH_SECRET` and `JWT_SECRET`, use these commands to generate secure secrets:

```bash
# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Set Up Production Database

### Option A: Manual Database Setup (if connection issues persist)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL to create the users table:

```sql
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

4. Insert demo users:

```sql
INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "role") VALUES
('admin1', 'admin@upsa.edu.gh', '$2a$10$hash_for_admin123', 'System', 'Administrator', 'admin'),
('coord1', 'coordinator@upsa.edu.gh', '$2a$10$hash_for_coord123', 'Academic', 'Coordinator', 'coordinator'),
('lect1', 'lecturer1@upsa.edu.gh', '$2a$10$hash_for_lecturer123', 'Dr. John', 'Doe', 'lecturer'),
('rep1', 'classrep1@upsa.edu.gh', '$2a$10$hash_for_classrep123', 'Jane', 'Smith', 'classrep');
```

### Option B: Automated Setup (when connection works)

1. Update your local `.env` to use the production database temporarily
2. Run: `npx prisma db push --schema=prisma/schema.production.prisma`
3. Run: `npm run db:seed`
4. Revert your local `.env` back to SQLite

## Step 4: Deploy and Test

1. Push your latest changes to GitHub
2. Vercel will automatically deploy
3. Test the deployment with these credentials:

### Demo Credentials

- **Admin**: `admin@upsa.edu.gh` / `admin123`
- **Coordinator**: `coordinator@upsa.edu.gh` / `coord123`
- **Lecturer**: `lecturer1@upsa.edu.gh` / `lecturer123`
- **Class Rep**: `classrep1@upsa.edu.gh` / `classrep123`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify the DATABASE_URL format
   - Check Supabase project status
   - Ensure password is URL-encoded if it contains special characters

2. **NextAuth Errors**:
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your Vercel domain
   - Ensure all environment variables are properly set

3. **Build Errors**:
   - Check that all dependencies are in package.json
   - Verify TypeScript types are correct
   - Review build logs in Vercel dashboard

### Environment Variable Updates

After updating environment variables in Vercel:
1. Go to your project dashboard
2. Navigate to Settings > Environment Variables
3. Update the variables
4. Redeploy the project

## Security Notes

- Never commit `.env.production` to version control
- Use strong, unique secrets for production
- Regularly rotate secrets
- Monitor Supabase usage and access logs

## Next Steps

After successful deployment:
1. Set up custom domain (optional)
2. Configure monitoring and analytics
3. Set up automated backups for Supabase
4. Review and update security settings