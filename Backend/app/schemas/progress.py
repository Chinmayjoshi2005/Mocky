from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class PracticeHistoryItem(BaseModel):
    id: str
    interview_id: str
    role_title: str
    company_name: Optional[str] = None
    status: str
    overall_score: Optional[float] = None
    total_questions: int
    answered_questions: int
    started_at: str
    completed_at: Optional[str] = None


class ProgressSummary(BaseModel):
    total_interviews: int
    total_practice_sessions: int
    completed_practice_sessions: int
    average_score: Optional[float] = None
    recent_sessions: list[PracticeHistoryItem] = Field(default_factory=list)


class CreateGoalRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=160)
    target_date: Optional[date] = None


class UpdateGoalRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=160)
    target_date: Optional[date] = None
    is_completed: Optional[bool] = None


class GoalResponse(BaseModel):
    id: str
    title: str
    target_date: Optional[date] = None
    is_completed: bool
    created_at: str
    updated_at: str
