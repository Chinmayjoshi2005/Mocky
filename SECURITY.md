# Security Policy

## Supported Versions

Security fixes are applied to the latest version on the default branch. Older
commits and deployments may not receive fixes.

## Reporting a Vulnerability

Please do not open a public issue for a suspected security vulnerability.
Instead, use GitHub's private vulnerability reporting for this repository when it
is enabled, or contact the repository maintainers privately through the GitHub
profile associated with the project.

Include:

- A short description of the issue
- The affected file, endpoint, or dependency
- Reproduction steps or a minimal proof of concept
- The possible impact
- Any suggested mitigation

Do not include real API keys, JWTs, personal data, or private user content in a
report. Redact credentials before sharing logs or screenshots.

## Secret Handling

- Keep `Backend/.env` and `Frontend/.env.local` local and untracked.
- Use the checked-in `.env.example` files as placeholder templates only.
- Keep Supabase service-role keys, JWT secrets, and Groq keys on the backend.
- Rotate a credential immediately if it may have been exposed.
- Removing a secret from the latest commit does not remove it from Git history.

## Deployment Baseline

Production deployments should use `ENVIRONMENT=production`, `DEBUG=false`,
HTTPS, an exact `FRONTEND_URL`, provider-managed secrets, and reviewed Supabase
Row Level Security policies.
