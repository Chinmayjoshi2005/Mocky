# Mocky Backend

FastAPI + Pydantic backend for Mocky - AI-powered mock technical interview platform.

## Quick Start

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# Get these from: Supabase Dashboard > Settings > API
# JWT Secret is in Settings > API > JWT Secret

# Run development server
uvicorn app.main:app --reload --port 8000
```

API available at [http://localhost:8000](http://localhost:8000)

## Project Structure

```
app/
├── __init__.py
├── main.py              # FastAPI app + routes
├── config.py            # Pydantic Settings
└── auth.py              # JWT verification middleware
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check | No |
| GET | `/api/me` | Current user info | Yes (Bearer token) |

## Authentication

The backend verifies Supabase JWT tokens using the `SUPABASE_JWT_SECRET`.

### Token Verification

- Validates signature using HS256
- Checks `aud` claim = "authenticated"
- Checks `iss` claim = Supabase auth URL
- Checks expiration (`exp` claim)

### Usage in Frontend

```typescript
// Get session from Supabase client
const { data: { session } } = await supabase.auth.getSession();

// Send with requests
fetch('http://localhost:8000/api/me', {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`
  }
})
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Project URL (https://xxx.supabase.co) | Yes |
| `SUPABASE_ANON_KEY` | Public anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) | Yes |
| `SUPABASE_JWT_SECRET` | JWT signing secret | Yes |
| `FRONTEND_URL` | CORS origin (http://localhost:3000) | Yes |
| `ENVIRONMENT` | development/production | No |
| `DEBUG` | Enable debug mode | No |

## Security

⚠️ **Never commit `.env`** to version control. The Backend `.gitignore` excludes `.env` and `.env.*` (except `.env.example`). If secrets are exposed:

1. Rotate credentials immediately (Supabase dashboard, Groq console)
2. Use `git filter-repo` or BFG Repo-Cleaner to purge history
3. Review GitHub's [removing sensitive data](https://docs.github.com/en/get-started/recipes/managing-commits/removing-sensitive-data-from-a-repository) guide

## Available Scripts

```bash
uvicorn app.main:app --reload --port 8000  # Dev server
pytest                                      # Run tests
ruff check .                                # Lint
```