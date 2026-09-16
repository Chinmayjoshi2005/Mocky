# Mocky Project Report

## 1. Abstract

Mocky is an AI-powered mock technical interview platform developed to help
candidates practise for role-specific interviews. The application allows a
user to create an account, upload a PDF resume, enter a target job description,
generate interview questions, customise those questions, and practise through
a text-based interview session. Submitted answers receive AI-generated
feedback, including a score, strengths, improvements, and a model answer.

The system is implemented as a full-stack application. The frontend provides
the authentication, intake, interview review, and practice interfaces. The
backend provides authenticated API operations, resume processing, AI-based
analysis, question generation, and answer evaluation. Supabase provides user
authentication, database storage, file storage, and row-level security.

## 2. Introduction

Technical interviews require preparation that is relevant to both the
candidate's previous experience and the requirements of a target position.
Generic question lists do not always reflect a candidate's resume, the
seniority of the role, or the competencies described in a job description.

Mocky addresses this preparation process through a guided workflow. A user
starts with authentication, supplies personal career information through a
resume, adds a job description, and receives questions grounded in both
sources. The user can then review, edit, select, reorder, and regenerate
questions before beginning practice.

The project is organised into three primary areas:

- `Frontend/` contains the Next.js and TypeScript user interface.
- `Backend/` contains the FastAPI application and AI processing services.
- `supabase/` contains database migrations, security policies, indexes, and
  triggers.

## 3. Problem Domain

The problem domain is technical interview preparation and candidate assessment.
Candidates commonly face the following difficulties:

- Preparing from generic questions that do not match their actual experience
- Connecting resume projects and skills to a target job description
- Selecting questions at an appropriate difficulty and seniority level
- Receiving useful feedback after writing an answer
- Measuring improvement across a practice session
- Keeping resumes, job descriptions, questions, and answers connected to the
  correct user account

Manual preparation can also be time-consuming because the candidate must read
the job description, identify relevant competencies, create questions, and
evaluate answers without a consistent process.

## 4. Solution Domain

Mocky provides an authenticated workflow for converting candidate and job data
into structured interview practice.

### Authentication and Account Management

Users can register and sign in with email and password. The application also
supports email verification, password reset, password updates, logout, and
protected routes. Supabase Auth manages the session, while the backend verifies
bearer tokens before processing protected requests.

### Resume Processing

The user uploads a PDF resume. The backend validates the upload and extracts
text using PyPDF. The extracted content is then available for candidate profile
analysis, including skills, experience, education, projects, and a summary.

### Job Description Intake

The user provides a role title, company name, seniority level, and job
description. These values form the target context for question generation.

### Question Generation and Customisation

The backend uses the resume analysis and job description to generate questions.
Questions contain information such as category, difficulty, competency,
context source, rationale, and order. The user can edit question content,
change question metadata, select questions for practice, reorder them, delete
questions, add custom questions, and regenerate individual questions.

### Text Practice and Evaluation

The user starts a practice session from the selected questions. Each answer is
submitted to the backend and evaluated through the Groq-based evaluation flow.
The feedback includes a score, qualitative rating, strengths, improvements, and
a model answer. When the session is completed, Mocky calculates an overall
score from the evaluated answers.

### Interface and Theme

The frontend uses a responsive claymorphism interface with a portrait workspace
of approximately 700 pixels, a persistent dotted background, bright and dark
display modes, coloured cards, hidden scrollbar styling, and accessible icon
controls. These are presentation features only; they do not alter the data or
authentication workflow.

### Security and Data Protection

The backend checks JWT signature, audience, issuer, and expiration. Protected
resources are checked for ownership before access or modification. Supabase
Row Level Security policies protect user-owned records. Service-role keys, JWT
secrets, and Groq keys remain backend-only, while environment files are kept
outside version control. Production mode disables interactive FastAPI
documentation and restricts CORS to the configured frontend origin.

## 5. Application Domain

Mocky can be used by candidates preparing for technical interviews, especially
when they want practice related to a particular role or company. Its workflow
supports several application activities:

1. A candidate registers and verifies an account.
2. The candidate uploads a resume for text extraction and profile analysis.
3. The candidate enters the target job and seniority information.
4. Mocky generates questions based on the candidate and role context.
5. The candidate reviews and customises the question set.
6. The candidate selects questions for a text practice session.
7. Mocky evaluates each answer and presents feedback.
8. The candidate reviews the overall practice score and improvement guidance.

The project is suitable for individual self-practice because each user's
resume, job descriptions, interview sessions, and answers are associated with
that user's authenticated account. It also provides a foundation for future
extensions such as richer practice history and additional interview modes,
although audio and video practice are not currently implemented.

## 6. Conclusion

Mocky combines authentication, resume understanding, job-specific context,
AI-generated questions, question customisation, and evaluated text practice in
one application. The frontend provides a guided candidate experience, while
the FastAPI backend coordinates validation, ownership checks, AI services, and
Supabase operations.

The current implementation covers the main authenticated intake, interview
question, and text-practice workflows. Its security model separates public
client configuration from backend secrets and applies ownership checks to user
data. Future development can build on this foundation with interview history,
analytics, and additional practice formats.

## 7. References

The following project files and technologies were used as references for this
implementation:

1. Mocky source repository, `Frontend/` and `Backend/` directories.
2. Mocky database migrations in `supabase/migrations/`.
3. Mocky setup and security documentation in `README.md`, `SECURITY.md`, and
   `docs/supabase-setup.md`.
4. Next.js App Router documentation and project configuration in
   `Frontend/package.json`.
5. React and TypeScript implementation in `Frontend/src/`.
6. FastAPI and Pydantic implementation in `Backend/app/`.
7. Supabase Auth, database, storage, and Row Level Security services.
8. Groq SDK integration for candidate analysis, question generation, and answer
   evaluation.
9. PyPDF integration for PDF resume text extraction.
10. PyJWT and cryptography-backed JWT verification for authenticated API access.
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
