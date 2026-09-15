import json
import time
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
from fastapi.testclient import TestClient
from jose import jwt
import pytest

from app.main import app
from app.config import get_settings
from app.analyzer import extract_candidate_profile, ResumeAnalysisError
from app.schemas.analysis import CandidateProfileSchema

client = TestClient(app)
settings = get_settings()


def create_test_token(
    user_id: str = "test-user-analysis-1",
    email: str = "candidate@example.com",
    exp_offset: int = 3600,
) -> str:
    signing_secret = settings.SUPABASE_JWT_SECRET
    base_url = settings.SUPABASE_URL.rstrip("/")
    now = int(time.time())
    payload = {
        "iss": f"{base_url}/auth/v1",
        "sub": user_id,
        "aud": "authenticated",
        "exp": now + exp_offset,
        "iat": now,
        "email": email,
        "role": "authenticated",
    }
    return jwt.encode(payload, signing_secret, algorithm="HS256")


SAMPLE_VALID_PROFILE_JSON = {
    "summary": "Full Stack Engineer with 4+ years of experience in distributed systems.",
    "skills": {
        "programming_languages": ["Python", "TypeScript"],
        "frameworks_tools": ["FastAPI", "React", "Docker"],
        "databases_cloud": ["PostgreSQL", "AWS"],
        "other": ["Git", "CI/CD"],
    },
    "experience": [
        {
            "company": "Acme Corp",
            "role": "Software Engineer",
            "dates": "2022 - Present",
            "highlights": ["Developed REST APIs with 99.9% uptime", "Implemented automated CI pipelines"],
        }
    ],
    "education": [
        {
            "institution": "Tech University",
            "degree": "B.S. in Computer Science",
            "dates": "2018 - 2022",
            "highlights": ["Dean's List"],
        }
    ],
    "projects": [
        {
            "name": "Cloud Monitor",
            "technologies": ["Python", "Docker"],
            "highlights": ["Real-time system telemetry collector"],
        }
    ],
}


# ==============================================================================
# 1. Authorization & Input Validation Tests
# ==============================================================================

def test_analyze_resume_unauthorized():
    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/resumes/{fake_id}/analyze")
    assert res.status_code == 401
    assert "authentication required" in res.json()["detail"].lower()


