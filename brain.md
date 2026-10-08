# Mocky Project Brain

Last reviewed: 2026-10-08

This document tracks the roadmap in `mermaid-diagram.png` against the
implementation currently present in the repository. "Implemented" means there
is code for the feature; provider credentials, database migrations, and
deployment configuration must still be supplied by the project owner where
noted.

## Product Summary

Mocky is an authenticated AI interview-preparation platform. A candidate
uploads a PDF resume, supplies a target role and job description, reviews
personalised interview questions, and practises answers with AI evaluation.
The frontend is Next.js 16 / React 19 / TypeScript; the API is FastAPI; Supabase
provides authentication, Postgres, and storage; Groq provides AI and audio
transcription.

## Roadmap Status

### 0. Platform and UX foundation

- [x] 0A Authentication and accounts: signup, login, verification, password
  reset, protected routes, and account settings are implemented.
- [x] 0B Design system, navigation, responsive UX: the shared component styles,
  responsive screens, and theme support are implemented.
- [ ] 0C Reliability, errors, security, deployment: JWT validation, ownership
  checks, RLS migrations, upload validation, error screens, and CORS controls
  exist. Remaining: add/restore automated backend tests, verify production
  configuration, and run a live deployment/security review. Dependency audit
  found a critical advisory affecting the currently pinned Next.js release;
  updating to the patched release is blocked by package-registry connectivity.

### 1. Candidate context

- [x] 1A Resume upload: PDF upload and storage are implemented.
- [x] 1B PDF parsing: server-side PDF extraction is implemented.
- [x] 1C Resume understanding: structured profile extraction is implemented in
  `Backend/app/analyzer.py` and `Backend/app/resumes.py`; the roadmap's "next"
  annotation is stale.
- [x] 1D Custom target role and job description: intake and persistence are
  implemented.
- [x] 1E Context review: the intake flow presents the extracted profile and
  target-job context for review.

### 2. Interview preparation

- [x] 2A Personalised question generation: implemented with candidate/JD
  grounding and validation.
- [x] 2B Question review and customisation: editing, selection, ordering,
  custom questions, and regeneration are implemented.
- [x] 2C Text practice interview: sessions, answer submission, and completion
  are implemented.
- [x] 2D Answer feedback and scoring: evaluated answers and aggregate scores
  are implemented.
- [x] 2E Voice practice interview: browser recording and backend transcription
  are integrated into the practice flow. This is voice-to-text answer input,
  not a live spoken AI interviewer.

### 3. Career intelligence

- [ ] 3A ATS-readiness and job-match score.
- [ ] 3B Skill-gap analysis.
- [ ] 3C Resume-improvement guidance.
- [ ] 3D Personal learning roadmap.

These require a grounded analysis contract, persistence/versioning, and a user
interface; do not describe a heuristic as an AI score without disclosing how
it was derived.

### 4. Mocky AI Copilot

- [ ] 4A Context-aware chat assistant.
- [ ] 4B Resume, JD, and interview help.
- [ ] 4C Optional cited web research.
- [ ] 4D Explicit AI fallback and safe failure states.

The existing resume/question/evaluation prompts already treat user content as
untrusted. A general copilot and source-cited research are not implemented.
Web research must remain opt-in and sources must be shown to the user.

### 5. Progress and insights

- [x] 5A Interview/practice history: authenticated users can review their
  recent in-progress and completed practice sessions.
- [x] 5B Progress dashboard: overall practice totals and score averages are
  calculated from saved sessions and answers.
- [x] 5C Improvement goals: users can create, complete, and delete personal
  goals.

## Implementation Notes

- Apply the new Supabase migration in `supabase/migrations/` before using
  improvement goals in an existing Supabase project.
- Backend routes use the server-only Supabase service-role client and scope
  reads/writes by the authenticated user's ID.
- Practice history is derived from existing `practice_sessions`,
  `practice_answers`, and `interviews` records; no duplicate history data is
  stored.
- AI-dependent features require a valid backend `GROQ_API_KEY`.
- Frontend and backend environment files are intentionally not committed.

## Next Work

1. Build career intelligence (3A-3D) as one persisted, validated analysis
   feature.
2. Build the AI Copilot (4A-4D), with context boundaries, safe provider errors,
   and optional source citations only when real web retrieval is configured.
3. Expand focused backend tests beyond progress and verify the Supabase
   migration and full auth-to-practice-to-progress flow against a development
   project.
4. Review production deployment settings and rotate any credentials shared
   outside their intended secret manager.
