# Mocky Project Report

## Summary

Mocky is an AI-powered mock technical interview platform. Users create an
account, upload a resume, provide a target job description, generate tailored
interview questions, customise the question set, and complete text practice
sessions with AI feedback and scoring.

## Technology Stack

### Frontend

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR and browser clients
- Lucide React icons
- Radix UI Slot
- Class Variance Authority
- ESLint and TypeScript checks

### Backend

- Python 3.9+ runtime support
- FastAPI
- Uvicorn
- Pydantic and Pydantic Settings
- PyJWT with cryptography-backed verification
- Supabase Python client
- Groq SDK for AI analysis and evaluation
- PyPDF for resume parsing
- Ruff for linting
- Pytest and pytest-asyncio for validation

### Data and Infrastructure

- Supabase Auth for account management and sessions
- Supabase Postgres for application data
- Supabase Storage for resume files
- SQL migrations under `supabase/migrations/`
- Vercel-compatible frontend deployment
- Render-compatible backend deployment

## Main Features

- Email registration and login
- Email verification flow
- Password reset and password update
- Protected routes and session-aware middleware
- Resume upload and PDF text extraction
- Candidate profile analysis
- Job description intake
- AI interview question generation
- Question editing, selection, ordering, and regeneration
- Text interview practice
- Per-answer AI feedback
- Overall practice score
- Responsive claymorphism interface
- Portrait workspace layout capped at approximately 700px
- Interactive dot-grid background
- Persistent bright and dark display modes
- Hidden scrollbar styling while preserving scrolling

## Architecture

The application is split into three main layers:

1. `Frontend/` contains the user interface, authentication screens, route
   protection, Supabase browser/server clients, and intake/practice workflows.
2. `Backend/` contains authenticated API routes, ownership checks, resume
   processing, question generation, answer evaluation, and Supabase service-role
   operations.
3. `supabase/` contains database migrations, row-level security policies,
   indexes, triggers, and feature schemas.

The frontend uses Supabase Auth for user sessions and sends bearer tokens to the
backend. The backend verifies the token, confirms the authenticated user, and
checks ownership before accessing user data.

## Security Model

- Real `.env` files are ignored and are not part of the repository.
- Frontend configuration uses only public Supabase client values.
- Service-role keys, JWT secrets, and Groq keys remain backend-only.
- JWT audience, issuer, signature, and expiration are checked.
- Invalid authentication responses do not expose verifier internals.
- Production mode disables interactive FastAPI documentation.
- CORS is limited to the configured frontend origin and required headers.
- Supabase row-level security policies protect user-owned records.
- Backend endpoints validate IDs and check resource ownership.
- Uploads are limited to PDF files and validated before processing.
- `SECURITY.md` defines vulnerability reporting and secret handling.

## User Flow

1. A visitor registers with an email and strong password.
2. Supabase sends a verification link when email confirmation is enabled.
3. The user signs in and reaches the protected dashboard.
4. The user uploads a PDF resume and waits for parsing and analysis.
5. The user enters a role, company, seniority, and job description.
6. Mocky generates a tailored interview question set.
7. The user reviews and customises the questions.
8. Selected questions can be practised in a text interview session.
9. Each answer receives feedback and a score.
10. The completed session displays an overall result.

## Local Commands

Frontend:

```bash
cd Frontend
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

Backend:

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
ruff check .
```

## Validation Status

The frontend production build, TypeScript check, and ESLint checks pass. The
backend test sources were intentionally removed from the repository as part of
the cleanup request, so no backend test suite is currently included.

Dependency audits should be run in CI and reviewed whenever package versions
change. Provider-managed secrets should be rotated immediately if they are ever
exposed.

## Current Limitations

- Audio and video interview modes are not implemented.
- Advanced history and analytics are planned future work.
- The dark theme currently uses a client-side preference and may briefly show
  the bright theme before hydration on a fresh load.
- Dependency advisories should continue to be monitored as upstream fixes are
  released.
