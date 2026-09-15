import json
import logging
from typing import Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client

from app.auth import get_current_user, User
from app.config import get_settings
from app.evaluator import evaluate_answer, AnswerEvaluationError
from app.schemas.practice import (
    StartPracticeRequest,
    SubmitAnswerRequest,
    PracticeSessionResponse,
    PracticeAnswerResponse,
    PracticeQuestionItem,
    CompletePracticeResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/practice", tags=["practice"])


def get_supabase_admin_client() -> Client:
    """Return a Supabase client configured with the server-only service role key."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# ---------------------------------------------------------------------------
# Mapping helpers
# ---------------------------------------------------------------------------

def _map_answer_response(a: dict[str, Any]) -> PracticeAnswerResponse:
    return PracticeAnswerResponse(
        id=str(a["id"]),
        practice_session_id=str(a["practice_session_id"]),
        interview_question_id=str(a["interview_question_id"]),
        question_text=a.get("question_text", ""),
        answer_text=a.get("answer_text", ""),
        score=a.get("score"),
        rating=a.get("rating"),
        strengths=a.get("strengths"),
        improvements=a.get("improvements"),
        model_answer=a.get("model_answer"),
        evaluated=bool(a.get("evaluated", False)),
        answered_at=str(a.get("answered_at", "")),
    )


def _map_question_item(q: dict[str, Any]) -> PracticeQuestionItem:
    return PracticeQuestionItem(
        id=str(q["id"]),
        order_index=q.get("order_index", 0),
        question_text=q.get("question_text", ""),
        category=q.get("category", "technical"),
        difficulty=q.get("difficulty", "medium"),
        competency=q.get("competency", "General"),
        context_source=q.get("context_source", "both"),
    )


def _map_session_response(
    session: dict[str, Any],
    questions: list[dict[str, Any]],
    answers: list[dict[str, Any]],
) -> PracticeSessionResponse:
    question_ids_raw = session.get("question_ids", [])
    if isinstance(question_ids_raw, str):
        try:
            question_ids_raw = json.loads(question_ids_raw)
        except Exception:
            question_ids_raw = []

    return PracticeSessionResponse(
        id=str(session["id"]),
        interview_id=str(session["interview_id"]),
        status=session.get("status", "in_progress"),
        current_question_index=session.get("current_question_index", 0),
        total_questions=len(question_ids_raw),
        overall_score=session.get("overall_score"),
        questions=[_map_question_item(q) for q in questions],
        answers=[_map_answer_response(a) for a in answers],
        started_at=str(session.get("started_at", "")),
        completed_at=str(session["completed_at"]) if session.get("completed_at") else None,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_practice_session(
    payload: StartPracticeRequest,
    current_user: User = Depends(get_current_user),
):
    """Start a new text practice session for the selected-question set of an interview."""
    try:
        uuid.UUID(payload.interview_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    # Verify interview ownership
    session_res = db.table("interviews").select("id, user_id").eq("id", payload.interview_id).execute()
    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )
    if session_res.data[0]["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to practice this interview session.",
        )

    # Fetch selected questions (is_selected = true), ordered
    q_res = (
        db.table("interview_questions")
        .select("*")
        .eq("interview_id", payload.interview_id)
        .eq("is_selected", True)
        .order("order_index", desc=False)
        .execute()
    )
    selected_questions = q_res.data or []

    if not selected_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No questions are selected for practice. Please select at least one question before starting.",
        )

    question_ids = [str(q["id"]) for q in selected_questions]

    try:
        ps_res = (
            db.table("practice_sessions")
            .insert({
                "user_id": current_user.id,
                "interview_id": payload.interview_id,
                "status": "in_progress",
                "question_ids": json.dumps(question_ids),
                "current_question_index": 0,
            })
            .execute()
        )
        if not ps_res.data:
            raise RuntimeError("Database did not return inserted practice session.")
        practice_session = ps_res.data[0]
    except Exception as e:
        logger.error(f"Error creating practice session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create practice session.",
        )

    return _map_session_response(practice_session, selected_questions, [])


@router.get("/{session_id}", response_model=PracticeSessionResponse)
async def get_practice_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Fetch a practice session with its questions and submitted answers."""
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid practice session ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    ps_res = db.table("practice_sessions").select("*").eq("id", session_id).execute()
    if not ps_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found.",
        )
    practice_session = ps_res.data[0]

    if practice_session["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this practice session.",
        )

    # Resolve question order from stored question_ids snapshot
    question_ids_raw = practice_session.get("question_ids", [])
    if isinstance(question_ids_raw, str):
        try:
            question_ids_raw = json.loads(question_ids_raw)
        except Exception:
            question_ids_raw = []

    questions: list[dict[str, Any]] = []
    if question_ids_raw:
        q_res = (
            db.table("interview_questions")
            .select("*")
            .in_("id", question_ids_raw)
            .execute()
        )
        # Re-sort to match question_ids snapshot order
        q_by_id = {str(q["id"]): q for q in (q_res.data or [])}
        questions = [q_by_id[qid] for qid in question_ids_raw if qid in q_by_id]

    answers_res = (
        db.table("practice_answers")
        .select("*")
        .eq("practice_session_id", session_id)
        .order("answered_at", desc=False)
        .execute()
    )
    answers = answers_res.data or []

    return _map_session_response(practice_session, questions, answers)


