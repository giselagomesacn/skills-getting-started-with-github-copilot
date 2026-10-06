import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture
def test_activities(monkeypatch):
    activities = {
        "Chess Club": {
            "description": "Practice chess",
            "schedule": "Fridays",
            "max_participants": 4,
            "participants": ["student@mergington.edu"],
        }
    }
    monkeypatch.setattr(app_module, "activities", activities)
    return activities


@pytest.fixture
def client(test_activities):
    with TestClient(app_module.app) as test_client:
        yield test_client


def test_get_activities_returns_current_activities(client, test_activities):
    # Arrange
    expected_activities = test_activities

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json() == expected_activities


def test_signup_adds_participant(client, test_activities):
    # Arrange
    activity_name = "Chess Club"
    email = "new.student@mergington.edu"

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for {activity_name}"}
    assert email in test_activities[activity_name]["participants"]


def test_signup_rejects_duplicate_participant(client, test_activities):
    # Arrange
    activity_name = "Chess Club"
    email = test_activities[activity_name]["participants"][0]

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "Student already signed up for this activity"}
    assert test_activities[activity_name]["participants"] == [email]


def test_signup_rejects_unknown_activity(client, test_activities):
    # Arrange
    activity_name = "Unknown Activity"
    email = "new.student@mergington.edu"

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}
    assert list(test_activities) == ["Chess Club"]


def test_unregister_removes_participant(client, test_activities):
    # Arrange
    activity_name = "Chess Club"
    email = test_activities[activity_name]["participants"][0]

    # Act
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from {activity_name}"}
    assert email not in test_activities[activity_name]["participants"]


def test_unregister_rejects_unknown_activity(client):
    # Arrange
    activity_name = "Unknown Activity"
    email = "student@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}


def test_unregister_rejects_unregistered_participant(client, test_activities):
    # Arrange
    activity_name = "Chess Club"
    email = "not.signed.up@mergington.edu"
    original_participants = test_activities[activity_name]["participants"].copy()

    # Act
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Student is not signed up for this activity"}
    assert test_activities[activity_name]["participants"] == original_participants
