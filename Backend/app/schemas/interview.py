from typing import Literal, Optional
from pydantic import BaseModel, Field


class QuestionItem(BaseModel):
    """Pydantic model representing a single generated interview question."""

    question_text: str = Field(
        ...,
        description="The clear, professional interview question text addressed to the candidate.",
    )
    category: Literal["technical", "system_design", "behavioral", "problem_solving", "experience"] = Field(
        ...,
        description="Core category of the question.",
    )
    difficulty: Literal["easy", "medium", "hard"] = Field(
        ...,
        description="Difficulty level calibrated to seniority.",
    )
    competency: str = Field(
        ...,
        description="Specific technical or behavioral competency being assessed.",
    )
    context_source: Literal["resume", "job_description", "both", "user"] = Field(
        ...,
        description="Source material that triggered or grounded this question.",
    )
    rationale: str = Field(
        ...,
        description="Grounded explanation of why this question is relevant based on candidate background and job requirements.",
    )
    order_index: int = Field(
        default=0,
        description="Sequence index for the question.",
    )
    is_selected: bool = Field(
        default=True,
        description="Whether this question is selected for active practice.",
    )


class GeneratedQuestionsSchema(BaseModel):
    """Container schema for the LLM structured JSON response."""

    questions: list[QuestionItem] = Field(
        ...,
        description="List of grounded interview questions.",
    )


class SingleQuestionContainerSchema(BaseModel):
    """Container schema when regenerating a single interview question."""

    question: QuestionItem = Field(
        ...,
        description="Single replacement interview question.",
    )


class GenerateInterviewRequest(BaseModel):
    """Payload for initiating personalised question generation."""

    resume_id: Optional[str] = None
    job_description_id: Optional[str] = None
    num_questions: int = Field(default=6, ge=3, le=12)


class UpdateQuestionRequest(BaseModel):
    """Payload for modifying an existing question or toggling practice selection."""

    question_text: Optional[str] = Field(None, min_length=5)
    category: Optional[Literal["technical", "system_design", "behavioral", "problem_solving", "experience"]] = None
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    competency: Optional[str] = Field(None, min_length=2)
    is_selected: Optional[bool] = None


class CreateCustomQuestionRequest(BaseModel):
    """Payload for candidate adding their own custom question."""

    question_text: str = Field(..., min_length=5)
    category: Literal["technical", "system_design", "behavioral", "problem_solving", "experience"] = "technical"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    competency: str = Field(..., min_length=2)


class ReorderQuestionsRequest(BaseModel):
    """Payload for updating sequence ordering of questions."""

    question_ids: list[str] = Field(..., min_length=1)


class InterviewQuestionResponse(BaseModel):
    """API response model for an interview question."""

    id: str
    interview_id: str
    order_index: int
    question_text: str
    category: str
    difficulty: str
    competency: str
    context_source: str
    rationale: Optional[str] = None
    is_selected: bool = True
    created_at: str


class InterviewSessionResponse(BaseModel):
    """API response model for an interview session including questions."""

    id: str
    role_title: str
    company_name: Optional[str] = None
    seniority: str
    status: str
    resume_id: Optional[str] = None
    job_description_id: Optional[str] = None
    questions: list[InterviewQuestionResponse] = []
    created_at: str
    updated_at: str
