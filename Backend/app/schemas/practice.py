from typing import Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Groq LLM response schema
# ---------------------------------------------------------------------------

class AnswerEvaluationSchema(BaseModel):
    """Structured AI evaluation of a candidate's answer to an interview question."""

    score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Numeric score 0-100 reflecting answer quality against the question's competency.",
    )
    rating: Literal["poor", "fair", "good", "excellent"] = Field(
        ...,
        description="Qualitative rating bucket for the score.",
    )
    strengths: str = Field(
        ...,
        description="Specific strengths observed in the candidate's answer (2-4 sentences).",
    )
    improvements: str = Field(
        ...,
        description="Concrete, actionable improvements the candidate should make (2-4 sentences).",
    )
    model_answer: str = Field(
        ...,
        description="A concise model answer demonstrating what an excellent response would include (3-6 sentences).",
    )


# ---------------------------------------------------------------------------
# API Request schemas
# ---------------------------------------------------------------------------

class StartPracticeRequest(BaseModel):
    """Payload to start a new text practice session for an interview."""

    interview_id: str = Field(..., description="UUID of the interview session to practice.")


class SubmitAnswerRequest(BaseModel):
    """Payload for submitting a candidate's typed answer to a practice question."""

    answer_text: str = Field(
        ...,
        min_length=10,
        description="Candidate's typed answer. Must be at least 10 characters.",
    )


# ---------------------------------------------------------------------------
# API Response schemas
# ---------------------------------------------------------------------------

class PracticeAnswerResponse(BaseModel):
    """API response for a single submitted and evaluated practice answer."""

    id: str
    practice_session_id: str
    interview_question_id: str
    question_text: str
    answer_text: str
    score: Optional[int] = None
    rating: Optional[str] = None
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    model_answer: Optional[str] = None
    evaluated: bool = False
    answered_at: str


class PracticeQuestionItem(BaseModel):
    """Lightweight question representation surfaced during active practice."""

    id: str
    order_index: int
    question_text: str
    category: str
    difficulty: str
    competency: str
    context_source: str


class PracticeSessionResponse(BaseModel):
    """API response for a practice session (initial or refreshed state)."""

    id: str
    interview_id: str
    status: str
    current_question_index: int
    total_questions: int
    overall_score: Optional[float] = None
    questions: list[PracticeQuestionItem] = []
    answers: list[PracticeAnswerResponse] = []
    started_at: str
    completed_at: Optional[str] = None


class CompletePracticeResponse(BaseModel):
    """API response returned when a practice session is marked complete."""

    id: str
    interview_id: str
    status: str
    overall_score: Optional[float] = None
    total_questions: int
    answered_questions: int
    answers: list[PracticeAnswerResponse] = []
    completed_at: Optional[str] = None