def test_analyze_resume_invalid_uuid():
    token = create_test_token()
    res = client.post(
        "/api/resumes/not-a-valid-uuid/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "invalid resume id" in res.json()["detail"].lower()


@patch("app.resumes.get_supabase_admin_client")
def test_analyze_resume_not_found(mock_get_client):
    user_id = "user-123"
    fake_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/resumes/{fake_id}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404
    assert "resume not found" in res.json()["detail"].lower()


@patch("app.resumes.get_supabase_admin_client")
def test_analyze_resume_ownership_rejection(mock_get_client):
    owner_id = "user-owner"
    requester_id = "user-other"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(
        data=[{
            "id": resume_id,
            "user_id": owner_id,
            "status": "parsed",
            "parsed_text": "Sample text",
            "original_filename": "resume.pdf",
        }]
    )
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=requester_id)
    res = client.post(
        f"/api/resumes/{resume_id}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()


@patch("app.resumes.get_supabase_admin_client")
def test_analyze_resume_unparsed_rejection(mock_get_client):
    user_id = "user-123"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(
        data=[{
            "id": resume_id,
            "user_id": user_id,
            "status": "uploaded",  # Not yet parsed!
            "parsed_text": None,
            "original_filename": "resume.pdf",
        }]
    )
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/resumes/{resume_id}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "has not been parsed yet" in res.json()["detail"].lower()


# ==============================================================================
# 2. Duplicate Prevention & Key Configuration Tests
# ==============================================================================

@patch("app.resumes.get_supabase_admin_client")
def test_analyze_resume_duplicate_reuse(mock_get_client):
    """When a ready analysis exists and reanalyze=False, return existing without re-running."""
    user_id = "user-123"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    # Resume table query
    mock_supabase.table().select().eq().execute.side_effect = [
        MagicMock(data=[{
            "id": resume_id,
            "user_id": user_id,
            "status": "parsed",
            "parsed_text": "Experienced Python Engineer...",
            "original_filename": "resume.pdf",
        }]),
        # Analysis table query
        MagicMock(data=[{
            "id": str(uuid.uuid4()),
            "resume_id": resume_id,
            "user_id": user_id,
            "status": "ready",
            "summary": "Existing summary",
            "skills": SAMPLE_VALID_PROFILE_JSON["skills"],
            "experience": SAMPLE_VALID_PROFILE_JSON["experience"],
            "education": SAMPLE_VALID_PROFILE_JSON["education"],
            "projects": SAMPLE_VALID_PROFILE_JSON["projects"],
            "error": None,
            "analysis_version": 1,
            "created_at": "2026-09-12T12:00:00Z",
            "updated_at": "2026-09-12T12:00:00Z",
        }]),
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/resumes/{resume_id}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["profile"]["summary"] == "Existing summary"


@patch("app.resumes.get_settings")
@patch("app.resumes.get_supabase_admin_client")
def test_analyze_resume_missing_groq_key(mock_get_client, mock_get_settings):
    """When GROQ_API_KEY is not set, safely return 503 and mark analysis as failed."""
    user_id = "user-123"
    resume_id = str(uuid.uuid4())

    # Settings with empty key
    current_s = get_settings()
    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = ""
    mock_settings.GROQ_MODEL = current_s.GROQ_MODEL
    mock_settings.SUPABASE_URL = current_s.SUPABASE_URL
    mock_settings.SUPABASE_SERVICE_ROLE_KEY = current_s.SUPABASE_SERVICE_ROLE_KEY
    mock_get_settings.return_value = mock_settings

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.side_effect = [
        MagicMock(data=[{
            "id": resume_id,
            "user_id": user_id,
            "status": "parsed",
            "parsed_text": "Experienced Python Engineer...",
            "original_filename": "resume.pdf",
        }]),
        MagicMock(data=[]),  # No existing analysis
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/resumes/{resume_id}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 503
    assert "groq api key is not configured" in res.json()["detail"].lower()


# ==============================================================================
# 3. Successful Extraction & Persistence Tests
# ==============================================================================

@patch("app.resumes.extract_candidate_profile")
@patch("app.resumes.get_settings")
@patch("app.resumes.get_supabase_admin_client")
def test_analyze_resume_success(mock_get_client, mock_get_settings, mock_extract):
    user_id = "user-123"
    resume_id = str(uuid.uuid4())

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key-for-testing"
    mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"
    mock_get_settings.return_value = mock_settings

    mock_profile = CandidateProfileSchema(**SAMPLE_VALID_PROFILE_JSON)
    mock_extract.return_value = mock_profile

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.side_effect = [
        MagicMock(data=[{
            "id": resume_id,
            "user_id": user_id,
            "status": "parsed",
            "parsed_text": "Experienced Python Engineer...",
            "original_filename": "resume.pdf",
        }]),
        MagicMock(data=[]),  # No existing analysis
    ]
    mock_supabase.table().upsert().execute.return_value = MagicMock(data=[{
        "id": str(uuid.uuid4()),
        "resume_id": resume_id,
        "user_id": user_id,
        "status": "ready",
        "summary": mock_profile.summary,
        "skills": mock_profile.skills.model_dump(),
        "experience": [item.model_dump() for item in mock_profile.experience],
        "education": [item.model_dump() for item in mock_profile.education],
        "projects": [item.model_dump() for item in mock_profile.projects],
        "error": None,
        "analysis_version": 1,
        "created_at": "2026-09-12T12:00:00Z",
        "updated_at": "2026-09-12T12:00:00Z",
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/resumes/{resume_id}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["profile"]["summary"] == mock_profile.summary
    assert "Python" in data["profile"]["skills"]["programming_languages"]
    assert len(data["profile"]["experience"]) == 1
    assert data["profile"]["experience"][0]["company"] == "Acme Corp"


# ==============================================================================
# 4. Analyzer Unit Tests (Retry on Invalid JSON & Failure)
# ==============================================================================

@pytest.mark.asyncio
async def test_analyzer_retry_on_invalid_json_success():
    """Test that extract_candidate_profile retries once when initial output is invalid JSON."""
    mock_groq = MagicMock()

    # Choice 1: Invalid JSON string; Choice 2: Valid JSON string
    response_invalid = MagicMock()
    response_invalid.choices = [MagicMock(message=MagicMock(content="Invalid JSON without closing braces {,"))]

    response_valid = MagicMock()
    response_valid.choices = [MagicMock(message=MagicMock(content=json.dumps(SAMPLE_VALID_PROFILE_JSON)))]

    mock_groq.chat.completions.create = AsyncMock(side_effect=[response_invalid, response_valid])

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key"
    mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"

    result = await extract_candidate_profile(
        resume_text="Resume content here",
        settings=mock_settings,
        groq_client=mock_groq,
    )

    assert mock_groq.chat.completions.create.call_count == 2
    assert result.summary == SAMPLE_VALID_PROFILE_JSON["summary"]
    assert "Python" in result.skills.programming_languages


@pytest.mark.asyncio
async def test_analyzer_failure_after_exhausted_retries():
    """Test that extract_candidate_profile raises ResumeAnalysisError if both attempts fail."""
    mock_groq = MagicMock()

    response_invalid = MagicMock()
    response_invalid.choices = [MagicMock(message=MagicMock(content="Not json at all"))]

    mock_groq.chat.completions.create = AsyncMock(side_effect=[response_invalid, response_invalid])

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key"
    mock_settings.GROQ_MODEL = "llama-3.3-70b-versatile"

    with pytest.raises(ResumeAnalysisError) as exc_info:
        await extract_candidate_profile(
            resume_text="Resume content here",
            settings=mock_settings,
            groq_client=mock_groq,
        )

    assert exc_info.value.status_code == 422
    assert "unable to extract a valid structured profile" in exc_info.value.message.lower()


# ==============================================================================
# 5. Get Resume Analysis Endpoint Tests
# ==============================================================================

@patch("app.resumes.get_supabase_admin_client")
def test_get_resume_analysis_success(mock_get_client):
    user_id = "user-123"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.side_effect = [
        # Resume query
        MagicMock(data=[{"id": resume_id, "user_id": user_id}]),
        # Analysis query
        MagicMock(data=[{
            "id": str(uuid.uuid4()),
            "resume_id": resume_id,
            "status": "ready",
            "summary": "Sample summary",
            "skills": SAMPLE_VALID_PROFILE_JSON["skills"],
            "experience": SAMPLE_VALID_PROFILE_JSON["experience"],
            "education": SAMPLE_VALID_PROFILE_JSON["education"],
            "projects": SAMPLE_VALID_PROFILE_JSON["projects"],
            "error": None,
            "analysis_version": 1,
            "created_at": "2026-09-12T12:00:00Z",
            "updated_at": "2026-09-12T12:00:00Z",
        }]),
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.get(
        f"/api/resumes/{resume_id}/analysis",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["profile"]["summary"] == "Sample summary"


@patch("app.resumes.get_supabase_admin_client")
def test_get_resume_analysis_not_found(mock_get_client):
    user_id = "user-123"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.side_effect = [
        MagicMock(data=[{"id": resume_id, "user_id": user_id}]),
        MagicMock(data=[]),  # No analysis record found
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.get(
        f"/api/resumes/{resume_id}/analysis",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404
    assert "analysis not found" in res.json()["detail"].lower()
