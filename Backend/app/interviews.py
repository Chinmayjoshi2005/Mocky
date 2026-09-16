import logging
from typing import Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client

from app.auth import get_current_user, User
from app.config import get_settings
from app.question_generator import (
    generate_interview_questions,
    regenerate_single_question,
    QuestionGenerationError,
)
from app.schemas.interview import (
    GenerateInterviewRequest,
    InterviewQuestionResponse,
    InterviewSessionResponse,
    UpdateQuestionRequest,
    CreateCustomQuestionRequest,
    ReorderQuestionsRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


def get_supabase_admin_client() -> Client:
    """Return a Supabase client configured with the server-only service role key."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _map_question_response(q: dict[str, Any]) -> InterviewQuestionResponse:
    return InterviewQuestionResponse(
        id=str(q.get("id", "")),
        interview_id=str(q.get("interview_id", "")),
        order_index=q.get("order_index", 0),
        question_text=q.get("question_text", ""),
        category=q.get("category", "technical"),
        difficulty=q.get("difficulty", "medium"),
        competency=q.get("competency", "General"),
        context_source=q.get("context_source", "both"),
        rationale=q.get("rationale"),
        is_selected=bool(q.get("is_selected", True)),
        created_at=str(q.get("created_at", "")),
    )


def _map_session_response(
    session: dict[str, Any],
    questions: list[dict[str, Any]],
) -> InterviewSessionResponse:
    return InterviewSessionResponse(
        id=str(session["id"]),
        role_title=session["role_title"],
        company_name=session.get("company_name"),
        seniority=session["seniority"],
        status=session.get("status", "ready"),
        resume_id=str(session["resume_id"]) if session.get("resume_id") else None,
        job_description_id=str(session["job_description_id"]) if session.get("job_description_id") else None,
        questions=[_map_question_response(q) for q in questions],
        created_at=str(session.get("created_at", "")),
        updated_at=str(session.get("updated_at", "")),
    )


@router.post("/generate", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED)
async def generate_interview(
    payload: GenerateInterviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate tailored interview questions matching candidate profile and target job description."""
    settings = get_settings()

    # 1. Resolve Resume and Candidate Profile
    resume_id = payload.resume_id
    if resume_id:
        try:
            uuid.UUID(resume_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid resume ID format. Expected a valid UUID.",
            )

    db = get_supabase_admin_client()

    if resume_id:
        resume_query = db.table("resumes").select("id, user_id, status").eq("id", resume_id).execute()
        if not resume_query.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified resume not found.",
            )
        if resume_query.data[0]["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resume.",
            )
    else:
        # Get user's most recent parsed resume
        recent_resumes = (
            db.table("resumes")
            .select("id, status")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not recent_resumes.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No resume found. Please upload your resume first.",
            )
        resume_id = recent_resumes.data[0]["id"]

    # Fetch candidate profile analysis
    analysis_res = (
        db.table("resume_analyses")
        .select("*")
        .eq("resume_id", resume_id)
        .execute()
    )
    if not analysis_res.data or analysis_res.data[0].get("status") != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate profile analysis is not ready yet. Please ensure your resume has been analyzed.",
        )
    candidate_profile = analysis_res.data[0]

    # 2. Resolve Job Description
    job_id = payload.job_description_id
    if job_id:
        try:
            uuid.UUID(job_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid job description ID format. Expected a valid UUID.",
            )

        job_query = db.table("job_descriptions").select("*").eq("id", job_id).execute()
        if not job_query.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified job description not found.",
            )
        if job_query.data[0]["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this job description.",
            )
        job_record = job_query.data[0]
    else:
        # Get user's most recent job description
        recent_jobs = (
            db.table("job_descriptions")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not recent_jobs.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No target job description found. Please provide your target job details first.",
            )
        job_record = recent_jobs.data[0]
        job_id = job_record["id"]

    # 3. Call AI Question Generator
    try:
        generated_questions = await generate_interview_questions(
            candidate_profile=candidate_profile,
            job_profile=job_record,
            settings=settings,
            num_questions=payload.num_questions,
        )
    except QuestionGenerationError as err:
        logger.info(f"Question generation rejected for user {current_user.id}: {err.message}")
        raise HTTPException(
            status_code=err.status_code,
            detail=err.message,
        )
    except Exception as e:
        logger.exception(f"Unexpected question generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during interview question generation.",
        )

    # 4. Save Interview Session to Supabase
    try:
        session_res = (
            db.table("interviews")
            .insert({
                "user_id": current_user.id,
                "resume_id": resume_id,
                "job_description_id": job_id,
                "role_title": job_record["role_title"],
                "company_name": job_record.get("company_name"),
                "seniority": job_record["seniority"],
                "status": "ready",
            })
            .execute()
        )
        if not session_res.data:
            raise RuntimeError("Database did not return inserted interview record.")
        session_record = session_res.data[0]
        interview_id = session_record["id"]
    except Exception as e:
        logger.error(f"Error saving interview session to database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save interview session.",
        )

    # 5. Batch Insert Questions
    questions_to_insert = [
        {
            "interview_id": interview_id,
            "user_id": current_user.id,
            "order_index": q.order_index,
            "question_text": q.question_text,
            "category": q.category,
            "difficulty": q.difficulty,
            "competency": q.competency,
            "context_source": q.context_source,
            "rationale": q.rationale,
        }
        for q in generated_questions
    ]

    try:
        inserted_q_res = (
            db.table("interview_questions")
            .insert(questions_to_insert)
            .execute()
        )
        saved_questions = inserted_q_res.data or []
    except Exception as e:
        logger.error(f"Error saving questions for interview {interview_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save interview questions.",
        )

    # Sort questions by order_index just in case
    saved_questions.sort(key=lambda x: x.get("order_index", 0))

    return _map_session_response(session_record, saved_questions)


