from datetime import datetime, timezone
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from supabase import create_client, Client

from app.config import get_settings

logger = logging.getLogger(__name__)


class TokenData(BaseModel):
    sub: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None
    exp: Optional[int] = None
    iat: Optional[int] = None
    role: Optional[str] = "authenticated"

    @property
    def id(self) -> str:
        return self.sub or self.user_id or ""


class User(BaseModel):
    id: str
    email: Optional[str] = None
    created_at: datetime


security = HTTPBearer(auto_error=False)


# In-memory cache for Supabase JWKS public keys
_JWKS_CACHE: dict = {"keys": {}, "fetched_at": 0.0}
_JWKS_CACHE_TTL = 3600.0  # 1 hour


def get_jwks_keys(supabase_url: str, force_refresh: bool = False) -> dict:
    """Fetch and cache JWKS public keys from Supabase project."""
    import time
    import urllib.request
    import json

    now = time.time()
    if (
        not force_refresh
        and _JWKS_CACHE["keys"]
        and (now - _JWKS_CACHE["fetched_at"] < _JWKS_CACHE_TTL)
    ):
        return _JWKS_CACHE["keys"]

    base_url = supabase_url.rstrip("/")
    jwks_url = f"{base_url}/auth/v1/.well-known/jwks.json"
    try:
        req = urllib.request.Request(
            jwks_url,
            headers={"User-Agent": "Mocky-Backend/1.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            keys = {}
            for k in data.get("keys", []):
                kid = k.get("kid")
                if kid:
                    keys[kid] = k
            _JWKS_CACHE["keys"] = keys
            _JWKS_CACHE["fetched_at"] = now
            return keys
    except Exception as e:
        logger.warning(f"Failed to fetch Supabase JWKS from {jwks_url}: {e}")
        return _JWKS_CACHE.get("keys", {})


def get_supabase_client() -> Optional[Client]:
    settings = get_settings()
    try:
        if (
            settings.SUPABASE_URL
            and "your-project" not in settings.SUPABASE_URL
            and settings.SUPABASE_ANON_KEY
            and "your-anon-key" not in settings.SUPABASE_ANON_KEY
        ):
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    except Exception as e:
        logger.warning(f"Could not initialize Supabase client: {e}")
    return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User:
    settings = get_settings()

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    jwt_error_msg: Optional[str] = None

    # Method 1: Local cryptographic JWT verification (supports HS256 and ES256)
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        kid = header.get("kid")
        base_url = settings.SUPABASE_URL.rstrip("/")
        expected_iss = f"{base_url}/auth/v1"

        payload = None

        if alg == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                raise JWTError("SUPABASE_JWT_SECRET not configured")
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True, "verify_exp": True},
            )
        elif alg == "ES256":
            from jose import jwk

            keys = get_jwks_keys(settings.SUPABASE_URL)
            key_data = keys.get(kid) if kid else None
            if not key_data and kid:
                keys = get_jwks_keys(settings.SUPABASE_URL, force_refresh=True)
                key_data = keys.get(kid)
            if not key_data and keys:
                key_data = next((k for k in keys.values() if k.get("alg") == "ES256"), None)

            if not key_data:
                raise JWTError(f"No suitable JWKS key found for kid '{kid}'")

            ec_key = jwk.construct(key_data, "ES256")
            payload = jwt.decode(
                token,
                ec_key,
                algorithms=["ES256"],
                audience="authenticated",
                options={"verify_aud": True, "verify_exp": True},
            )
        else:
            raise JWTError(f"Unsupported algorithm '{alg}'")

        token_iss = payload.get("iss")
        if token_iss and token_iss.rstrip("/") != expected_iss:
            if token_iss != "supabase" and "supabase" not in token_iss:
                raise JWTError("Invalid issuer")

        token_data = TokenData(**payload)
        user_id = token_data.id
        if not user_id:
            raise JWTError("Missing subject (user ID) in token")

        now_ts = int(datetime.now(timezone.utc).timestamp())
        if token_data.exp and token_data.exp < now_ts:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        email = token_data.email or payload.get("user_metadata", {}).get("email") or ""
        created_at = (
            datetime.fromtimestamp(token_data.iat, tz=timezone.utc)
            if token_data.iat
            else datetime.now(timezone.utc)
        )

        return User(
            id=user_id,
            email=email,
            created_at=created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        jwt_error_msg = str(e)
        logger.debug(f"Local JWT verification failed: {e}")

    # Method 2: Supabase Auth API verification fallback (e.g. for asymmetric tokens or JWKS offline)
    supabase_client = get_supabase_client()
    if supabase_client:
        try:
            user_resp = supabase_client.auth.get_user(token)
            if user_resp and user_resp.user:
                sb_user = user_resp.user
                created_at = sb_user.created_at
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    except Exception:
                        created_at = datetime.now(timezone.utc)
                return User(
                    id=sb_user.id,
                    email=sb_user.email or "",
                    created_at=created_at,
                )
        except Exception as e:
            logger.debug(f"Supabase auth API verification failed: {e}")

    detail_msg = f"Invalid token: {jwt_error_msg}" if jwt_error_msg else "Invalid or expired token"
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail_msg,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None