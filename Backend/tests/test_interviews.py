import json
import time
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
from fastapi.testclient import TestClient
from jose import jwt
import pytest

from app.main import app
from app.config import get_settings
from app.question_generator import (
    generate_interview_questions,
    regenerate_single_question,
    QuestionGenerationError,
)
from app.schemas.interview import QuestionItem

client = TestClient(app)
settings = get_settings()


def create_test_token(
    user_id: str = "test-user-interview-1",
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


SAMPLE_VALID_QUESTIONS_JSON = {
    "questions": [
        {
            "question_text": "How did you design the REST API caching layer in FastAPI at Acme Corp to handle high traffic?",
            "category": "technical",
            "difficulty": "medium",
            "competency": "API Performance & Caching",
            "context_source": "both",
            "rationale": "Candidate used FastAPI at Acme Corp, and the JD requires high-performance API design.",
            "order_index": 0,
        },
        {
            "question_text": "Describe the architecture of a distributed job queue you would design for asynchronous PDF processing.",
            "category": "system_design",
            "difficulty": "medium",
            "competency": "Distributed Asynchronous Processing",
            "context_source": "job_description",
            "rationale": "Target role requires building scalable microservices handling long-running background tasks.",
            "order_index": 1,
        },
        {
            "question_text": "Tell me about a time you encountered a severe database deadlock or latency issue in PostgreSQL in production.",
            "category": "behavioral",
            "difficulty": "medium",
            "competency": "Incident Triage & Problem Resolution",
            "context_source": "resume",
            "rationale": "Candidate managed PostgreSQL databases in their previous project.",
            "order_index": 2,
        },
    ]
}

SAMPLE_CANDIDATE_PROFILE = {
    "summary": "Full Stack Engineer with 4 years of experience.",
    "skills": {
        "programming_languages": ["Python", "TypeScript"],
        "frameworks_tools": ["FastAPI", "React"],
        "databases_cloud": ["PostgreSQL", "AWS"],
        "other": ["Docker", "Git"],
    },
    "experience": [
        {
            "company": "Acme Corp",
            "role": "Backend Engineer",
            "dates": "2022 - Present",
            "highlights": ["Built REST APIs in FastAPI"],
        }
    ],
    "education": [],
    "projects": [],
}

SAMPLE_JOB_PROFILE = {
    "role_title": "Senior Backend Engineer",
    "company_name": "Tech Corp",
    "seniority": "Senior",
    "description": "Looking for a Senior Backend Engineer proficient in Python, FastAPI, and PostgreSQL to design distributed services.",
}


# ==============================================================================
# 1. Authorization & Validation Tests
# ==============================================================================

def test_generate_interview_unauthorized():
    res = client.post("/api/interviews/generate", json={})
    assert res.status_code == 401
    assert "authentication required" in res.json()["detail"].lower()


def test_generate_interview_invalid_resume_uuid():
    token = create_test_token()
    res = client.post(
        "/api/interviews/generate",
        json={"resume_id": "not-a-uuid"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "invalid resume id" in res.json()["detail"].lower()


@patch("app.interviews.get_supabase_admin_client")
def test_generate_interview_resume_ownership_forbidden(mock_get_client):
    owner_id = "user-real-owner"
    requester_id = "user-attacker"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(
        data=[{"id": resume_id, "user_id": owner_id, "status": "parsed"}]
    )
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=requester_id)
    res = client.post(
        "/api/interviews/generate",
        json={"resume_id": resume_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()


@patch("app.interviews.get_supabase_admin_client")
def test_generate_interview_analysis_not_ready(mock_get_client):
    user_id = "user-123"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.side_effect = [
        MagicMock(data=[{"id": resume_id, "user_id": user_id, "status": "parsed"}]),
        MagicMock(data=[{"resume_id": resume_id, "status": "analyzing"}]),  # Not ready!
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        "/api/interviews/generate",
        json={"resume_id": resume_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "analysis is not ready" in res.json()["detail"].lower()


# ==============================================================================
# 2. Missing Key & Error Handling Tests
# ==============================================================================

@patch("app.interviews.get_settings")
@patch("app.interviews.get_supabase_admin_client")
def test_generate_interview_missing_groq_key(mock_get_client, mock_get_settings):
    user_id = "user-123"
    resume_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    current_s = get_settings()
    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = ""
    mock_settings.GROQ_MODEL = current_s.GROQ_MODEL
    mock_settings.SUPABASE_URL = current_s.SUPABASE_URL
    mock_settings.SUPABASE_SERVICE_ROLE_KEY = current_s.SUPABASE_SERVICE_ROLE_KEY
    mock_get_settings.return_value = mock_settings

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.side_effect = [
        MagicMock(data=[{"id": resume_id, "user_id": user_id, "status": "parsed"}]),
        MagicMock(data=[{"resume_id": resume_id, "status": "ready", **SAMPLE_CANDIDATE_PROFILE}]),
        MagicMock(data=[{"id": job_id, "user_id": user_id, **SAMPLE_JOB_PROFILE}]),
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        "/api/interviews/generate",
        json={"resume_id": resume_id, "job_description_id": job_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 503
    assert "groq api key is not configured" in res.json()["detail"].lower()


# ==============================================================================
# 3. Successful Generation & Persistence Tests
# ==============================================================================

@patch("app.interviews.generate_interview_questions")
@patch("app.interviews.get_settings")
@patch("app.interviews.get_supabase_admin_client")
def test_generate_interview_success(mock_get_client, mock_get_settings, mock_generate):
    user_id = "user-123"
    resume_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    interview_id = str(uuid.uuid4())

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key"
    mock_settings.GROQ_MODEL = "openai/gpt-oss-20b"
    mock_get_settings.return_value = mock_settings

    mock_questions = [QuestionItem(**q) for q in SAMPLE_VALID_QUESTIONS_JSON["questions"]]
    mock_generate.return_value = mock_questions

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.side_effect = [
        MagicMock(data=[{"id": resume_id, "user_id": user_id, "status": "parsed"}]),
        MagicMock(data=[{"resume_id": resume_id, "status": "ready", **SAMPLE_CANDIDATE_PROFILE}]),
        MagicMock(data=[{"id": job_id, "user_id": user_id, **SAMPLE_JOB_PROFILE}]),
    ]

    mock_supabase.table().insert().execute.side_effect = [
        # Session insert
        MagicMock(data=[{
            "id": interview_id,
            "user_id": user_id,
            "resume_id": resume_id,
            "job_description_id": job_id,
            "role_title": SAMPLE_JOB_PROFILE["role_title"],
            "company_name": SAMPLE_JOB_PROFILE["company_name"],
            "seniority": SAMPLE_JOB_PROFILE["seniority"],
            "status": "ready",
            "created_at": "2026-09-13T12:00:00Z",
            "updated_at": "2026-09-13T12:00:00Z",
        }]),
        # Questions insert
        MagicMock(data=[
            {
                "id": str(uuid.uuid4()),
                "interview_id": interview_id,
                "order_index": q.order_index,
                "question_text": q.question_text,
                "category": q.category,
                "difficulty": q.difficulty,
                "competency": q.competency,
                "context_source": q.context_source,
                "rationale": q.rationale,
                "created_at": "2026-09-13T12:00:00Z",
            }
            for q in mock_questions
        ]),
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        "/api/interviews/generate",
        json={"resume_id": resume_id, "job_description_id": job_id, "num_questions": 3},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["id"] == interview_id
    assert data["role_title"] == SAMPLE_JOB_PROFILE["role_title"]
    assert len(data["questions"]) == 3
    assert data["questions"][0]["category"] == "technical"
    assert "FastAPI" in data["questions"][0]["question_text"]


# ==============================================================================
# 4. Generator Unit Tests (Retries & Errors)
# ==============================================================================

@pytest.mark.asyncio
async def test_question_generator_retry_success():
    mock_groq = MagicMock()

    response_invalid = MagicMock()
    response_invalid.choices = [MagicMock(message=MagicMock(content="Malformed json without keys"))]

    response_valid = MagicMock()
    response_valid.choices = [MagicMock(message=MagicMock(content=json.dumps(SAMPLE_VALID_QUESTIONS_JSON)))]

    mock_groq.chat.completions.create = AsyncMock(side_effect=[response_invalid, response_valid])

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key"
    mock_settings.GROQ_MODEL = "openai/gpt-oss-20b"

    questions = await generate_interview_questions(
        candidate_profile=SAMPLE_CANDIDATE_PROFILE,
        job_profile=SAMPLE_JOB_PROFILE,
        settings=mock_settings,
        groq_client=mock_groq,
        num_questions=3,
    )

    assert mock_groq.chat.completions.create.call_count == 2
    assert len(questions) == 3
    assert questions[0].category == "technical"


@pytest.mark.asyncio
async def test_question_generator_exhausted_retries_failure():
    mock_groq = MagicMock()

    response_invalid = MagicMock()
    response_invalid.choices = [MagicMock(message=MagicMock(content="Invalid JSON response"))]

    mock_groq.chat.completions.create = AsyncMock(side_effect=[response_invalid, response_invalid])

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key"
    mock_settings.GROQ_MODEL = "openai/gpt-oss-20b"

    with pytest.raises(QuestionGenerationError) as exc_info:
        await generate_interview_questions(
            candidate_profile=SAMPLE_CANDIDATE_PROFILE,
            job_profile=SAMPLE_JOB_PROFILE,
            settings=mock_settings,
            groq_client=mock_groq,
            num_questions=3,
        )

    assert exc_info.value.status_code == 422
    assert "unable to generate valid interview questions" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_regenerate_single_question_unit_success():
    mock_groq = MagicMock()
    single_q_json = {
        "question": {
            "question_text": "How do you handle database connection pooling in high-load FastAPI apps?",
            "category": "technical",
            "difficulty": "hard",
            "competency": "Database Performance",
            "context_source": "both",
            "rationale": "Replacement question grounded in FastAPI and database load.",
            "order_index": 0,
        }
    }
    response_mock = MagicMock()
    response_mock.choices = [MagicMock(message=MagicMock(content=json.dumps(single_q_json)))]
    mock_groq.chat.completions.create = AsyncMock(return_value=response_mock)

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key"
    mock_settings.GROQ_MODEL = "openai/gpt-oss-20b"

    new_q = await regenerate_single_question(
        candidate_profile=SAMPLE_CANDIDATE_PROFILE,
        job_profile=SAMPLE_JOB_PROFILE,
        previous_question_text="Old question",
        category="technical",
        settings=mock_settings,
        groq_client=mock_groq,
    )

    assert new_q.question_text == single_q_json["question"]["question_text"]
    assert new_q.competency == "Database Performance"


# ==============================================================================
# 5. Get Interview by ID & List Tests
# ==============================================================================

@patch("app.interviews.get_supabase_admin_client")
def test_get_interview_success(mock_get_client):
    user_id = "user-123"
    interview_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[{
        "id": interview_id,
        "user_id": user_id,
        "role_title": "Frontend Engineer",
        "company_name": "Acme",
        "seniority": "Junior",
        "status": "ready",
        "resume_id": None,
        "job_description_id": None,
        "created_at": "2026-09-13T12:00:00Z",
        "updated_at": "2026-09-13T12:00:00Z",
    }])
    mock_supabase.table().select().eq().order().execute.return_value = MagicMock(data=[{
        "id": str(uuid.uuid4()),
        "interview_id": interview_id,
        "order_index": 0,
        "question_text": "Explain React hooks.",
        "category": "technical",
        "difficulty": "easy",
        "competency": "React",
        "context_source": "both",
        "rationale": "Grounded question",
        "created_at": "2026-09-13T12:00:00Z",
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.get(
        f"/api/interviews/{interview_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == interview_id
    assert len(data["questions"]) == 1
    assert data["questions"][0]["question_text"] == "Explain React hooks."


@patch("app.interviews.get_supabase_admin_client")
def test_get_interview_forbidden(mock_get_client):
    owner_id = "user-real-owner"
    requester_id = "user-other"
    interview_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[{
        "id": interview_id,
        "user_id": owner_id,
        "role_title": "Frontend Engineer",
        "seniority": "Junior",
        "status": "ready",
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=requester_id)
    res = client.get(
        f"/api/interviews/{interview_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()


@patch("app.interviews.get_supabase_admin_client")
def test_list_interviews(mock_get_client):
    user_id = "user-123"
    interview_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().order().execute.side_effect = [
        # Session list
        MagicMock(data=[{
            "id": interview_id,
            "user_id": user_id,
            "role_title": "Full Stack Engineer",
            "company_name": "Startup Inc",
            "seniority": "Mid",
            "status": "ready",
            "resume_id": None,
            "job_description_id": None,
            "created_at": "2026-09-13T12:00:00Z",
            "updated_at": "2026-09-13T12:00:00Z",
        }]),
        # Question query for session
        MagicMock(data=[]),
    ]
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.get(
        "/api/interviews",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["role_title"] == "Full Stack Engineer"


# ==============================================================================
# 6. Feature 2B: Question Customisation Tests
# ==============================================================================

@patch("app.interviews.get_supabase_admin_client")
def test_update_question_success(mock_get_client):
    user_id = "user-123"
    interview_id = str(uuid.uuid4())
    question_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    # Select question check
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[{
        "id": question_id,
        "interview_id": interview_id,
        "user_id": user_id,
        "order_index": 0,
        "question_text": "Original text?",
        "category": "technical",
        "difficulty": "easy",
        "competency": "Python",
        "context_source": "resume",
        "is_selected": True,
        "created_at": "2026-09-13T12:00:00Z",
    }])
    # Update question
    mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[{
        "id": question_id,
        "interview_id": interview_id,
        "user_id": user_id,
        "order_index": 0,
        "question_text": "Updated question prompt?",
        "category": "technical",
        "difficulty": "hard",
        "competency": "Python Concurrency",
        "context_source": "resume",
        "is_selected": False,
        "created_at": "2026-09-13T12:00:00Z",
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.patch(
        f"/api/interviews/{interview_id}/questions/{question_id}",
        json={
            "question_text": "Updated question prompt?",
            "difficulty": "hard",
            "competency": "Python Concurrency",
            "is_selected": False,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["question_text"] == "Updated question prompt?"
    assert data["difficulty"] == "hard"
    assert data["is_selected"] is False


@patch("app.interviews.get_supabase_admin_client")
def test_update_question_forbidden(mock_get_client):
    owner_id = "user-real-owner"
    attacker_id = "user-attacker"
    interview_id = str(uuid.uuid4())
    question_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[{
        "id": question_id,
        "interview_id": interview_id,
        "user_id": owner_id,
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=attacker_id)
    res = client.patch(
        f"/api/interviews/{interview_id}/questions/{question_id}",
        json={"question_text": "Malicious edit"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()


@patch("app.interviews.get_supabase_admin_client")
def test_create_custom_question_success(mock_get_client):
    user_id = "user-123"
    interview_id = str(uuid.uuid4())
    new_q_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    # Interview session check
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[{
        "id": interview_id,
        "user_id": user_id,
    }])
    # Max order index check
    mock_supabase.table().select().eq().order().limit().execute.return_value = MagicMock(data=[{
        "order_index": 2,
    }])
    # Insert custom question
    mock_supabase.table().insert().execute.return_value = MagicMock(data=[{
        "id": new_q_id,
        "interview_id": interview_id,
        "user_id": user_id,
        "order_index": 3,
        "question_text": "Explain your experience optimizing Kafka consumer lag.",
        "category": "technical",
        "difficulty": "hard",
        "competency": "Distributed Streaming",
        "context_source": "user",
        "rationale": "Custom question added by candidate.",
        "is_selected": True,
        "created_at": "2026-09-13T12:00:00Z",
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/interviews/{interview_id}/questions",
        json={
            "question_text": "Explain your experience optimizing Kafka consumer lag.",
            "category": "technical",
            "difficulty": "hard",
            "competency": "Distributed Streaming",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["id"] == new_q_id
    assert data["context_source"] == "user"
    assert data["order_index"] == 3


@patch("app.interviews.get_supabase_admin_client")
def test_delete_question_success(mock_get_client):
    user_id = "user-123"
    interview_id = str(uuid.uuid4())
    question_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[{
        "id": question_id,
        "user_id": user_id,
    }])
    mock_supabase.table().delete().eq().execute.return_value = MagicMock(data=[])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.delete(
        f"/api/interviews/{interview_id}/questions/{question_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["id"] == question_id


@patch("app.interviews.get_supabase_admin_client")
def test_delete_question_forbidden(mock_get_client):
    owner_id = "user-real-owner"
    attacker_id = "user-attacker"
    interview_id = str(uuid.uuid4())
    question_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[{
        "id": question_id,
        "user_id": owner_id,
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=attacker_id)
    res = client.delete(
        f"/api/interviews/{interview_id}/questions/{question_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()


@patch("app.interviews.regenerate_single_question")
@patch("app.interviews.get_settings")
@patch("app.interviews.get_supabase_admin_client")
def test_regenerate_question_endpoint_success(mock_get_client, mock_get_settings, mock_regen):
    user_id = "user-123"
    interview_id = str(uuid.uuid4())
    question_id = str(uuid.uuid4())

    mock_settings = MagicMock()
    mock_settings.GROQ_API_KEY = "gsk-mock-key"
    mock_settings.GROQ_MODEL = "openai/gpt-oss-20b"
    mock_get_settings.return_value = mock_settings

    mock_regen.return_value = QuestionItem(
        question_text="Brand new replacement question?",
        category="technical",
        difficulty="hard",
        competency="PostgreSQL Sharding",
        context_source="both",
        rationale="Replacement grounded rationale.",
        order_index=0,
        is_selected=True,
    )

    mock_supabase = MagicMock()
    # Question fetch
    mock_supabase.table().select().eq().eq().execute.return_value = MagicMock(data=[{
        "id": question_id,
        "interview_id": interview_id,
        "user_id": user_id,
        "question_text": "Old question to replace",
        "category": "technical",
    }])
    # Interview session fetch
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[{
        "id": interview_id,
        "user_id": user_id,
        "role_title": "Backend Lead",
        "company_name": "CloudCo",
        "seniority": "Senior",
        "resume_id": None,
        "job_description_id": None,
    }])
    # Question update
    mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[{
        "id": question_id,
        "interview_id": interview_id,
        "user_id": user_id,
        "order_index": 0,
        "question_text": "Brand new replacement question?",
        "category": "technical",
        "difficulty": "hard",
        "competency": "PostgreSQL Sharding",
        "context_source": "both",
        "rationale": "Replacement grounded rationale.",
        "is_selected": True,
        "created_at": "2026-09-13T12:00:00Z",
    }])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/interviews/{interview_id}/questions/{question_id}/regenerate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["question_text"] == "Brand new replacement question?"
    assert data["competency"] == "PostgreSQL Sharding"


@patch("app.interviews.get_supabase_admin_client")
def test_reorder_questions_success(mock_get_client):
    user_id = "user-123"
    interview_id = str(uuid.uuid4())
    q1_id = str(uuid.uuid4())
    q2_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    # Interview session check
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[{
        "id": interview_id,
        "user_id": user_id,
    }])
    # Reordered select
    mock_supabase.table().select().eq().order().execute.return_value = MagicMock(data=[
        {
            "id": q2_id,
            "interview_id": interview_id,
            "order_index": 0,
            "question_text": "Question 2 now first",
            "category": "technical",
            "difficulty": "medium",
            "competency": "React",
            "context_source": "both",
            "rationale": "",
            "is_selected": True,
            "created_at": "2026-09-13T12:00:00Z",
        },
        {
            "id": q1_id,
            "interview_id": interview_id,
            "order_index": 1,
            "question_text": "Question 1 now second",
            "category": "technical",
            "difficulty": "medium",
            "competency": "Python",
            "context_source": "both",
            "rationale": "",
            "is_selected": True,
            "created_at": "2026-09-13T12:00:00Z",
        },
    ])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)
    res = client.post(
        f"/api/interviews/{interview_id}/questions/reorder",
        json={"question_ids": [q2_id, q1_id]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["id"] == q2_id
    assert data[1]["id"] == q1_id
