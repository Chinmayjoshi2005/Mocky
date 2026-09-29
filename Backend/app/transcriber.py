import logging
from typing import Optional
from groq import AsyncGroq

from app.config import Settings

logger = logging.getLogger(__name__)

# Groq-hosted Whisper model. Fast, multilingual, no local install needed.
WHISPER_MODEL = "whisper-large-v3-turbo"

# Groq's audio endpoint accepts these; anything else gets rejected upstream.
ALLOWED_AUDIO_EXTENSIONS = {
    "flac", "mp3", "mp4", "mpeg", "mpga",
    "m4a", "ogg", "wav", "webm",
}

MAX_AUDIO_BYTES = 25 * 1024 * 1024  # Groq's hard cap is 25 MB


class TranscriptionError(Exception):
    """Raised when audio transcription fails."""

    def __init__(self, message: str, status_code: int = 422):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


async def transcribe_audio(
    file_bytes: bytes,
    filename: str,
    settings: Settings,
    groq_client: Optional[AsyncGroq] = None,
    language: Optional[str] = None,
) -> str:
    """
    Transcribe a recorded answer using Groq's hosted Whisper model.

    Args:
        file_bytes: raw audio bytes from the upload.
        filename:   original filename (used to infer format, e.g. "answer.webm").
        settings:   app settings (must contain GROQ_API_KEY).
        groq_client: optional injected client (for tests).
        language:   optional ISO-639-1 hint (e.g. "en"). Omit for auto-detect.

    Returns:
        The transcript as a plain string (possibly empty if silence).

    Raises:
        TranscriptionError: on config, validation, or upstream failure.
    """
    if not settings.GROQ_API_KEY:
        raise TranscriptionError(
            "Groq API key is not configured on the server. Please set GROQ_API_KEY in the environment.",
            status_code=503,
        )

    if not file_bytes:
        raise TranscriptionError("Audio file is empty.", status_code=400)

    if len(file_bytes) > MAX_AUDIO_BYTES:
        raise TranscriptionError(
            f"Audio file is too large ({len(file_bytes)} bytes). Maximum is {MAX_AUDIO_BYTES} bytes.",
            status_code=413,
        )

    ext = _extension(filename) or "webm"
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise TranscriptionError(
            f"Unsupported audio format '.{ext}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}.",
            status_code=415,
        )

    client = groq_client or AsyncGroq(api_key=settings.GROQ_API_KEY)

    # The Groq SDK expects a (filename, bytes, content_type) tuple for file uploads.
    file_tuple = (filename, file_bytes, f"audio/{ext}")

    kwargs: dict = {
        "file": file_tuple,
        "model": WHISPER_MODEL,
        "response_format": "text",
        "temperature": 0.0,
    }
    if language:
        kwargs["language"] = language

    try:
        result = await client.audio.transcriptions.create(**kwargs)

        # With response_format="text", the SDK returns a plain string.
        if isinstance(result, str):
            transcript = result
        else:
            # Defensive: some SDK versions wrap it.
            transcript = getattr(result, "text", "") or ""

        return transcript.strip()

    except Exception as e:
        logger.exception(f"Groq transcription failed for '{filename}': {e}")
        raise TranscriptionError(
            "Unable to transcribe the audio at this time. Please try again.",
            status_code=502,
        )