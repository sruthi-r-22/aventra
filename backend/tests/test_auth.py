"""Authentication and authorization isolation tests."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.event import Event, EventType, EventStatus

# In-memory test db
TEST_DATABASE_URL = "sqlite:///./test_aventra.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    from app.models import user, event, budget, task, vendor, plan  # noqa
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


def register_user(client: TestClient, email: str, name: str, password: str = "password123"):
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": name, "password": password}
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


class TestAuthEndpoints:
    def test_register_success(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "alice@example.com", "name": "Alice Organizer", "password": "securepassword"}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "alice@example.com"
        assert data["user"]["name"] == "Alice Organizer"
        # Check that HttpOnly cookie is set
        assert "access_token" in resp.cookies

    def test_register_duplicate_email(self, client):
        register_user(client, "alice@example.com", "Alice")
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "ALICE@example.com", "name": "Alice 2", "password": "password123"}
        )
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"]

    def test_register_short_password(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "bob@example.com", "name": "Bob", "password": "123"}
        )
        assert resp.status_code == 400

    def test_login_success(self, client):
        register_user(client, "alice@example.com", "Alice", "mypassword123")
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "alice@example.com", "password": "mypassword123"}
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        assert "access_token" in resp.cookies

    def test_login_wrong_password(self, client):
        register_user(client, "alice@example.com", "Alice", "mypassword123")
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "alice@example.com", "password": "wrongpassword"}
        )
        assert resp.status_code == 401

    def test_get_me_authenticated(self, client):
        token = register_user(client, "alice@example.com", "Alice")
        # Test with Bearer header
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "alice@example.com"

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401


class TestUnauthenticatedAccess:
    """Verify that unauthenticated requests to event resources return 401."""

    def test_events_require_auth(self, client):
        assert client.get("/api/v1/events/").status_code == 401
        assert client.post("/api/v1/events/", json={"name": "Test"}).status_code == 401
        assert client.get("/api/v1/events/some-id").status_code == 401
        assert client.put("/api/v1/events/some-id", json={"name": "Test"}).status_code == 401
        assert client.delete("/api/v1/events/some-id").status_code == 401
        assert client.post("/api/v1/events/some-id/validate").status_code == 401

    def test_nested_resources_require_auth(self, client):
        assert client.get("/api/v1/events/some-id/budget/").status_code == 401
        assert client.get("/api/v1/events/some-id/tasks/").status_code == 401
        assert client.get("/api/v1/events/some-id/vendors/").status_code == 401
        assert client.post("/api/v1/events/some-id/replan/preview", json={}).status_code == 401


class TestCrossUserDataIsolation:
    """Verify that User B cannot view, modify, or delete User A's events and resources."""

    @pytest.fixture
    def setup_users_and_event(self, client):
        client.cookies.clear()
        token_a = register_user(client, "user_a@example.com", "User A")
        client.cookies.clear()
        token_b = register_user(client, "user_b@example.com", "User B")
        client.cookies.clear()

        # User A creates an event
        resp_a = client.post(
            "/api/v1/events/",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "name": "User A Private Gala",
                "event_type": "corporate",
                "event_date": "2027-10-10",
                "location": "A-City",
                "guest_count": 100,
                "total_budget": 500000.0,
            }
        )
        assert resp_a.status_code == 201
        event_a_id = resp_a.json()["id"]

        # User A creates task and expense
        task_resp = client.post(
            f"/api/v1/events/{event_a_id}/tasks/",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"name": "Confidential Task", "priority": "high"}
        )
        task_a_id = task_resp.json()["id"]

        expense_resp = client.post(
            f"/api/v1/events/{event_a_id}/budget/expenses",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"name": "Secret Expense", "estimated_cost": 25000.0}
        )
        expense_a_id = expense_resp.json()["id"]

        return {
            "token_a": token_a,
            "token_b": token_b,
            "event_a_id": event_a_id,
            "task_a_id": task_a_id,
            "expense_a_id": expense_a_id,
        }

    def test_list_events_isolation(self, client, setup_users_and_event):
        data = setup_users_and_event
        # User A lists events -> sees event A
        resp_a = client.get("/api/v1/events/", headers={"Authorization": f"Bearer {data['token_a']}"})
        assert resp_a.status_code == 200
        assert any(e["id"] == data["event_a_id"] for e in resp_a.json())

        # User B lists events -> does NOT see event A
        resp_b = client.get("/api/v1/events/", headers={"Authorization": f"Bearer {data['token_b']}"})
        assert resp_b.status_code == 200
        assert resp_b.json() == []

    def test_cross_user_get_event_forbidden(self, client, setup_users_and_event):
        data = setup_users_and_event
        # User B tries to get User A's event -> returns 404
        resp = client.get(
            f"/api/v1/events/{data['event_a_id']}",
            headers={"Authorization": f"Bearer {data['token_b']}"}
        )
        assert resp.status_code == 404

    def test_cross_user_update_event_forbidden(self, client, setup_users_and_event):
        data = setup_users_and_event
        resp = client.put(
            f"/api/v1/events/{data['event_a_id']}",
            headers={"Authorization": f"Bearer {data['token_b']}"},
            json={"name": "Hacked Event Name"}
        )
        assert resp.status_code == 404

    def test_cross_user_delete_event_forbidden(self, client, setup_users_and_event):
        data = setup_users_and_event
        resp = client.delete(
            f"/api/v1/events/{data['event_a_id']}",
            headers={"Authorization": f"Bearer {data['token_b']}"}
        )
        assert resp.status_code == 404

        # Confirm event A still exists for User A
        resp_a = client.get(
            f"/api/v1/events/{data['event_a_id']}",
            headers={"Authorization": f"Bearer {data['token_a']}"}
        )
        assert resp_a.status_code == 200

    def test_cross_user_budget_forbidden(self, client, setup_users_and_event):
        data = setup_users_and_event
        resp = client.get(
            f"/api/v1/events/{data['event_a_id']}/budget/",
            headers={"Authorization": f"Bearer {data['token_b']}"}
        )
        assert resp.status_code == 404

        resp_exp = client.post(
            f"/api/v1/events/{data['event_a_id']}/budget/expenses",
            headers={"Authorization": f"Bearer {data['token_b']}"},
            json={"name": "Illegal Expense", "estimated_cost": 100.0}
        )
        assert resp_exp.status_code == 404

    def test_cross_user_tasks_forbidden(self, client, setup_users_and_event):
        data = setup_users_and_event
        resp = client.get(
            f"/api/v1/events/{data['event_a_id']}/tasks/",
            headers={"Authorization": f"Bearer {data['token_b']}"}
        )
        assert resp.status_code == 404

        resp_patch = client.patch(
            f"/api/v1/events/{data['event_a_id']}/tasks/{data['task_a_id']}/status",
            headers={"Authorization": f"Bearer {data['token_b']}"},
            json={"status": "completed"}
        )
        assert resp_patch.status_code == 404

    def test_legacy_null_user_event_never_exposed(self, client):
        """Preserve existing events with NULL ownership, but never expose them through API."""
        # Insert event with user_id = None directly in DB
        db = TestingSessionLocal()
        legacy_event = Event(
            id="legacy-null-event",
            name="Legacy Unassigned Event",
            event_type=EventType.other,
            event_date="2027-12-31",
            location="Legacy Hall",
            guest_count=50,
            total_budget=50000,
            status=EventStatus.active,
            user_id=None,
        )
        db.add(legacy_event)
        db.commit()
        db.close()

        # User logs in
        token = register_user(client, "newuser@example.com", "New User")

        # Check list_events
        list_resp = client.get("/api/v1/events/", headers={"Authorization": f"Bearer {token}"})
        assert list_resp.status_code == 200
        assert not any(e["id"] == "legacy-null-event" for e in list_resp.json())

        # Check direct get
        get_resp = client.get("/api/v1/events/legacy-null-event", headers={"Authorization": f"Bearer {token}"})
        assert get_resp.status_code == 404
