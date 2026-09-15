import io
import time
from unittest.mock import MagicMock, patch
import uuid
from fastapi.testclient import TestClient
from jose import jwt
from pypdf import PdfReader, PdfWriter
import pytest

from app.main import app
from app.config import get_settings
from app.parser import (
    extract_text_from_pdf,
    EmptyPDFError,
    OversizedPDFError,
    CorruptPDFError,
    PasswordProtectedPDFError,
    ScannedPDFError,
)

client = TestClient(app)
settings = get_settings()


def create_test_token(
    user_id: str = "test-user-uuid-1",
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


def make_valid_pdf_bytes(
    text: str = (
        "Jane Doe Senior Software Engineer Education Experience Skills Projects "
        "Python FastAPI Docker Kubernetes AWS PostgreSQL React Node Next TypeScript "
        "Built distributed systems and REST APIs with high availability"
    ),
) -> bytes:
    content = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET"
    content_len = len(content)
    pdf = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length {content_len} >>
stream
{content}
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 1 0 R >>
startxref
100
%%EOF"""
    return pdf.encode("latin-1")


def make_encrypted_pdf_bytes() -> bytes:
    base_pdf = make_valid_pdf_bytes()
    reader = PdfReader(io.BytesIO(base_pdf))
    writer = PdfWriter()
    for p in reader.pages:
        writer.add_page(p)
    writer.encrypt("topsecret123")
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_blank_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ==============================================================================
# 1. Parser Unit Tests
# ==============================================================================

def test_parser_valid_pdf():
    pdf_bytes = make_valid_pdf_bytes()
    text, word_count = extract_text_from_pdf(pdf_bytes)
    assert "Jane Doe" in text
    assert "Software Engineer" in text
    assert word_count >= 10


def test_parser_empty_bytes():
    with pytest.raises(EmptyPDFError) as exc:
        extract_text_from_pdf(b"")
    assert "empty" in exc.value.message.lower()


def test_parser_oversized_bytes():
    with pytest.raises(OversizedPDFError) as exc:
        extract_text_from_pdf(b"A" * 100, max_bytes=50)
    assert "exceeds" in exc.value.message.lower()


def test_parser_invalid_header():
    with pytest.raises(CorruptPDFError) as exc:
        extract_text_from_pdf(b"Not a PDF header")
    assert "valid pdf" in exc.value.message.lower()


def test_parser_corrupt_stream():
    with pytest.raises(CorruptPDFError) as exc:
        extract_text_from_pdf(b"%PDF-1.4\nCorrupt garbage payload with EOF missing")
    assert "corrupt" in exc.value.message.lower()


def test_parser_password_protected():
    enc_bytes = make_encrypted_pdf_bytes()
    with pytest.raises(PasswordProtectedPDFError) as exc:
        extract_text_from_pdf(enc_bytes)
    assert "password-protected" in exc.value.message.lower()


def test_parser_scanned_blank_pdf():
    blank_bytes = make_blank_pdf_bytes()
    with pytest.raises(ScannedPDFError) as exc:
        extract_text_from_pdf(blank_bytes)
    assert "scanned" in exc.value.message.lower()
    assert "ocr" in exc.value.message.lower()


# ==============================================================================
# 2. Endpoint Authorization & Ownership Tests
# ==============================================================================

def test_parse_endpoint_unauthorized():
    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/resumes/{fake_id}/parse")
    assert res.status_code == 401
    assert res.json()["detail"] == "Authentication required"


def test_parse_endpoint_invalid_uuid():
    token = create_test_token()
    res = client.post(
        "/api/resumes/not-a-valid-uuid/parse",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "Invalid resume ID" in res.json()["detail"]


@patch("app.resumes.get_supabase_admin_client")
def test_parse_endpoint_not_found(mock_get_client):
    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[])
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id="user-123")
    fake_id = str(uuid.uuid4())

    res = client.post(
        f"/api/resumes/{fake_id}/parse",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


@patch("app.resumes.get_supabase_admin_client")
def test_parse_endpoint_ownership_rejection(mock_get_client):
    owner_id = "user-alice"
    requester_id = "user-bob"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().execute.return_value = MagicMock(
        data=[{
            "id": resume_id,
            "user_id": owner_id,
            "storage_path": f"{owner_id}/resume.pdf",
            "original_filename": "alice_resume.pdf",
            "status": "uploaded",
        }]
    )
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=requester_id)

    res = client.post(
        f"/api/resumes/{resume_id}/parse",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()


# ==============================================================================
# 3. Endpoint Extraction & Error Handling Tests
# ==============================================================================

@patch("app.resumes.get_supabase_admin_client")
def test_parse_endpoint_success(mock_get_client):
    user_id = "user-alice"
    resume_id = str(uuid.uuid4())
    pdf_bytes = make_valid_pdf_bytes()

    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table

    mock_table.select().eq().execute.return_value = MagicMock(
        data=[{
            "id": resume_id,
            "user_id": user_id,
            "storage_path": f"{user_id}/resume.pdf",
            "original_filename": "alice_resume.pdf",
            "status": "uploaded",
        }]
    )
    mock_supabase.storage.from_().download.return_value = pdf_bytes
    mock_table.update().eq().execute.return_value = MagicMock()
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)

    res = client.post(
        f"/api/resumes/{resume_id}/parse",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == resume_id
    assert data["status"] == "parsed"
    assert data["original_filename"] == "alice_resume.pdf"
    assert data["word_count"] > 10
    assert "parsed_at" in data

    # Verify DB update was called with status 'parsed' and parsed_text
    updates = [call.args[0] for call in mock_table.update.call_args_list if call.args]
    parsed_update = next(u for u in updates if u.get("status") == "parsed")
    assert parsed_update["parsed_text"] is not None
    assert parsed_update["parsing_error"] is None


@patch("app.resumes.get_supabase_admin_client")
def test_parse_endpoint_password_protected_pdf(mock_get_client):
    user_id = "user-alice"
    resume_id = str(uuid.uuid4())
    enc_bytes = make_encrypted_pdf_bytes()

    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table

    mock_table.select().eq().execute.return_value = MagicMock(
        data=[{
            "id": resume_id,
            "user_id": user_id,
            "storage_path": f"{user_id}/resume.pdf",
            "original_filename": "alice_resume.pdf",
            "status": "uploaded",
        }]
    )
    mock_supabase.storage.from_().download.return_value = enc_bytes
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)

    res = client.post(
        f"/api/resumes/{resume_id}/parse",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422
    data = res.json()
    assert "password-protected" in data["detail"].lower()

    # Verify DB updated to 'failed'
    updates = [call.args[0] for call in mock_table.update.call_args_list if call.args]
    failed_update = next(u for u in updates if u.get("status") == "failed")
    assert "password-protected" in failed_update["parsing_error"].lower()


@patch("app.resumes.get_supabase_admin_client")
def test_parse_endpoint_scanned_pdf(mock_get_client):
    user_id = "user-alice"
    resume_id = str(uuid.uuid4())
    blank_bytes = make_blank_pdf_bytes()

    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table

    mock_table.select().eq().execute.return_value = MagicMock(
        data=[{
            "id": resume_id,
            "user_id": user_id,
            "storage_path": f"{user_id}/resume.pdf",
            "original_filename": "alice_resume.pdf",
            "status": "uploaded",
        }]
    )
    mock_supabase.storage.from_().download.return_value = blank_bytes
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)

    res = client.post(
        f"/api/resumes/{resume_id}/parse",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422
    data = res.json()
    assert "ocr" in data["detail"].lower()

    # Verify DB updated to 'failed' with OCR notice
    updates = [call.args[0] for call in mock_table.update.call_args_list if call.args]
    failed_update = next(u for u in updates if u.get("status") == "failed")
    assert "ocr" in failed_update["parsing_error"].lower()


@patch("app.resumes.get_supabase_admin_client")
def test_parse_endpoint_corrupt_pdf(mock_get_client):
    user_id = "user-alice"
    resume_id = str(uuid.uuid4())

    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table

    mock_table.select().eq().execute.return_value = MagicMock(
        data=[{
            "id": resume_id,
            "user_id": user_id,
            "storage_path": f"{user_id}/resume.pdf",
            "original_filename": "corrupt.pdf",
            "status": "uploaded",
        }]
    )
    mock_supabase.storage.from_().download.return_value = b"%PDF-1.4\ncorrupt not a valid pdf"
    mock_get_client.return_value = mock_supabase

    token = create_test_token(user_id=user_id)

    res = client.post(
        f"/api/resumes/{resume_id}/parse",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422
    data = res.json()
    assert "corrupted" in data["detail"].lower() or "invalid" in data["detail"].lower()
