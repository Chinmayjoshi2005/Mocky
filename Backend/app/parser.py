import io
import logging
from typing import Tuple
from pypdf import PdfReader
from pypdf.errors import PdfReadError

logger = logging.getLogger(__name__)

MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
MIN_WORDS_FOR_VALID_RESUME = 15


class PDFParsingError(Exception):
    """Base exception for PDF parsing failures."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class EmptyPDFError(PDFParsingError):
    """Raised when PDF file or page set is empty."""


class OversizedPDFError(PDFParsingError):
    """Raised when PDF file exceeds the size limit."""


class CorruptPDFError(PDFParsingError):
    """Raised when PDF structure is corrupt or unreadable."""


class PasswordProtectedPDFError(PDFParsingError):
    """Raised when PDF is encrypted or password-protected."""


class ScannedPDFError(PDFParsingError):
    """Raised when PDF contains no meaningful selectable text (e.g. scanned image)."""


def extract_text_from_pdf(
    pdf_bytes: bytes, max_bytes: int = MAX_RESUME_SIZE_BYTES
) -> Tuple[str, int]:
    """Extract selectable text and word count from PDF bytes using pypdf.

    Returns:
        (extracted_text, word_count)

    Raises:
        EmptyPDFError: If file is empty or has no pages.
        OversizedPDFError: If file exceeds max_bytes.
        PasswordProtectedPDFError: If PDF is encrypted/password protected.
        CorruptPDFError: If PDF structure is invalid or corrupt.
        ScannedPDFError: If PDF contains no meaningful text (e.g. scanned document).
    """
    if not pdf_bytes or len(pdf_bytes) == 0:
        raise EmptyPDFError("The uploaded resume file is empty.")

    if len(pdf_bytes) > max_bytes:
        raise OversizedPDFError(
            f"The resume file exceeds the maximum allowed size of {max_bytes // (1024 * 1024)}MB."
        )

    # Validate PDF signature in header
    if b"%PDF-" not in pdf_bytes[:1024]:
        raise CorruptPDFError("The uploaded file does not appear to be a valid PDF document.")

    try:
        stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(stream)
    except (PdfReadError, Exception) as e:
        logger.warning(f"Failed to initialize PdfReader: {e}")
        raise CorruptPDFError(
            "Could not read this PDF document: the file appears to be corrupted or invalid."
        )

    # Check for encryption / password protection
    if reader.is_encrypted:
        try:
            decrypt_result = reader.decrypt("")
            # In pypdf, decrypt returns 0 or False if decryption failed
            if not decrypt_result:
                raise PasswordProtectedPDFError(
                    "This PDF is password-protected. Please upload an unlocked PDF resume."
                )
        except PasswordProtectedPDFError:
            raise
        except Exception:
            raise PasswordProtectedPDFError(
                "This PDF is password-protected. Please upload an unlocked PDF resume."
            )

    try:
        pages = reader.pages
        if not pages or len(pages) == 0:
            raise EmptyPDFError("The PDF document does not contain any pages.")
    except (PdfReadError, Exception) as e:
        logger.warning(f"Failed to read PDF pages: {e}")
        raise CorruptPDFError(
            "Could not read pages from this PDF: the file appears to be corrupted."
        )

    page_texts = []
    for idx, page in enumerate(pages):
        try:
            page_text = page.extract_text()
            if page_text:
                page_texts.append(page_text.strip())
        except Exception as e:
            logger.warning(f"Error extracting text from page {idx}: {e}")

    raw_text = "\n\n".join(page_texts).strip()

    # Clean null bytes for database text compatibility
    clean_text = raw_text.replace("\x00", "")

    # Count meaningful words containing alphanumeric characters
    words = [w for w in clean_text.split() if any(c.isalnum() for c in w)]

    if len(words) < MIN_WORDS_FOR_VALID_RESUME:
        raise ScannedPDFError(
            "This document appears to be scanned or contains only images. "
            "OCR text extraction is not available yet. Please upload a text-based PDF resume."
        )

    return clean_text, len(words)
