import pytest
from pydantic import ValidationError

from app.progress import _map_goal, _question_count
from app.schemas.progress import CreateGoalRequest, UpdateGoalRequest


def test_question_count_supports_jsonb_and_serialized_snapshots():
    assert _question_count(["one", "two"]) == 2
    assert _question_count('["one", "two"]') == 2
    assert _question_count('{"unexpected": "shape"}') == 0


def test_question_count_reports_invalid_serialized_snapshot_as_empty():
    assert _question_count("not-json") == 0


def test_goal_mapping_normalizes_database_record():
    goal = _map_goal(
        {
            "id": "goal-id",
            "title": "Practise system design",
            "target_date": "2026-11-01",
            "is_completed": False,
            "created_at": "2026-10-08T12:00:00+00:00",
            "updated_at": "2026-10-08T12:00:00+00:00",
        }
    )

    assert goal.id == "goal-id"
    assert goal.title == "Practise system design"
    assert goal.target_date.isoformat() == "2026-11-01"
    assert goal.is_completed is False


def test_goal_requests_validate_title_and_completion_fields():
    assert CreateGoalRequest(title="Practise testing").title == "Practise testing"
    assert UpdateGoalRequest(is_completed=True).is_completed is True

    with pytest.raises(ValidationError):
        CreateGoalRequest(title="x")