@router.get("/{interview_id}", response_model=InterviewSessionResponse)
async def get_interview(
    interview_id: str,
    current_user: User = Depends(get_current_user),
):
    """Fetch an interview session and all its generated questions."""
    try:
        uuid.UUID(interview_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    # 1. Fetch Session
    session_res = (
        db.table("interviews")
        .select("*")
        .eq("id", interview_id)
        .execute()
    )
    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )

    session = session_res.data[0]
    if session["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this interview session.",
        )

    # 2. Fetch Questions
    q_res = (
        db.table("interview_questions")
        .select("*")
        .eq("interview_id", interview_id)
        .order("order_index", desc=False)
        .execute()
    )
    questions = q_res.data or []

    return _map_session_response(session, questions)


@router.get("", response_model=list[InterviewSessionResponse])
async def list_interviews(
    current_user: User = Depends(get_current_user),
):
    """List all interview sessions for the authenticated user."""
    db = get_supabase_admin_client()

    sessions_res = (
        db.table("interviews")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    sessions = sessions_res.data or []

    results = []
    for s in sessions:
        q_res = (
            db.table("interview_questions")
            .select("*")
            .eq("interview_id", s["id"])
            .order("order_index", desc=False)
            .execute()
        )
        results.append(_map_session_response(s, q_res.data or []))

    return results


@router.patch("/{interview_id}/questions/{question_id}", response_model=InterviewQuestionResponse)
async def update_question(
    interview_id: str,
    question_id: str,
    payload: UpdateQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    """Update question content, difficulty, competency, or toggle practice selection."""
    try:
        uuid.UUID(interview_id)
        uuid.UUID(question_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview or question ID format. Expected valid UUIDs.",
        )

    db = get_supabase_admin_client()

    # Verify question exists and user owns it
    q_res = (
        db.table("interview_questions")
        .select("*")
        .eq("id", question_id)
        .eq("interview_id", interview_id)
        .execute()
    )
    if not q_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in this interview session.",
        )

    question = q_res.data[0]
    if question["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this question.",
        )

    update_data: dict[str, Any] = {}
    if payload.question_text is not None:
        update_data["question_text"] = payload.question_text
    if payload.category is not None:
        update_data["category"] = payload.category
    if payload.difficulty is not None:
        update_data["difficulty"] = payload.difficulty
    if payload.competency is not None:
        update_data["competency"] = payload.competency
    if payload.is_selected is not None:
        update_data["is_selected"] = payload.is_selected

    if not update_data:
        return _map_question_response(question)

    try:
        update_res = (
            db.table("interview_questions")
            .update(update_data)
            .eq("id", question_id)
            .execute()
        )
        if not update_res.data:
            raise RuntimeError("Database did not return updated question record.")
        return _map_question_response(update_res.data[0])
    except Exception as e:
        logger.error(f"Error updating question {question_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update interview question.",
        )


@router.post("/{interview_id}/questions", response_model=InterviewQuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_question(
    interview_id: str,
    payload: CreateCustomQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    """Add a candidate-authored custom interview question."""
    try:
        uuid.UUID(interview_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    # Check interview session ownership
    session_res = db.table("interviews").select("id, user_id").eq("id", interview_id).execute()
    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )
    if session_res.data[0]["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add questions to this interview session.",
        )

    # Get max order index
    existing_res = (
        db.table("interview_questions")
        .select("order_index")
        .eq("interview_id", interview_id)
        .order("order_index", desc=True)
        .limit(1)
        .execute()
    )
    next_order = (existing_res.data[0]["order_index"] + 1) if existing_res.data else 0

    new_record = {
        "interview_id": interview_id,
        "user_id": current_user.id,
        "order_index": next_order,
        "question_text": payload.question_text,
        "category": payload.category,
        "difficulty": payload.difficulty,
        "competency": payload.competency,
        "context_source": "user",
        "rationale": "Custom question added by candidate.",
        "is_selected": True,
    }

    try:
        insert_res = db.table("interview_questions").insert(new_record).execute()
        if not insert_res.data:
            raise RuntimeError("Database failed to return inserted question.")
        return _map_question_response(insert_res.data[0])
    except Exception as e:
        logger.error(f"Error adding custom question to interview {interview_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create custom question.",
        )


@router.delete("/{interview_id}/questions/{question_id}")
async def delete_question(
    interview_id: str,
    question_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a question from an interview session."""
    try:
        uuid.UUID(interview_id)
        uuid.UUID(question_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview or question ID format. Expected valid UUIDs.",
        )

    db = get_supabase_admin_client()

    # Check ownership
    q_res = (
        db.table("interview_questions")
        .select("id, user_id")
        .eq("id", question_id)
        .eq("interview_id", interview_id)
        .execute()
    )
    if not q_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in this interview session.",
        )
    if q_res.data[0]["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this question.",
        )

    try:
        db.table("interview_questions").delete().eq("id", question_id).execute()
        return {"detail": "Question deleted successfully", "id": question_id}
    except Exception as e:
        logger.error(f"Error deleting question {question_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete question.",
        )


@router.post("/{interview_id}/questions/{question_id}/regenerate", response_model=InterviewQuestionResponse)
async def regenerate_question_endpoint(
    interview_id: str,
    question_id: str,
    current_user: User = Depends(get_current_user),
):
    """Regenerate a replacement interview question via Groq AI, avoiding the previous question."""
    try:
        uuid.UUID(interview_id)
        uuid.UUID(question_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview or question ID format. Expected valid UUIDs.",
        )

    db = get_supabase_admin_client()
    settings = get_settings()

    # 1. Fetch Question
    q_res = (
        db.table("interview_questions")
        .select("*")
        .eq("id", question_id)
        .eq("interview_id", interview_id)
        .execute()
    )
    if not q_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in this interview session.",
        )
    current_question = q_res.data[0]
    if current_question["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to regenerate this question.",
        )

    # 2. Fetch Interview Session Context
    session_res = db.table("interviews").select("*").eq("id", interview_id).execute()
    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )
    session = session_res.data[0]

    resume_id = session.get("resume_id")
    job_id = session.get("job_description_id")

    # Fetch Candidate Profile
    candidate_profile = {}
    if resume_id:
        analysis_res = db.table("resume_analyses").select("*").eq("resume_id", resume_id).execute()
        if analysis_res.data and analysis_res.data[0].get("status") == "ready":
            candidate_profile = analysis_res.data[0]

    # Fetch Job Profile
    job_profile = {
        "role_title": session["role_title"],
        "company_name": session.get("company_name"),
        "seniority": session["seniority"],
        "description": "",
    }
    if job_id:
        job_res = db.table("job_descriptions").select("*").eq("id", job_id).execute()
        if job_res.data:
            job_profile = job_res.data[0]

    # 3. Call AI Regeneration
    try:
        new_q = await regenerate_single_question(
            candidate_profile=candidate_profile,
            job_profile=job_profile,
            previous_question_text=current_question["question_text"],
            category=current_question["category"],
            settings=settings,
        )
    except QuestionGenerationError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)
    except Exception as e:
        logger.exception(f"Unexpected error regenerating question {question_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while regenerating this interview question.",
        )

    # 4. Update the Question Record
    update_data = {
        "question_text": new_q.question_text,
        "difficulty": new_q.difficulty,
        "competency": new_q.competency,
        "context_source": new_q.context_source,
        "rationale": new_q.rationale,
    }
    try:
        update_res = (
            db.table("interview_questions")
            .update(update_data)
            .eq("id", question_id)
            .execute()
        )
        if not update_res.data:
            raise RuntimeError("Database did not return updated question.")
        return _map_question_response(update_res.data[0])
    except Exception as e:
        logger.error(f"Error persisting regenerated question {question_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save regenerated question.",
        )


@router.post("/{interview_id}/questions/reorder", response_model=list[InterviewQuestionResponse])
async def reorder_questions(
    interview_id: str,
    payload: ReorderQuestionsRequest,
    current_user: User = Depends(get_current_user),
):
    """Update order indices for all questions in an interview session."""
    try:
        uuid.UUID(interview_id)
        for q_id in payload.question_ids:
            uuid.UUID(q_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview or question ID format. Expected valid UUIDs.",
        )

    db = get_supabase_admin_client()

    # Check interview session ownership
    session_res = db.table("interviews").select("id, user_id").eq("id", interview_id).execute()
    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )
    if session_res.data[0]["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to reorder questions in this interview session.",
        )

    try:
        for index, q_id in enumerate(payload.question_ids):
            db.table("interview_questions").update({"order_index": index}).eq("id", q_id).eq("interview_id", interview_id).execute()

        # Fetch reordered list
        q_res = (
            db.table("interview_questions")
            .select("*")
            .eq("interview_id", interview_id)
            .order("order_index", desc=False)
            .execute()
        )
        return [_map_question_response(q) for q in (q_res.data or [])]
    except Exception as e:
        logger.error(f"Error reordering questions for interview {interview_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder interview questions.",
        )
