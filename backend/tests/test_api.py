"""
API integration tests using TestClient.
"""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Use in-memory SQLite for tests
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
    """Create tables before each test and drop them after."""
    from app.models import event, budget, task, vendor, plan  # noqa
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_event_data():
    return {
        "name": "Test Birthday Party",
        "event_type": "birthday",
        "event_date": "2027-06-15",
        "location": "Mumbai",
        "guest_count": 50,
        "total_budget": 100000.0,
        "description": "A fun birthday party",
        "preferences": "Outdoor setting preferred",
    }


class TestHealthEndpoint:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["planforge"] == "active"


class TestEventAPI:
    def test_create_event_success(self, client, sample_event_data):
        response = client.post("/api/v1/events/", json=sample_event_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Birthday Party"
        assert data["event_type"] == "birthday"
        assert "id" in data
        assert "feasibility" in data

    def test_create_event_invalid_budget(self, client):
        data = {
            "name": "Bad Event",
            "event_type": "birthday",
            "event_date": "2027-06-15",
            "location": "Delhi",
            "guest_count": 10,
            "total_budget": -1000,
        }
        response = client.post("/api/v1/events/", json=data)
        assert response.status_code == 422  # Validation error

    def test_create_event_empty_name(self, client):
        data = {
            "name": "   ",
            "event_type": "birthday",
            "event_date": "2027-06-15",
            "location": "Delhi",
            "guest_count": 10,
            "total_budget": 50000,
        }
        response = client.post("/api/v1/events/", json=data)
        assert response.status_code == 422

    def test_list_events(self, client, sample_event_data):
        client.post("/api/v1/events/", json=sample_event_data)
        response = client.get("/api/v1/events/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

    def test_get_event_not_found(self, client):
        response = client.get("/api/v1/events/nonexistent-id")
        assert response.status_code == 404

    def test_get_event_after_create(self, client, sample_event_data):
        create_resp = client.post("/api/v1/events/", json=sample_event_data)
        event_id = create_resp.json()["id"]
        get_resp = client.get(f"/api/v1/events/{event_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "Test Birthday Party"

    def test_validate_plan(self, client, sample_event_data):
        create_resp = client.post("/api/v1/events/", json=sample_event_data)
        event_id = create_resp.json()["id"]
        validate_resp = client.post(f"/api/v1/events/{event_id}/validate")
        assert validate_resp.status_code == 200
        data = validate_resp.json()
        assert "is_feasible" in data
        assert "budget" in data
        assert "scheduling" in data


class TestBudgetAPI:
    def _create_event(self, client, data):
        resp = client.post("/api/v1/events/", json=data)
        return resp.json()["id"]

    def test_get_budget_summary(self, client, sample_event_data):
        event_id = self._create_event(client, sample_event_data)
        resp = client.get(f"/api/v1/events/{event_id}/budget/")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_budget" in data
        assert "allocated_budget" in data
        assert "categories" in data

    def test_add_expense(self, client, sample_event_data):
        event_id = self._create_event(client, sample_event_data)
        expense_data = {
            "name": "DJ Equipment",
            "estimated_cost": 5000.0,
            "vendor_name": "Sound Co",
        }
        resp = client.post(f"/api/v1/events/{event_id}/budget/expenses", json=expense_data)
        assert resp.status_code == 201
        assert resp.json()["name"] == "DJ Equipment"


class TestTaskAPI:
    def _create_event(self, client, data):
        resp = client.post("/api/v1/events/", json=data)
        return resp.json()["id"]

    def test_list_tasks(self, client, sample_event_data):
        event_id = self._create_event(client, sample_event_data)
        resp = client.get(f"/api/v1/events/{event_id}/tasks/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_task(self, client, sample_event_data):
        event_id = self._create_event(client, sample_event_data)
        task_data = {
            "name": "Book Venue",
            "description": "Reserve the party venue",
            "priority": "high",
            "duration_days": 2,
        }
        resp = client.post(f"/api/v1/events/{event_id}/tasks/", json=task_data)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Book Venue"

    def test_update_task_status(self, client, sample_event_data):
        event_id = self._create_event(client, sample_event_data)
        # Get existing tasks
        tasks = client.get(f"/api/v1/events/{event_id}/tasks/").json()
        if tasks:
            task_id = tasks[0]["id"]
            resp = client.patch(
                f"/api/v1/events/{event_id}/tasks/{task_id}/status",
                json={"status": "completed"}
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "completed"


class TestReplanAPI:
    def _create_event(self, client, data):
        resp = client.post("/api/v1/events/", json=data)
        return resp.json()["id"]

    def _add_financial_exposure(self, client, event_id):
        expense_response = client.post(
            f"/api/v1/events/{event_id}/budget/expenses",
            json={
                "name": "Recorded spending",
                "estimated_cost": 46000,
                "actual_cost": 46000,
                "is_paid": True,
            },
        )
        assert expense_response.status_code == 201

        for status, cost in [
            ("booked", 25000),
            ("confirmed", 50000),
            ("cancelled", 90000),
            ("negotiating", 80000),
        ]:
            response = client.post(
                f"/api/v1/events/{event_id}/vendors/",
                json={
                    "category": f"{status} vendor",
                    "estimated_cost": cost,
                    "booking_status": status,
                },
            )
            assert response.status_code == 201

    def test_replan_preview_generated(self, client, sample_event_data):
        event_id = self._create_event(client, sample_event_data)
        replan_req = {
            "change_description": "Reduce budget to 80000",
            "new_budget": 80000.0,
        }
        resp = client.post(f"/api/v1/events/{event_id}/replan/preview", json=replan_req)
        assert resp.status_code == 200
        data = resp.json()
        assert "preview_token" in data
        assert "original_plan" in data
        assert "revised_plan" in data
        assert "feasibility_status" in data

    def test_replan_original_unchanged_before_accept(self, client, sample_event_data):
        """Original plan must not be modified before user accepts the replan."""
        event_id = self._create_event(client, sample_event_data)
        original_budget = sample_event_data["total_budget"]

        # Preview a budget reduction
        replan_req = {
            "change_description": "Reduce budget to 50000",
            "new_budget": 50000.0,
        }
        client.post(f"/api/v1/events/{event_id}/replan/preview", json=replan_req)

        # Event budget should still be original
        event_resp = client.get(f"/api/v1/events/{event_id}")
        assert event_resp.json()["total_budget"] == original_budget

    def test_financial_minimum_blocks_infeasible_preview_and_acceptance(
        self, client, sample_event_data
    ):
        event_data = {**sample_event_data, "total_budget": 300000.0}
        event_id = self._create_event(client, event_data)
        self._add_financial_exposure(client, event_id)

        preview_response = client.post(
            f"/api/v1/events/{event_id}/replan/preview",
            json={
                "change_description": "Reduce the budget to 100000",
                "new_budget": 100000.0,
            },
        )
        assert preview_response.status_code == 200
        preview = preview_response.json()
        assert preview["is_feasible"] is False
        assert preview["feasibility_status"] == "infeasible"
        assert preview["financial_feasibility"] == {
            "is_feasible": False,
            "proposed_budget": 100000.0,
            "actual_expenses": 46000.0,
            "vendor_commitments": 75000.0,
            "minimum_budget": 121000.0,
            "shortfall": 21000.0,
        }
        assert "₹21,000" in preview["explanation"]

        accept_response = client.post(
            f"/api/v1/events/{event_id}/replan/accept",
            json={"preview_token": preview["preview_token"]},
        )
        assert accept_response.status_code == 400
        event_after = client.get(f"/api/v1/events/{event_id}").json()
        assert event_after["total_budget"] == 300000.0
        assert event_after["event_date"] == event_data["event_date"]
        assert event_after["guest_count"] == event_data["guest_count"]
        history = client.get(f"/api/v1/events/{event_id}/replan/history").json()
        assert len(history) == 1

    def test_financial_exposure_is_scoped_to_the_selected_event(
        self, client, sample_event_data
    ):
        obligated_event_id = self._create_event(
            client, {**sample_event_data, "total_budget": 300000.0}
        )
        self._add_financial_exposure(client, obligated_event_id)
        other_event_id = self._create_event(
            client,
            {
                **sample_event_data,
                "name": "Independent Event",
                "planning_mode": "manual",
                "total_budget": 300000.0,
            },
        )

        response = client.post(
            f"/api/v1/events/{other_event_id}/replan/preview",
            json={
                "change_description": "Reduce the budget to 100000",
                "new_budget": 100000.0,
            },
        )
        assert response.status_code == 200
        financial = response.json()["financial_feasibility"]
        assert financial["is_feasible"] is True
        assert financial["actual_expenses"] == 0
        assert financial["vendor_commitments"] == 0
        assert financial["minimum_budget"] == 0
        assert financial["shortfall"] == 0

    @pytest.mark.parametrize("proposed_budget", [121000.0, 150000.0])
    def test_financial_minimum_allows_boundary_and_higher_budgets(
        self, client, sample_event_data, proposed_budget
    ):
        event_data = {
            **sample_event_data,
            "planning_mode": "manual",
            "total_budget": 300000.0,
        }
        event_id = self._create_event(client, event_data)
        self._add_financial_exposure(client, event_id)

        response = client.post(
            f"/api/v1/events/{event_id}/replan/preview",
            json={
                "change_description": f"Change the budget to {proposed_budget}",
                "new_budget": proposed_budget,
            },
        )
        assert response.status_code == 200
        preview = response.json()
        assert preview["financial_feasibility"]["is_feasible"] is True
        assert preview["financial_feasibility"]["shortfall"] == 0
        accept_response = client.post(
            f"/api/v1/events/{event_id}/replan/accept",
            json={"preview_token": preview["preview_token"]},
        )
        assert accept_response.status_code == 200
        assert client.get(f"/api/v1/events/{event_id}").json()["total_budget"] == proposed_budget

    def test_replan_preserves_schedule_constraints_and_rejects_acceptance(
        self, client, sample_event_data
    ):
        event_data = {**sample_event_data, "planning_mode": "manual"}
        event_id = self._create_event(client, event_data)
        first_task = client.post(
            f"/api/v1/events/{event_id}/tasks/",
            json={"name": "Complete prerequisite", "duration_days": 3},
        )
        assert first_task.status_code == 201
        dependent_task = client.post(
            f"/api/v1/events/{event_id}/tasks/",
            json={
                "name": "Meet dependent deadline",
                "duration_days": 2,
                "due_date": (date.today() + timedelta(days=2)).isoformat(),
                "dependency_ids": [first_task.json()["id"]],
            },
        )
        assert dependent_task.status_code == 201

        response = client.post(
            f"/api/v1/events/{event_id}/replan/preview",
            json={
                "change_description": "Increase guest count",
                "new_guest_count": event_data["guest_count"] + 25,
            },
        )
        assert response.status_code == 200
        preview = response.json()
        assert preview["revised_plan"]["guest_count"] == event_data["guest_count"] + 25
        assert preview["is_feasible"] is False
        assert preview["feasibility_details"]["scheduling"]["is_feasible"] is False
        assert any(
            deadline["task_id"] == dependent_task.json()["id"]
            for deadline in preview["feasibility_details"]["scheduling"]["impossible_deadlines"]
        )

        accept_response = client.post(
            f"/api/v1/events/{event_id}/replan/accept",
            json={"preview_token": preview["preview_token"]},
        )
        assert accept_response.status_code == 400
        event_after = client.get(f"/api/v1/events/{event_id}").json()
        assert event_after["guest_count"] == event_data["guest_count"]
        assert event_after["event_date"] == event_data["event_date"]

    def test_mandatory_budget_constraint_blocks_replan_acceptance(
        self, client, sample_event_data
    ):
        event_data = {**sample_event_data, "planning_mode": "manual", "total_budget": 300000.0}
        event_id = self._create_event(client, event_data)
        category_response = client.post(
            f"/api/v1/events/{event_id}/budget/categories",
            json={
                "name": "Mandatory venue",
                "allocated_amount": 120000.0,
                "is_mandatory": True,
                "is_fixed": True,
            },
        )
        assert category_response.status_code == 201

        response = client.post(
            f"/api/v1/events/{event_id}/replan/preview",
            json={
                "change_description": "Reduce the budget",
                "new_budget": 100000.0,
            },
        )
        assert response.status_code == 200
        preview = response.json()
        assert preview["is_feasible"] is False
        assert preview["feasibility_details"]["budget"]["is_feasible"] is False

        accept_response = client.post(
            f"/api/v1/events/{event_id}/replan/accept",
            json={"preview_token": preview["preview_token"]},
        )
        assert accept_response.status_code == 400
        assert client.get(f"/api/v1/events/{event_id}").json()["total_budget"] == 300000.0

    def test_replan_accept_saves_new_version(self, client, sample_event_data):
        """Feasible budget, date, and guest-count revisions can be accepted."""
        event_data = {**sample_event_data, "planning_mode": "manual"}
        event_id = self._create_event(client, event_data)
        revised_date = (date.today() + timedelta(days=365)).isoformat()
        replan_req = {
            "change_description": "Revise budget, date, and guest count",
            "new_budget": 80000.0,
            "new_date": revised_date,
            "new_guest_count": 75,
        }
        preview_resp = client.post(f"/api/v1/events/{event_id}/replan/preview", json=replan_req)
        assert preview_resp.json()["is_feasible"] is True
        token = preview_resp.json()["preview_token"]

        accept_resp = client.post(
            f"/api/v1/events/{event_id}/replan/accept",
            json={"preview_token": token}
        )
        assert accept_resp.status_code == 200
        assert accept_resp.json()["version_number"] >= 2
        revised_event = client.get(f"/api/v1/events/{event_id}").json()
        assert revised_event["total_budget"] == 80000.0
        assert revised_event["event_date"] == revised_date
        assert revised_event["guest_count"] == 75

    def test_get_plan_history(self, client, sample_event_data):
        event_id = self._create_event(client, sample_event_data)
        resp = client.get(f"/api/v1/events/{event_id}/replan/history")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1  # Initial version


class TestManualAndAIDraftPlanner:
    def test_create_manual_event_no_autogenerated_items(self, client):
        """Manual mode must create an event without invoking LLM or autogenerating tasks/categories."""
        manual_data = {
            "name": "Community Cleanliness Drive",
            "event_type": "community",
            "planning_mode": "manual",
            "event_date": "2027-08-20",
            "location": "Central Park",
            "guest_count": 80,
            "total_budget": 50000.0,
            "description": "Volunteer clean-up drive",
        }
        resp = client.post("/api/v1/events/", json=manual_data)
        assert resp.status_code == 201
        data = resp.json()
        assert data["planning_mode"] == "manual"
        assert data["is_ai_generated"] is False
        event_id = data["id"]

        # Tasks must be empty for manual event
        tasks_resp = client.get(f"/api/v1/events/{event_id}/tasks/")
        assert tasks_resp.status_code == 200
        assert len(tasks_resp.json()) == 0

        # Categories must be empty for manual event
        budget_resp = client.get(f"/api/v1/events/{event_id}/budget/")
        assert budget_resp.status_code == 200
        b_data = budget_resp.json()
        assert len(b_data["categories"]) == 0
        assert b_data["allocated_budget"] == 0
        assert b_data["unallocated_budget"] == 50000.0
        assert b_data["unspent_budget"] == 50000.0

    def test_generate_ai_draft_preview(self, client):
        """AI draft endpoint produces structured plan draft with staggered deadlines."""
        draft_req = {
            "name": "Graduation Fest 2027",
            "event_type": "college_fest",
            "event_date": "2027-10-15",
            "location": "Auditorium",
            "guest_count": 300,
            "total_budget": 300000.0,
        }
        resp = client.post("/api/v1/events/ai-draft", json=draft_req)
        assert resp.status_code == 200
        data = resp.json()
        assert "theme" in data
        assert "budget_categories" in data
        assert len(data["budget_categories"]) > 0
        assert "tasks" in data
        assert len(data["tasks"]) > 0
        assert "validation" in data

        # Check that preparation task deadlines are staggered before the event date
        for task in data["tasks"]:
            assert "due_date" in task
            assert task["due_date"] <= "2027-10-15"

    def test_create_ai_event_with_approved_draft(self, client):
        """User can submit an approved/edited draft to create an AI event."""
        approved_data = {
            "name": "Customized AI Birthday",
            "event_type": "birthday",
            "planning_mode": "ai",
            "event_date": "2027-11-20",
            "location": "Banquet Hall",
            "guest_count": 40,
            "total_budget": 60000.0,
            "initial_categories": [
                {"name": "Venue & Cake", "allocated_amount": 25000.0, "is_mandatory": True},
                {"name": "Entertainment", "allocated_amount": 15000.0, "is_mandatory": False},
            ],
            "initial_tasks": [
                {"name": "Reserve Hall", "priority": "high", "due_date": "2027-11-01", "duration_days": 2},
                {"name": "Order Theme Cake", "priority": "medium", "due_date": "2027-11-10", "duration_days": 1},
            ],
        }
        resp = client.post("/api/v1/events/", json=approved_data)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        # Verify initial approved items persisted
        tasks_resp = client.get(f"/api/v1/events/{event_id}/tasks/")
        assert len(tasks_resp.json()) == 2
        assert tasks_resp.json()[0]["name"] == "Reserve Hall"

        budget_resp = client.get(f"/api/v1/events/{event_id}/budget/")
        assert len(budget_resp.json()["categories"]) == 2
        assert budget_resp.json()["allocated_budget"] == 40000.0
        assert budget_resp.json()["unallocated_budget"] == 20000.0
