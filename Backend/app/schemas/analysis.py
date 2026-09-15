from typing import Optional, List
from pydantic import BaseModel, Field


class SkillsSchema(BaseModel):
    programming_languages: List[str] = Field(default_factory=list)
    frameworks_tools: List[str] = Field(default_factory=list)
    databases_cloud: List[str] = Field(default_factory=list)
    other: List[str] = Field(default_factory=list)


class ExperienceItemSchema(BaseModel):
    company: str
    role: str
    dates: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)


class EducationItemSchema(BaseModel):
    institution: str
    degree: Optional[str] = None
    dates: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)


class ProjectItemSchema(BaseModel):
    name: str
    technologies: List[str] = Field(default_factory=list)
    highlights: List[str] = Field(default_factory=list)


class CandidateProfileSchema(BaseModel):
    summary: Optional[str] = None
    skills: SkillsSchema = Field(default_factory=SkillsSchema)
    experience: List[ExperienceItemSchema] = Field(default_factory=list)
    education: List[EducationItemSchema] = Field(default_factory=list)
    projects: List[ProjectItemSchema] = Field(default_factory=list)


class ResumeAnalysisResponse(BaseModel):
    id: str
    resume_id: str
    status: str
    profile: Optional[CandidateProfileSchema] = None
    error: Optional[str] = None
    analysis_version: int = 1
    created_at: str
    updated_at: str
