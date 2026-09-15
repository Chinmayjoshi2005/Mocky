from datetime import datetime, timezone
import logging
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import create_client, Client

from app.auth import get_current_user, User
from app.config import get_settings
from app.parser import extract_text_from_pdf, PDFParsingError
from app.analyzer import extract_candidate_profile, ResumeAnalysisError
from app.schemas.analysis import CandidateProfileSchema, ResumeAnalysisResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


class ParseResumeResponse(BaseModel):
    id: str
    status: str
    original_filename: str
    word_count: int
    parsed_at: str
    parsing_error: Optional[str] = None


def get_supabase_admin_client() -> Client:
    """Return a Supabase client configured with the server-only service role key."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.post("/{resume_id}/parse", response_model=ParseResumeResponse)
async def parse_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
):
    """Securely download and extract text from an uploaded resume PDF.

    Verifies user ownership before processing. Updates the resume record in Supabase
    with the extracted text, word count, and final status ('parsed' or 'failed').
    """
    # 1. Validate UUID format
    try:
        uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resume ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    # 2. Fetch the resume record and verify ownership
    try:
        query_res = (
            db.table("resumes")
            .select("id, user_id, storage_path, original_filename, status")
            .eq("id", resume_id)
            .execute()
        )
    except Exception as e:
        logger.error(f"Error querying resume {resume_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query resume database.",
        )

    if not query_res.data or len(query_res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    resume = query_res.data[0]

    # Ownership rejection check
    if resume.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access or parse this resume.",
        )

    original_filename = resume.get("original_filename", "resume.pdf")
    storage_path = resume.get("storage_path")

    if not storage_path:
        error_msg = "Resume storage path is missing from database record."
        db.table("resumes").update({
            "status": "failed",
            "parsing_error": error_msg,
        }).eq("id", resume_id).execute()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_msg,
        )

    # 3. Mark status as 'parsing' in the database
    try:
        db.table("resumes").update({
            "status": "parsing",
            "parsing_error": None,
        }).eq("id", resume_id).execute()
    except Exception as e:
        logger.warning(f"Could not update status to 'parsing' for resume {resume_id}: {e}")

    # 4. Download the PDF bytes from Supabase Storage
    try:
        pdf_bytes = db.storage.from_("resumes").download(storage_path)
    except Exception as e:
        logger.error(f"Error downloading file from storage ({storage_path}): {e}")
        storage_err = "The resume file could not be retrieved from storage. Please re-upload your resume."
        db.table("resumes").update({
            "status": "failed",
            "parsing_error": storage_err,
        }).eq("id", resume_id).execute()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=storage_err,
        )

    # 5. Extract text using pypdf
    try:
        extracted_text, word_count = extract_text_from_pdf(pdf_bytes)
    except PDFParsingError as e:
        safe_msg = e.message
        logger.info(f"Resume {resume_id} parsing rejected: {safe_msg}")
        try:
            db.table("resumes").update({
                "status": "failed",
                "parsing_error": safe_msg,
                "parsed_text": None,
                "parsed_at": None,
            }).eq("id", resume_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to update failed status in database: {db_err}")

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=safe_msg,
        )
    except Exception as e:
        logger.exception(f"Unexpected error parsing resume {resume_id}: {e}")
        generic_msg = (
            "An unexpected error occurred while parsing the resume PDF. "
            "Please try again or upload a text-based PDF."
        )
        try:
            db.table("resumes").update({
                "status": "failed",
                "parsing_error": generic_msg,
                "parsed_text": None,
                "parsed_at": None,
            }).eq("id", resume_id).execute()
        except Exception as db_err:
            logger.error(f"Failed to update failed status in database: {db_err}")

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=generic_msg,
        )

    # 6. Save extracted text and success status
    parsed_timestamp = datetime.now(timezone.utc).isoformat()
    try:
        db.table("resumes").update({
            "status": "parsed",
            "parsed_text": extracted_text,
            "parsing_error": None,
            "parsed_at": parsed_timestamp,
        }).eq("id", resume_id).execute()
    except Exception as e:
        logger.error(f"Error saving parsed text to database for resume {resume_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save parsed resume data.",
        )

    return ParseResumeResponse(
        id=resume_id,
        status="parsed",
        original_filename=original_filename,
        word_count=word_count,
        parsed_at=parsed_timestamp,
        parsing_error=None,
    )


def _format_analysis_response(record: dict) -> ResumeAnalysisResponse:
    profile = None
    if record.get("status") == "ready":
        try:
            profile = CandidateProfileSchema(
                summary=record.get("summary"),
                skills=record.get("skills") or {},
                experience=record.get("experience") or [],
                education=record.get("education") or [],
                projects=record.get("projects") or [],
            )
        except Exception as e:
            logger.warning(f"Failed to map analysis record to CandidateProfileSchema: {e}")

    return ResumeAnalysisResponse(
        id=str(record.get("id", record.get("resume_id"))),
        resume_id=str(record.get("resume_id")),
        status=record.get("status", "analyzing"),
        profile=profile,
        error=record.get("error"),
        analysis_version=record.get("analysis_version", 1),
        created_at=str(record.get("created_at", "")),
        updated_at=str(record.get("updated_at", "")),
    )


@router.post("/{resume_id}/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    resume_id: str,
    reanalyze: bool = False,
    current_user: User = Depends(get_current_user),
):
    """Analyze an already parsed resume using Groq to extract a structured candidate profile.

    Requires authenticated user ownership. Reuses existing ready analysis unless reanalyze is True.
    """
    # 1. Validate UUID format
    try:
        uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resume ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()
    settings = get_settings()

    # 2. Fetch the resume and verify ownership & parsed status
    try:
        resume_res = (
            db.table("resumes")
            .select("id, user_id, status, parsed_text, original_filename")
            .eq("id", resume_id)
            .execute()
        )
    except Exception as e:
        logger.error(f"Error querying resume {resume_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query resume database.",
        )

    if not resume_res.data or len(resume_res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    resume = resume_res.data[0]

    if resume.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to analyze this resume.",
        )

    if resume.get("status") != "parsed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume has not been parsed yet. Please parse the resume before analyzing.",
        )

    parsed_text = resume.get("parsed_text")
    if not parsed_text or not parsed_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume does not contain extracted text to analyze.",
        )

    # 3. Check for existing analysis (Duplicate prevention & reuse)
    existing_analysis = None
    try:
        analysis_res = (
            db.table("resume_analyses")
            .select("*")
            .eq("resume_id", resume_id)
            .execute()
        )
        if analysis_res.data and len(analysis_res.data) > 0:
            existing_analysis = analysis_res.data[0]
    except Exception as e:
        logger.warning(f"Error checking existing analysis for resume {resume_id}: {e}")

    if existing_analysis and existing_analysis.get("status") == "ready":
        if not reanalyze:
            logger.info(f"Reusing existing ready analysis for resume {resume_id} without re-running extraction.")
            return _format_analysis_response(existing_analysis)

    # 4. Check whether Groq API key is configured
    if not settings.GROQ_API_KEY:
        err_msg = "Groq API key is not configured on the server. Please set GROQ_API_KEY in the environment."
        now_ts = datetime.now(timezone.utc).isoformat()
        try:
            db.table("resume_analyses").upsert(
                {
                    "resume_id": resume_id,
                    "user_id": current_user.id,
                    "status": "failed",
                    "error": err_msg,
                    "updated_at": now_ts,
                },
                on_conflict="resume_id",
            ).execute()
        except Exception as db_err:
            logger.warning(f"Failed to record failed analysis due to missing API key: {db_err}")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=err_msg,
        )

    # 5. Set status to 'analyzing'
    now_ts = datetime.now(timezone.utc).isoformat()
    try:
        db.table("resume_analyses").upsert(
            {
                "resume_id": resume_id,
                "user_id": current_user.id,
                "status": "analyzing",
                "error": None,
                "updated_at": now_ts,
            },
            on_conflict="resume_id",
        ).execute()
    except Exception as e:
        logger.warning(f"Failed to record 'analyzing' state for resume {resume_id}: {e}")

    # 6. Call Groq Analyzer service
    try:
        profile = await extract_candidate_profile(parsed_text, settings)
    except ResumeAnalysisError as err:
        logger.info(f"Resume analysis failed for {resume_id}: {err.message}")
        try:
            db.table("resume_analyses").upsert(
                {
                    "resume_id": resume_id,
                    "user_id": current_user.id,
                    "status": "failed",
                    "error": err.message,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="resume_id",
            ).execute()
        except Exception as db_err:
            logger.error(f"Failed to persist failure status: {db_err}")

        raise HTTPException(
            status_code=err.status_code,
            detail=err.message,
        )
    except Exception as e:
        logger.exception(f"Unexpected error analyzing resume {resume_id}: {e}")
        generic_err = "An unexpected error occurred during resume analysis. Please try again."
        try:
            db.table("resume_analyses").upsert(
                {
                    "resume_id": resume_id,
                    "user_id": current_user.id,
                    "status": "failed",
                    "error": generic_err,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="resume_id",
            ).execute()
        except Exception as db_err:
            logger.error(f"Failed to persist generic failure status: {db_err}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=generic_err,
        )

    # 7. Persist validated structured analysis
    save_ts = datetime.now(timezone.utc).isoformat()
    try:
        save_res = (
            db.table("resume_analyses")
            .upsert(
                {
                    "resume_id": resume_id,
                    "user_id": current_user.id,
                    "status": "ready",
                    "summary": profile.summary,
                    "skills": profile.skills.model_dump(),
                    "experience": [item.model_dump() for item in profile.experience],
                    "education": [item.model_dump() for item in profile.education],
                    "projects": [item.model_dump() for item in profile.projects],
                    "error": None,
                    "analysis_version": 1,
                    "updated_at": save_ts,
                },
                on_conflict="resume_id",
            )
            .execute()
        )
        saved_record = (
            save_res.data[0]
            if save_res.data
            else {
                "id": resume_id,
                "resume_id": resume_id,
                "status": "ready",
                "summary": profile.summary,
                "skills": profile.skills.model_dump(),
                "experience": [item.model_dump() for item in profile.experience],
                "education": [item.model_dump() for item in profile.education],
                "projects": [item.model_dump() for item in profile.projects],
                "error": None,
                "analysis_version": 1,
                "created_at": save_ts,
                "updated_at": save_ts,
            }
        )
    except Exception as e:
        logger.error(f"Error persisting analysis for resume {resume_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save resume analysis profile to database.",
        )

    return _format_analysis_response(saved_record)


@router.get("/{resume_id}/analysis", response_model=ResumeAnalysisResponse)
async def get_resume_analysis(
    resume_id: str,
    current_user: User = Depends(get_current_user),
):
    """Fetch the candidate profile analysis for a given resume.

    Requires authenticated user ownership of the resume.
    """
    try:
        uuid.UUID(resume_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resume ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    # Check resume ownership
    try:
        resume_res = (
            db.table("resumes")
            .select("id, user_id")
            .eq("id", resume_id)
            .execute()
        )
    except Exception as e:
        logger.error(f"Error querying resume {resume_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query resume database.",
        )

    if not resume_res.data or len(resume_res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    if resume_res.data[0].get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this analysis.",
        )

    # Fetch analysis
    try:
        analysis_res = (
            db.table("resume_analyses")
            .select("*")
            .eq("resume_id", resume_id)
            .execute()
        )
    except Exception as e:
        logger.error(f"Error querying analysis for resume {resume_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query resume analysis.",
        )

    if not analysis_res.data or len(analysis_res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found for this resume.",
        )

    return _format_analysis_response(analysis_res.data[0])

