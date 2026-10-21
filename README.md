# Aventra

> **Every event, intelligently orchestrated.**  
> Powered by the **PlanForge Constraint Engine**  
> *PromptWars Virtual Challenge 5: Celebration & Event Planner*

---

## 1. Overview

**Aventra** is a production-minded celebration and event planning platform designed for weddings, birthdays, college fests, and community events. While modern LLMs excel at creative ideation and natural-language comprehension, they frequently produce mathematical hallucinations, ignore budget bounds, and fail at cyclic dependency resolution.

Aventra solves this via a **hybrid architecture**:
1. **Gemini AI** (`google-genai`): Interprets natural-language intent, extracts event parameters, and generates rich event themes and actionable task templates.
2. **PlanForge Constraint Engine**: A deterministic optimization module built in Python utilizing Google OR-Tools, topological graph sorting, and cycle detection to enforce budget ceilings, preserve mandatory expenses, and guarantee feasible scheduling.

> **PromptWars Rule Compliance**: Aventra does not use recommendation algorithms, vendor ranking, or automated vendor matching. Vendor tracking is strictly a manual organization checklist.

---

## 2. Visual Design & Architecture

The user interface follows the clean, professional visual layout of the **Aventik** reference design:
- **Clean Minimalist Theme**: Bright white primary background with soft grey surrounding surfaces (`#f4f6f8`), thin light-grey borders (`#e8eaed`), subtle shadows, and dark navy headings (`#1a2b4a`).
- **Signature Blue Accent**: `#2F80ED` primary accent with glowing blue stat card highlights.
- **Left Navigation Sidebar**: Aventra logo, Dashboard, My Events, Budget, Timeline, Tasks, Vendors, and AI Workspace.
- **Center Canvas**: Top search/navigation bar, running event overview with attendee bubbles, 3 key metrics (Total Budget, Planned, Actuals), PlanForge feasibility card, and tabbed schedule table with embedded visual Gantt blocks.
- **Right Panel**: Month-by-month mini calendar with highlight day, real-time activity stream, and dynamic event output sparkline.

---

## 3. Core Features

### A. Event Creation & Intelligent Baseline Synthesis
- Input validation for event name, event type (wedding, birthday, college fest, community, corporate, other), target date, location, guest count, and total budget.
- Optional configuration of **Mandatory Fixed Expenses** (e.g., non-negotiable venue deposits or permits).
- Generates structured planning data via Gemini AI when configured, or uses deterministic templates when no API key is provided (honestly labeled as template-based).
- Automatically runs PlanForge validation and establishes Plan Version 1.

### B. PlanForge Constraint Engine
Implemented as an independent, deterministic Python module in `backend/app/planforge/`:
- **Budget Constraints (`budget_engine.py`)**:
  - Total allocated budget must never exceed available budget.
  - Mandatory expenses are strictly preserved and never silently reduced.
  - Fixed expenses remain locked to their stated amounts.
  - Variable expenses are scaled proportionally within remaining bounds.
  - Detects impossible budget requirements and reports the **exact shortfall** in INR (`₹`).
- **Scheduling Constraints (`scheduling_engine.py`)**:
  - Validates durations, deadlines, and prerequisites.
  - Kahn's algorithm for topological sorting of tasks.
  - Depth-First Search (DFS) with three-color marking for cycle detection.
  - Flags impossible deadlines and tasks that would overrun the hard event date.
- **Unified Validator (`validator.py`)**:
  - Outputs structured feasibility results: `is_feasible`, `overall_status` (`feasible`, `warning`, `infeasible`), specific constraint violations, and human-readable explanations.

### C. Signature Feature: Constraint-Aware Intelligent Replanning
Modifying event parameters in natural language (e.g. *"Reduce my event budget from ₹250,000 to ₹180,000 and move the event two days earlier"*):
1. **Parse Changes**: Natural language parsed into structured parameters (`new_budget`, `new_date`, `new_guest_count`).
2. **Side-by-Side Preview**: Displays original plan versus revised plan before modifying anything.
3. **PlanForge Validation**: Automatically tests the proposed revision. If mandatory costs exceed the new budget or tasks cannot finish in time, the exact violation and shortfall are highlighted.
4. **User Control (Accept / Reject)**: The user inspects the preview and explicitly chooses to Accept or Reject. Original database state is never touched before acceptance.
5. **Version History**: Accepted revisions are archived as new immutable plan versions with change summaries and feasibility snapshots.

### D. Budget & Expense Management
- Category allocation tracking with interactive **Recharts** distribution visualization.
- Line-item expense records with estimated vs. actual costs and payment status.
- Real-time over-allocation and overspending warning banners.

### E. Task & Timeline Management
- Interactive task list with priority badges (`critical`, `high`, `medium`, `low`), duration, and due date.
- Visual timeline with dependency connections and milestone indicators.
- Instant task completion toggles that update dashboard statistics in real time.

### F. Vendor Checklist
- Manual checklist for tracking vendor/service category, company name, contact person, phone, email, estimated cost, and booking stage (`not_contacted`, `contacted`, `negotiating`, `booked`, `confirmed`).

---

## 4. Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, React Router v7.
- **Backend**: Python 3.13, FastAPI, SQLAlchemy, SQLite, Pydantic v2, Google OR-Tools.
- **AI Integration**: Google Gemini API via official `google-genai` Python SDK (with deterministic fallback mode).
- **Testing**: Pytest, FastAPI TestClient.

---

