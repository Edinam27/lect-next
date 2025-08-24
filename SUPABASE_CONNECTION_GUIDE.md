# Supabase Connection Guide

## Issue: Supabase Database Connection Error (P1001)

### Problem Description
When attempting to connect to Supabase PostgreSQL database locally, you may encounter:
```
Error: P1001: Can't reach database server at `db.nakmigqljujdiokzxayd.supabase.co:5432`
```

### Root Cause
This error typically occurs because:
1. **Database is Paused**: Supabase free tier databases automatically pause after periods of inactivity <mcreference link="https://stackoverflow.com/questions/73866587/prisma-error-p1001-cant-reach-database-server-at-db-xocheossqzkirwnhzxxm-sup" index="1">1</mcreference>
2. **IP Bans**: Multiple failed connection attempts can result in IP bans <mcreference link="https://stackoverflow.com/questions/73866587/prisma-error-p1001-cant-reach-database-server-at-db-xocheossqzkirwnhzxxm-sup" index="1">1</mcreference>
3. **Network Issues**: IPv4/IPv6 connectivity problems <mcreference link="https://www.reddit.com/r/Supabase/comments/vqdunw/help_wanted_error_p1001_cant_reach_database/" index="3">3</mcreference>

## Solutions

### 1. Unpause Supabase Database (Recommended)
1. Go to your Supabase project dashboard: https://nakmigqljujdiokzxayd.supabase.co
2. Look for "Paused" status indicator
3. Click "Unpause" or "Resume" button
4. Wait for database to become active

### 2. Check Network Bans
1. In Supabase dashboard, go to **Project Settings > Database > Network Bans**
2. Remove any IP bans if present <mcreference link="https://stackoverflow.com/questions/73866587/prisma-error-p1001-cant-reach-database-server-at-db-xocheossqzkirwnhzxxm-sup" index="1">1</mcreference>

### 3. Verify Connection String
Ensure your `.env` file has the correct DATABASE_URL:
```env
DATABASE_URL="postgresql://postgres:ekajiEKAJI1$@db.nakmigqljujdiokzxayd.supabase.co:5432/postgres"
```

### 4. Test Connection
After unpausing, test the connection:
```bash
npx prisma db push
```

## Alternative: Use SQLite for Local Development

If Supabase connection issues persist, you can use SQLite locally:

### Step 1: Update Environment
```env
# .env file
DATABASE_URL="file:./dev.db"
```

### Step 2: Update Prisma Schema
```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 3: Regenerate Client
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

## Production Deployment

For production (Vercel), ensure:
1. Supabase database is unpaused and active
2. Use `DATABASE_URL_PRODUCTION` environment variable
3. Set proper connection pooling in Vercel environment variables

## Troubleshooting Tips

1. **Connection Timeout**: Try restarting your development server <mcreference link="https://github.com/orgs/supabase/discussions/4161" index="4">4</mcreference>
2. **Persistent Issues**: Delete and recreate Supabase project if necessary <mcreference link="https://stackoverflow.com/questions/73866587/prisma-error-p1001-cant-reach-database-server-at-db-xocheossqzkirwnhzxxm-sup" index="1">1</mcreference>
3. **IPv6 Issues**: Check router configuration for IPv6 support <mcreference link="https://www.reddit.com/r/Supabase/comments/vqdunw/help_wanted_error_p1001_cant_reach_database/" index="3">3</mcreference>
4. **Update Prisma**: Sometimes updating Prisma resolves connection issues <mcreference link="https://www.reddit.com/r/Supabase/comments/vqdunw/help_wanted_error_p1001_cant_reach_database/" index="3">3</mcreference>

## Current Status

✅ **Local Development**: Using SQLite (`file:./dev.db`)  
⚠️ **Supabase Database**: Currently paused - needs manual unpausing  
✅ **Production Ready**: Configured for Vercel deployment with Supabase

## Demo Credentials

After database is active and seeded:
- **Admin**: admin@upsa.edu.gh / admin123
- **Lecturer**: lecturer1@upsa.edu.gh / lecturer123
- **Class Rep**: classrep1@upsa.edu.gh / classrep123