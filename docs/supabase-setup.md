# Supabase Setup Guide

## Create Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization, enter name (e.g., "mocky"), set database password
4. Wait for project to provision (~2 minutes)

## Get Credentials

Navigate to **Settings > API** in your Supabase dashboard:

| Credential | Location | Used In |
|------------|----------|---------|
| Project URL | **Project Settings > API** (or Data API) | Frontend (`NEXT_PUBLIC_SUPABASE_URL`) & Backend (`SUPABASE_URL`) |
| Anon Key | **Project Settings > API > Project API keys > anon** | Frontend (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) & Backend (`SUPABASE_ANON_KEY`) |
| Service Role Key | **Project Settings > API > Project API keys > service_role** | Backend (`SUPABASE_SERVICE_ROLE_KEY`) |
| JWT Secret | **Project Settings > API > JWT Settings > JWT Secret** | Backend (`SUPABASE_JWT_SECRET`) |

## Configure Authentication

### 1. Enable Email Provider

1. In Supabase Dashboard, go to **Authentication > Providers**.
2. Expand **Email**:
   - Ensure **Enable Email provider** is ON.
   - (Optional) You can toggle **Confirm email** ON or OFF:
     - **ON (Default)**: Users must verify their email before signing in. Mocky will show the `/auth/verify-email` confirmation screen.
     - **OFF**: Users are immediately signed in upon registration and redirected to the Dashboard.

### 2. URL Configuration (Crucial for Verification & Password Reset)

1. Go to **Authentication > URL Configuration**.
2. Set **Site URL** to:
   - `http://localhost:3000` (for local development)
   - Or your production domain (e.g., `https://mocky.vercel.app`)
3. Under **Redirect URLs**, click **Add URL** and add:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password`
   - `http://localhost:3000/**`
   - (For production: `https://your-domain.vercel.app/auth/callback`)

### 3. CORS Settings

1. In Supabase Dashboard, check **Project Settings > API**.
2. Add your frontend origin (`http://localhost:3000`) to Allowed Origins.

## Email Templates (Optional)

Go to **Authentication > Email Templates** to customize:
- Confirm signup
- Reset password
- Magic link
- Invite user

## Row Level Security (RLS)

For future features, enable RLS on tables:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON your_table
  FOR SELECT USING (auth.uid() = user_id);
```

## Local Development with Supabase CLI (Optional)

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Start local development
supabase start

# This gives you local URLs:
# API: http://localhost:54321
# Studio: http://localhost:54323
# Inbucket (email): http://localhost:54324
```

## Troubleshooting

### "Invalid JWT" errors
- Ensure `SUPABASE_JWT_SECRET` in backend matches Supabase dashboard
- Check token hasn't expired (1 hour default)

### CORS errors
- Verify `FRONTEND_URL` in backend `.env` matches exactly
- Check Supabase CORS settings include frontend URL

### Email not sending
- Check Supabase email provider settings
- Verify email templates are valid
- Check spam folder
- For local dev, use Inbucket (supabase start)

### Middleware redirect loops
- Ensure middleware matcher paths are correct
- Check cookie settings in `createServerClient`