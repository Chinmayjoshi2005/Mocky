# Mocky

Mocky is a private AI interview practice platform. It turns a candidate's
resume and a target job description into focused interview questions, then
provides a text practice session with AI feedback.

The project is a small full-stack monorepo:

- `Frontend/` is a Next.js and TypeScript application.
- `Backend/` is a FastAPI service for authenticated processing and AI features.
- `supabase/` contains versioned database migrations.
- `docs/` contains Supabase setup notes.

## What Works Today

- Email sign-up, sign-in, verification, password reset, and logout
- Protected dashboard and authenticated routes
- Resume upload, PDF parsing, and candidate profile analysis
- Job description intake
- AI-generated interview questions grounded in the candidate and role
- Question review, editing, selection, ordering, and regeneration
- Text practice sessions with per-answer AI evaluation
- Overall practice scoring and feedback review
- Supabase Row Level Security migrations and ownership checks

## Before You Start

Install:

- Node.js 18 or newer
- Python 3.11 or newer
- A Supabase project
- A Groq API key for AI analysis and question generation

## Local Setup

### 1. Configure Supabase

Create a Supabase project and enable the Email provider under
**Authentication > Providers**. Add these local redirect URLs under
**Authentication > URL Configuration**:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/reset-password`

Apply the SQL migrations in `supabase/migrations/` using the Supabase CLI or
the SQL editor.

### 2. Configure the frontend

```bash
cd Frontend
cp .env.example .env.local
# Fill .env.local with your own Supabase URL and anon key.
npm install
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

### 3. Configure the backend

Open a second terminal:

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
cp .env.example .env
# Fill .env with your own server-side credentials.
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API runs at [http://localhost:8000](http://localhost:8000). The health
check is available at `/health`. Interactive API documentation is available at
`/docs` during development only.

## Environment Safety

The repository contains placeholder templates only:

- `Frontend/.env.example` -> `Frontend/.env.local`
- `Backend/.env.example` -> `Backend/.env`

Real environment files are ignored by Git. Never commit or paste credentials
into Markdown, screenshots, issues, pull requests, or source code.

The Supabase anon key is intended for the public client. These values are
server-only and must never be exposed to the browser:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `GROQ_API_KEY`

If a secret is ever exposed, rotate it immediately in the relevant provider,
then remove it from Git history. Deleting a file in a later commit does not
remove a secret from earlier commits.

## Useful Commands

Frontend:

```bash
cd Frontend
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

Backend:

```bash
cd Backend
source .venv/bin/activate
pytest
ruff check .
```

## Security Notes

Mocky validates authenticated requests with Supabase JWTs, checks the expected
audience and issuer, verifies token expiry, and checks resource ownership before
processing user data. Production mode disables FastAPI's interactive docs by
default and only allows the configured frontend origin through CORS.

When deploying:

1. Set `ENVIRONMENT=production` and `DEBUG=false`.
2. Store secrets in the hosting provider's secret manager.
3. Set `FRONTEND_URL` to the exact production origin.
4. Use HTTPS for both frontend and backend.
5. Keep Supabase service-role credentials on the backend only.
6. Review Supabase RLS policies after every schema change.

## Project Status

Mocky is an active project. The core authenticated intake, question generation,
customisation, and text practice flows are implemented. Audio/video practice,
advanced history, and richer analytics are planned for later iterations.

## Contributing

Keep changes focused, add or update tests for behavior changes, and run the
frontend lint/type checks plus the backend test suite before opening a pull
request. Never include real credentials in a contribution.