## 5. Project Structure

```
aventra/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (events, budget, tasks, vendors, replan)
│   │   ├── models/          # SQLAlchemy ORM models (event, budget, task, vendor, plan)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Business logic & Gemini AI service
│   │   ├── planforge/       # PlanForge deterministic constraint engine
│   │   │   ├── budget_engine.py
│   │   │   ├── scheduling_engine.py
│   │   │   └── validator.py
│   │   ├── config.py        # Settings & environment variables
│   │   ├── database.py      # SQLite connection & session management
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/
│   │   ├── test_planforge.py# PlanForge constraint engine test suite (23 tests)
│   │   └── test_api.py      # API endpoints & replanning test suite (17 tests)
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed API client
│   │   ├── components/      # Sidebar, Topbar, MiniCalendar, CreateEventModal
│   │   ├── context/         # AppContext for global event state
│   │   ├── pages/           # Dashboard, MyEvents, Budget, Timeline, Tasks, Vendors, AIWorkspace
│   │   ├── utils/           # Formatters (INR currency, dates)
│   │   ├── App.tsx          # Application routing & layout
│   │   ├── index.css        # Tailwind styling & Inter typography
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .env.example
├── .gitignore
└── README.md
```

---

## 6. Setup & Execution Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup
1. Open a terminal in the project root:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional) Set your Gemini API key in an environment variable or `.env` file:
   ```bash
   GEMINI_API_KEY="your_api_key_here"
   ```
   *(If omitted, Aventra automatically operates in deterministic template fallback mode with full PlanForge constraint validation).*

4. Run the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - API Documentation: `http://localhost:8000/api/docs`
   - Health Check: `http://localhost:8000/api/health`

### Frontend Setup
1. In a separate terminal:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:5173`.

---

## 7. Testing & Verification

Aventra includes 40 comprehensive automated tests covering constraint feasibility, shortfall detection, cycle detection, replanning immutability, and backend API contracts.

To execute the test suite:
```bash
cd backend
python -m pytest tests/ -v
```

### Verified Test Results
```
tests/test_api.py::TestHealthEndpoint::test_health_check PASSED
tests/test_api.py::TestEventAPI::test_create_event_success PASSED
tests/test_api.py::TestEventAPI::test_create_event_invalid_budget PASSED
tests/test_api.py::TestEventAPI::test_create_event_empty_name PASSED
tests/test_api.py::TestEventAPI::test_list_events PASSED
tests/test_api.py::TestEventAPI::test_get_event_not_found PASSED
tests/test_api.py::TestEventAPI::test_get_event_after_create PASSED
tests/test_api.py::TestEventAPI::test_validate_plan PASSED
tests/test_api.py::TestBudgetAPI::test_get_budget_summary PASSED
tests/test_api.py::TestBudgetAPI::test_add_expense PASSED
tests/test_api.py::TestTaskAPI::test_list_tasks PASSED
tests/test_api.py::TestTaskAPI::test_create_task PASSED
tests/test_api.py::TestTaskAPI::test_update_task_status PASSED
tests/test_api.py::TestReplanAPI::test_replan_preview_generated PASSED
tests/test_api.py::TestReplanAPI::test_replan_original_unchanged_before_accept PASSED
tests/test_api.py::TestReplanAPI::test_replan_accept_saves_new_version PASSED
tests/test_api.py::TestReplanAPI::test_get_plan_history PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_feasible_plan PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_mandatory_expenses_preserved PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_budget_shortfall_exact_amount PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_fixed_expense_not_reduced PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_zero_budget_infeasible PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_variable_items_scaled_when_over_budget PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_mandatory_violation_in_violations_list PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_budget_change_impact_detection PASSED
tests/test_planforge.py::TestBudgetConstraintEngine::test_empty_items_feasible PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_simple_schedule_feasible PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_circular_dependency_detected PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_impossible_deadline_detected PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_dependency_ordering PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_event_date_respected PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_empty_tasks_feasible PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_no_circular_for_valid_deps PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_days_until_event PASSED
tests/test_planforge.py::TestSchedulingConstraintEngine::test_three_way_circular_dependency PASSED
tests/test_planforge.py::TestPlanForgeValidator::test_fully_feasible_plan PASSED
tests/test_planforge.py::TestPlanForgeValidator::test_budget_infeasible_makes_plan_infeasible PASSED
tests/test_planforge.py::TestPlanForgeValidator::test_schedule_infeasible_makes_plan_infeasible PASSED
tests/test_planforge.py::TestPlanForgeValidator::test_to_dict_serializable PASSED
tests/test_planforge.py::TestPlanForgeValidator::test_replan_original_preserved PASSED

======================= 40 passed in 3.80s =======================
```

To run frontend production build:
```bash
cd frontend
npm run build
```
*(Builds with Vite & TypeScript without errors in <1s).*

---

## 8. Competition Compliance & Integrity Notes

- **Single Branch**: All code resides on the default `main` branch.
- **Repository Size**: Total source size is ~1.4 MB, well below the 10 MB threshold.
- **Security**: No secrets or API keys are committed or exposed in frontend code. Environment variables are managed securely via `.env`.
- **Database Safety**: Local SQLite databases (`*.db`) and build directories (`dist/`, `node_modules/`) are cleanly excluded in `.gitignore`.
- **Deterministic Math**: Budget totals, allocations, and scheduling order are strictly calculated by Python algorithms and Google OR-Tools—never hallucinated by generative AI.
