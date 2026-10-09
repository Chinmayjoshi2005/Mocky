import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client, create_client

from app.auth import User, get_current_user
from app.config import get_settings
from app.schemas.progress import (
    CreateGoalRequest,
    GoalResponse,
    PracticeHistoryItem,
    ProgressSummary,
    UpdateGoalRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["progress"])


def get_supabase_admin_client() -> Client:
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _question_count(value: Any) -> int:
    if isinstance(value, list):
        return len(value)
    if isinstance(value, str):
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError:
            logger.warning("Stored practice question list was not valid JSON.")
            return 0
        return len(decoded) if isinstance(decoded, list) else 0
    return 0


def _map_goal(goal: dict[str, Any]) -> GoalResponse:
    return GoalResponse(
        id=str(goal["id"]),
        title=goal["title"],
        target_date=goal.get("target_date"),
        is_completed=bool(goal.get("is_completed", False)),
        created_at=str(goal["created_at"]),
        updated_at=str(goal["updated_at"]),
    )


@router.get("/progress", response_model=ProgressSummary)
async def get_progress(current_user: User = Depends(get_current_user)):
    """Return private practice history and aggregate progress for the current user."""
    db = get_supabase_admin_client()

    try:
        interview_result = (
            db.table("interviews")
            .select("id")
            .eq("user_id", current_user.id)
            .execute()
        )
        sessions_result = (
            db.table("practice_sessions")
            .select(
                "id, interview_id, status, question_ids, overall_score, started_at, completed_at"
            )
            .eq("user_id", current_user.id)
            .order("started_at", desc=True)
            .execute()
        )

        sessions = sessions_result.data or []
        interview_ids = list({str(item["interview_id"]) for item in sessions})
        interviews_by_id: dict[str, dict[str, Any]] = {}
        if interview_ids:
            interview_details = (
                db.table("interviews")
                .select("id, role_title, company_name")
                .eq("user_id", current_user.id)
                .in_("id", interview_ids)
                .execute()
            )
            interviews_by_id = {
                str(item["id"]): item for item in (interview_details.data or [])
            }

        answers_by_session: dict[str, int] = {}
        if sessions:
            answer_result = (
                db.table("practice_answers")
                .select("practice_session_id")
                .eq("user_id", current_user.id)
                .in_("practice_session_id", [str(item["id"]) for item in sessions])
                .execute()
            )
            for answer in answer_result.data or []:
                session_id = str(answer["practice_session_id"])
                answers_by_session[session_id] = answers_by_session.get(session_id, 0) + 1
    except Exception as exc:
        logger.exception("Failed to load progress data for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load progress right now. Please try again.",
        ) from exc

    history = []
    for session in sessions:
        interview = interviews_by_id.get(str(session["interview_id"]), {})
        history.append(
            PracticeHistoryItem(
                id=str(session["id"]),
                interview_id=str(session["interview_id"]),
                role_title=interview.get("role_title", "Interview practice"),
                company_name=interview.get("company_name"),
                status=session.get("status", "in_progress"),
                overall_score=session.get("overall_score"),
                total_questions=_question_count(session.get("question_ids")),
                answered_questions=answers_by_session.get(str(session["id"]), 0),
                started_at=str(session["started_at"]),
                completed_at=(
                    str(session["completed_at"]) if session.get("completed_at") else None
                ),
            )
        )

    scored_sessions = [
        item.overall_score
        for item in history
        if item.status == "completed" and item.overall_score is not None
    ]
    average_score = (
        round(sum(scored_sessions) / len(scored_sessions), 2)
        if scored_sessions
        else None
    )

    return ProgressSummary(
        total_interviews=len(interview_result.data or []),
        total_practice_sessions=len(history),
        completed_practice_sessions=sum(
            item.status == "completed" for item in history
        ),
        average_score=average_score,
        recent_sessions=history[:10],
    )


@router.get("/goals", response_model=list[GoalResponse])
async def list_goals(current_user: User = Depends(get_current_user)):
    db = get_supabase_admin_client()
    try:
        result = (
            db.table("improvement_goals")
            .select("*")
            .eq("user_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to load improvement goals for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load goals right now. Please try again.",
        ) from exc
    return [_map_goal(goal) for goal in (result.data or [])]


@router.post(
    "/goals",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_goal(
    payload: CreateGoalRequest,
    current_user: User = Depends(get_current_user),
):
    db = get_supabase_admin_client()
    try:
        result = (
            db.table("improvement_goals")
            .insert(
                {
                    "user_id": current_user.id,
                    **payload.model_dump(mode="json"),
                }
            )
            .execute()
        )
        if not result.data:
            raise RuntimeError("Database did not return the created goal.")
    except Exception as exc:
        logger.exception("Failed to create improvement goal for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create this goal right now. Please try again.",
        ) from exc
    return _map_goal(result.data[0])


@router.patch("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    payload: UpdateGoalRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        uuid.UUID(goal_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid goal ID format. Expected a valid UUID.",
        ) from exc

    update_data = payload.model_dump(mode="json", exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one goal field to update.",
        )

    db = get_supabase_admin_client()
    try:
        result = (
            db.table("improvement_goals")
            .update(update_data)
            .eq("id", goal_id)
            .eq("user_id", current_user.id)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to update goal %s for user %s", goal_id, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update this goal right now. Please try again.",
        ) from exc
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    return _map_goal(result.data[0])


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
):
    try:
        uuid.UUID(goal_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid goal ID format. Expected a valid UUID.",
        ) from exc

    db = get_supabase_admin_client()
    try:
        existing = (
            db.table("improvement_goals")
            .select("id")
            .eq("id", goal_id)
            .eq("user_id", current_user.id)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to verify goal %s for user %s", goal_id, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete this goal right now. Please try again.",
        ) from exc
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found.",
        )

    try:
        (
            db.table("improvement_goals")
            .delete()
            .eq("id", goal_id)
            .eq("user_id", current_user.id)
            .execute()
        )
    except Exception as exc:
        logger.exception("Failed to delete goal %s for user %s", goal_id, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete this goal right now. Please try again.",
        ) from exc
