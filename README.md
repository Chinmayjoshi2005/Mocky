# Mocky - AI-Powered Mock Technical Interview Platform

Monorepo containing the frontend and backend for Mocky.

## Structure

```
Mocky/
├── frontend/          # Next.js 15 + TypeScript + Tailwind + shadcn/ui
├── backend/           # FastAPI + Pydantic
└── docs/              # Setup documentation
```

## Quick Start (Full Stack)

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account (free tier works)

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (backend only)
   - JWT Secret
3. Go to **Authentication > Providers** and enable **Email** provider
4. (Optional) Configure email templates in **Authentication > Email Templates**

### 2. Configure Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
npm install
npm run dev
```

### 3. Configure Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
cp .env.example .env
# Edit .env with all Supabase credentials
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Verify

- Frontend: http://localhost:3000
- Backend: http://localhost:8000/health
- API Docs: http://localhost:8000/docs

## Supabase Setup Details

### Required Settings

1. **Email Auth**: Enabled by default
2. **Email Confirmation**: Recommended ON (Settings > Auth > Email Confirmations)
3. **Redirect URLs**: Add `http://localhost:3000/auth/callback` to allowed redirect URLs
4. **CORS**: Frontend URL should be in allowed origins (Settings > API > CORS)

### Environment Variables Reference

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

#### Backend (`.env`)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase
FRONTEND_URL=http://localhost:3000
```

## Development

### Frontend Commands

```bash
cd frontend
npm run dev        # Dev server with Turbopack
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

### Backend Commands

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000  # Dev server
pytest                                      # Run tests
ruff check .                                # Lint
```

## Deployment

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables from `.env.local`
4. Deploy

### Backend (Render)

1. Create new Web Service on Render
2. Connect GitHub repo
3. Set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from `.env`
7. Deploy

## ⚠️ Security Notice

**Never commit `.env` files to version control.** Environment files contain real API keys, database credentials, and secrets. They are gitignored in this repository. If you accidentally commit secrets:

1. **Immediately rotate** the exposed credentials in the Supabase dashboard, Groq console, and any other service
2. **Purge the commit** from GitHub history using [`git filter-repo`](https://docs.github.com/en/get-started/recipes/managing-commits/removing-sensitive-data-from-a-repository) or the [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
3. Review [GitHub's guide](https://docs.github.com/en/get-started/using-github/pushing-a-commit-to-a-remote-repository) on removing sensitive data

### What to keep secret (never commit):

| File | Secrets |
|------|---------|
| `Backend/.env` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `GROQ_API_KEY` |
| `Frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL` |

Always use `.env.example` as the template — it contains placeholder values only.

## Features Implemented (Auth Only)

- ✅ Sign Up with email/password + validation
- ✅ Log In with email/password + remember me
- ✅ Forgot Password request flow
- ✅ Check Email / Verify Email screen (`/auth/verify-email`) with resend functionality
- ✅ Set New Password confirmation page (`/auth/reset-password`)
- ✅ Email verification & recovery callback (`/auth/callback`)
- ✅ Protected dashboard route with redirect retention
- ✅ Session persistence (SSR cookies via `@supabase/ssr`)
- ✅ Logout & profile display
- ✅ Backend JWT verification with `sub` claim support + Supabase API fallback
- ✅ CORS configured safely with preflight support
- ✅ Automated test suite with pytest (100% passing)
- ✅ Accessible, responsive UI (Inter font, calm navy base, electric-blue accents)
- ✅ Zero ESLint errors or TypeScript compile issues

## Next Steps (Not Implemented)

- Resume upload & parsing
- Job description input
- AI question generation
- Interview session management
- Audio/video recording
- Feedback & scoring
- User dashboard with history