@router.post("/{session_id}/answers", response_model=PracticeAnswerResponse, status_code=status.HTTP_201_CREATED)
async def submit_answer(
    session_id: str,
    payload: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Submit a typed answer for the current question in a practice session.
    Immediately triggers AI evaluation via Groq and advances current_question_index.
    """
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid practice session ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()
    settings = get_settings()

    # Fetch practice session
    ps_res = db.table("practice_sessions").select("*").eq("id", session_id).execute()
    if not ps_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found.",
        )
    practice_session = ps_res.data[0]

    if practice_session["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to submit answers to this practice session.",
        )

    if practice_session["status"] != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Practice session is already '{practice_session['status']}'. Cannot submit more answers.",
        )

    # Resolve current question from snapshot
    question_ids_raw = practice_session.get("question_ids", [])
    if isinstance(question_ids_raw, str):
        try:
            question_ids_raw = json.loads(question_ids_raw)
        except Exception:
            question_ids_raw = []

    current_index = practice_session.get("current_question_index", 0)

    if current_index >= len(question_ids_raw):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All questions have already been answered. Complete the session to see your results.",
        )

    current_question_id = question_ids_raw[current_index]

    # Fetch that question's details
    q_res = (
        db.table("interview_questions")
        .select("*")
        .eq("id", current_question_id)
        .execute()
    )
    if not q_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current practice question not found.",
        )
    question = q_res.data[0]

    # Fetch interview session for seniority context
    interview_res = db.table("interviews").select("seniority").eq("id", practice_session["interview_id"]).execute()
    seniority = interview_res.data[0]["seniority"] if interview_res.data else "Mid"

    # AI Evaluation
    evaluation_data: dict[str, Any] = {}
    evaluated = False
    try:
        evaluation = await evaluate_answer(
            question_text=question["question_text"],
            answer_text=payload.answer_text,
            category=question.get("category", "technical"),
            difficulty=question.get("difficulty", "medium"),
            competency=question.get("competency", "General"),
            seniority=seniority,
            settings=settings,
        )
        evaluation_data = {
            "score": evaluation.score,
            "rating": evaluation.rating,
            "strengths": evaluation.strengths,
            "improvements": evaluation.improvements,
            "model_answer": evaluation.model_answer,
            "feedback_json": evaluation.model_dump(),
            "evaluated": True,
        }
        evaluated = True
    except AnswerEvaluationError as err:
        logger.warning(f"Answer evaluation failed for session {session_id}: {err.message}")
        # Store answer without evaluation - do not raise; evaluation is best-effort
    except Exception as e:
        logger.exception(f"Unexpected evaluation error for session {session_id}: {e}")

    # Insert the answer record
    answer_record: dict[str, Any] = {
        "practice_session_id": session_id,
        "user_id": current_user.id,
        "interview_question_id": current_question_id,
        "question_text": question["question_text"],
        "answer_text": payload.answer_text,
        "evaluated": evaluated,
        **evaluation_data,
    }

    try:
        ans_res = db.table("practice_answers").insert(answer_record).execute()
        if not ans_res.data:
            raise RuntimeError("Database did not return inserted answer record.")
        saved_answer = ans_res.data[0]
    except Exception as e:
        logger.error(f"Error saving practice answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save your answer.",
        )

    # Advance current_question_index
    next_index = current_index + 1
    try:
        db.table("practice_sessions").update({"current_question_index": next_index}).eq("id", session_id).execute()
    except Exception as e:
        logger.warning(f"Failed to advance question index for session {session_id}: {e}")

    return _map_answer_response(saved_answer)


@router.post("/{session_id}/complete", response_model=CompletePracticeResponse)
async def complete_practice_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Mark a practice session as completed and compute the overall score.
    Can be called after all questions answered, or to abandon mid-way.
    """
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid practice session ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    ps_res = db.table("practice_sessions").select("*").eq("id", session_id).execute()
    if not ps_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found.",
        )
    practice_session = ps_res.data[0]

    if practice_session["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to complete this practice session.",
        )

    if practice_session["status"] == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Practice session is already completed.",
        )

    # Fetch all answers for this session
    answers_res = (
        db.table("practice_answers")
        .select("*")
        .eq("practice_session_id", session_id)
        .order("answered_at", desc=False)
        .execute()
    )
    answers = answers_res.data or []

    # Compute overall score from evaluated answers
    scored = [a for a in answers if a.get("evaluated") and a.get("score") is not None]
    overall_score = round(sum(a["score"] for a in scored) / len(scored), 2) if scored else None

    # Mark session completed
    from datetime import datetime, timezone
    completed_at = datetime.now(timezone.utc).isoformat()
    try:
        update_res = (
            db.table("practice_sessions")
            .update({
                "status": "completed",
                "overall_score": overall_score,
                "completed_at": completed_at,
            })
            .eq("id", session_id)
            .execute()
        )
        updated_session = update_res.data[0] if update_res.data else practice_session
    except Exception as e:
        logger.error(f"Error completing practice session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete practice session.",
        )

    question_ids_raw = updated_session.get("question_ids", [])
    if isinstance(question_ids_raw, str):
        try:
            question_ids_raw = json.loads(question_ids_raw)
        except Exception:
            question_ids_raw = []

    return CompletePracticeResponse(
        id=str(updated_session["id"]),
        interview_id=str(updated_session["interview_id"]),
        status=updated_session["status"],
        overall_score=updated_session.get("overall_score"),
        total_questions=len(question_ids_raw),
        answered_questions=len(answers),
        answers=[_map_answer_response(a) for a in answers],
        completed_at=str(updated_session.get("completed_at", "")),
    )


@router.get("/{session_id}/answers", response_model=list[PracticeAnswerResponse])
async def list_practice_answers(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """List all submitted answers for a practice session."""
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid practice session ID format. Expected a valid UUID.",
        )

    db = get_supabase_admin_client()

    ps_res = db.table("practice_sessions").select("id, user_id").eq("id", session_id).execute()
    if not ps_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found.",
        )
    if ps_res.data[0]["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view answers for this practice session.",
        )

    answers_res = (
        db.table("practice_answers")
        .select("*")
        .eq("practice_session_id", session_id)
        .order("answered_at", desc=False)
        .execute()
    )
    return [_map_answer_response(a) for a in (answers_res.data or [])]
