import time
from fastapi.testclient import TestClient
from jose import jwt

from app.main import app
from app.config import get_settings

client = TestClient(app)
settings = get_settings()


def create_test_token(
    user_id: str = "test-user-12345",
    email: str = "test@mocky.ai",
    exp_offset: int = 3600,
    role: str = "authenticated",
    aud: str = "authenticated",
    secret: str = None,
) -> str:
    signing_secret = secret or settings.SUPABASE_JWT_SECRET
    base_url = settings.SUPABASE_URL.rstrip("/")
    now = int(time.time())
    payload = {
        "iss": f"{base_url}/auth/v1",
        "sub": user_id,
        "aud": aud,
        "exp": now + exp_offset,
        "iat": now,
        "email": email,
        "role": role,
    }
    return jwt.encode(payload, signing_secret, algorithm="HS256")


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == settings.APP_NAME
    assert data["version"] == settings.APP_VERSION


def test_api_me_no_credentials():
    response = client.get("/api/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_api_me_invalid_token():
    response = client.get(
        "/api/me",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_api_me_expired_token():
    expired_token = create_test_token(exp_offset=-100)
    response = client.get(
        "/api/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_api_me_valid_supabase_token():
    user_id = "supa-user-uuid-999"
    email = "candidate@example.com"
    token = create_test_token(user_id=user_id, email=email)

    response = client.get(
        "/api/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == email
    assert "created_at" in data


def test_api_me_valid_token_without_email():
    user_id = "supa-user-no-email"
    token = create_test_token(user_id=user_id, email="")

    response = client.get(
        "/api/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == ""


def test_cors_preflight():
    response = client.options(
        "/api/me",
        headers={
            "Origin": settings.FRONTEND_URL,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == settings.FRONTEND_URL


def test_api_me_valid_es256_token(monkeypatch):
    import base64
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization

    # Generate EC key pair
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_numbers = private_key.public_key().public_numbers()

    def int_to_b64(val):
        return base64.urlsafe_b64encode(val.to_bytes(32, "big")).decode("utf-8").rstrip("=")

    kid = "mock-es256-kid"
    jwk_dict = {
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "use": "sig",
        "kid": kid,
        "x": int_to_b64(public_numbers.x),
        "y": int_to_b64(public_numbers.y),
    }

    # Inject mock JWKS cache
    monkeypatch.setattr("app.auth._JWKS_CACHE", {"keys": {kid: jwk_dict}, "fetched_at": time.time()})

    base_url = settings.SUPABASE_URL.rstrip("/")
    now = int(time.time())
    payload = {
        "iss": f"{base_url}/auth/v1",
        "sub": "user-es256-abc",
        "aud": "authenticated",
        "exp": now + 3600,
        "iat": now,
        "email": "es256@example.com",
    }
    token = jwt.encode(payload, private_pem, algorithm="ES256", headers={"kid": kid})

    response = client.get(
        "/api/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user-es256-abc"
    assert data["email"] == "es256@example.com"

