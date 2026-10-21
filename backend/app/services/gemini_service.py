"""
Gemini AI service for Aventra.

Handles structured AI generation with Pydantic validation and honest fallback.
All prompts are defined here, away from business logic.
"""
import json
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)


# ─── Structured output schemas ──────────────────────────────────────────────

class BudgetCategoryAI(BaseModel):
    name: str
    allocated_amount: float
    is_mandatory: bool = False
    is_fixed: bool = False
    notes: Optional[str] = None


class TaskAI(BaseModel):
    name: str
    description: Optional[str] = None
    priority: str = "medium"
    duration_days: int = 1
    is_milestone: bool = False
    notes: Optional[str] = None


class VendorCategoryAI(BaseModel):
    category: str
    notes: Optional[str] = None
    estimated_cost: Optional[float] = None


class EventPlanAI(BaseModel):
    theme: str
    description: str
    budget_categories: List[BudgetCategoryAI]
    tasks: List[TaskAI]
    vendor_categories: List[VendorCategoryAI]
    planning_notes: str
    is_ai_generated: bool = True


class ReplanChangeAI(BaseModel):
    field: str
    original_value: Any
    new_value: Any
    reason: str


class ReplanResultAI(BaseModel):
    summary: str
    changes: List[ReplanChangeAI]
    new_budget_categories: Optional[List[BudgetCategoryAI]] = None
    warnings: List[str] = []
    is_ai_generated: bool = True


# ─── Fallback templates ──────────────────────────────────────────────────────

FALLBACK_TEMPLATES: Dict[str, Dict] = {
    "wedding": {
        "theme": "Elegant Garden Wedding",
        "description": "A classic, elegant wedding with garden themes, floral decorations, and a formal dinner reception.",
        "budget_categories": [
            {"name": "Venue & Decoration", "pct": 0.28, "mandatory": True, "fixed": False},
            {"name": "Catering & Food", "pct": 0.30, "mandatory": True, "fixed": False},
            {"name": "Photography & Video", "pct": 0.10, "mandatory": False, "fixed": False},
            {"name": "Music & Entertainment", "pct": 0.08, "mandatory": False, "fixed": False},
            {"name": "Attire & Grooming", "pct": 0.06, "mandatory": False, "fixed": True},
            {"name": "Invitations & Stationery", "pct": 0.03, "mandatory": False, "fixed": False},
            {"name": "Flowers & Floral", "pct": 0.07, "mandatory": False, "fixed": False},
            {"name": "Transportation", "pct": 0.03, "mandatory": False, "fixed": False},
            {"name": "Miscellaneous", "pct": 0.05, "mandatory": False, "fixed": False},
        ],
        "tasks": [
            ("Book Venue", "Research and confirm venue availability and pricing", "critical", 3, True),
            ("Send Invitations", "Design and send wedding invitations to all guests", "high", 2, False),
            ("Finalize Catering Menu", "Decide menu and confirm headcount with caterer", "high", 2, False),
            ("Photography Consultation", "Meet with photographer to discuss coverage plan", "medium", 1, False),
            ("Arrange Flowers", "Order and confirm floral arrangements", "medium", 1, False),
            ("Plan Guest Seating", "Create seating chart for reception dinner", "medium", 2, False),
            ("Rehearsal", "Wedding rehearsal with all key participants", "high", 1, True),
        ],
        "vendor_categories": [
            "Venue", "Caterer", "Photographer", "Videographer",
            "Florist", "Band/DJ", "Wedding Planner"
        ],
        "planning_notes": "Template-based plan. Adjust allocations based on your specific priorities."
    },
    "birthday": {
        "theme": "Celebration Party",
        "description": "A fun and festive birthday celebration with friends and family.",
        "budget_categories": [
            {"name": "Venue", "pct": 0.25, "mandatory": True, "fixed": False},
            {"name": "Food & Catering", "pct": 0.35, "mandatory": True, "fixed": False},
            {"name": "Cake", "pct": 0.08, "mandatory": True, "fixed": True},
            {"name": "Decorations", "pct": 0.12, "mandatory": False, "fixed": False},
            {"name": "Entertainment", "pct": 0.10, "mandatory": False, "fixed": False},
            {"name": "Invitations", "pct": 0.03, "mandatory": False, "fixed": False},
            {"name": "Return Gifts", "pct": 0.07, "mandatory": False, "fixed": False},
        ],
        "tasks": [
            ("Book Venue", "Reserve party venue and confirm capacity", "critical", 2, True),
            ("Order Cake", "Place custom cake order with bakery", "high", 1, False),
            ("Send Invitations", "Send invites with RSVP deadline", "high", 1, False),
            ("Arrange Decorations", "Purchase and plan decoration setup", "medium", 2, False),
            ("Plan Entertainment", "Book entertainment or plan activities", "medium", 1, False),
            ("Confirm Catering", "Finalize food menu and headcount", "high", 1, False),
        ],
        "vendor_categories": [
            "Venue", "Bakery/Cake", "Caterer", "Decorator", "Photographer"
        ],
        "planning_notes": "Template-based plan. Customize for age group and preferences."
    },
    "college_fest": {
        "theme": "Annual College Festival",
        "description": "An energetic college fest with cultural performances, competitions, and food stalls.",
        "budget_categories": [
            {"name": "Stage & AV Equipment", "pct": 0.25, "mandatory": True, "fixed": False},
            {"name": "Guest Performances", "pct": 0.20, "mandatory": False, "fixed": False},
            {"name": "Food & Stalls", "pct": 0.15, "mandatory": False, "fixed": False},
            {"name": "Decorations & Signage", "pct": 0.10, "mandatory": False, "fixed": False},
            {"name": "Security", "pct": 0.08, "mandatory": True, "fixed": True},
            {"name": "Marketing & Posters", "pct": 0.07, "mandatory": False, "fixed": False},
            {"name": "Prizes & Awards", "pct": 0.08, "mandatory": False, "fixed": False},
            {"name": "Miscellaneous", "pct": 0.07, "mandatory": False, "fixed": False},
        ],
        "tasks": [
            ("Form Event Committee", "Establish organizing committee and assign roles", "critical", 3, True),
            ("Book Venue & Permits", "Secure venue and get necessary permissions", "critical", 5, True),
            ("Finalize Programme Schedule", "List all events, timings, and participants", "high", 4, False),
            ("Marketing Campaign", "Launch poster and social media campaigns", "medium", 7, False),
            ("Sound & Stage Setup", "Arrange AV equipment and stage construction", "high", 2, False),
            ("Registration & Entry", "Set up registration system and manage entries", "medium", 3, False),
        ],
        "vendor_categories": [
            "Stage/AV", "Security Agency", "Food Stall Vendors",
            "Printing", "Photographer/Videographer"
        ],
        "planning_notes": "Template-based plan for college fest. Scale based on expected attendance."
    },
    "community": {
        "theme": "Community Gathering",
        "description": "A community event bringing neighbors and local groups together.",
        "budget_categories": [
            {"name": "Venue/Open Space", "pct": 0.20, "mandatory": True, "fixed": False},
            {"name": "Food & Refreshments", "pct": 0.35, "mandatory": True, "fixed": False},
            {"name": "Activities & Games", "pct": 0.15, "mandatory": False, "fixed": False},
            {"name": "Decorations", "pct": 0.10, "mandatory": False, "fixed": False},
            {"name": "Sound System", "pct": 0.10, "mandatory": False, "fixed": False},
            {"name": "Miscellaneous", "pct": 0.10, "mandatory": False, "fixed": False},
        ],
        "tasks": [
            ("Reserve Space", "Book community hall or outdoor space", "critical", 2, True),
            ("Promote Event", "Distribute flyers and digital announcements", "medium", 3, False),
            ("Arrange Refreshments", "Plan and order food and drinks", "high", 2, False),
            ("Setup Activities", "Organize games and activity stations", "medium", 2, False),
            ("Day-of Setup", "Set up venue on the event morning", "high", 1, False),
        ],
        "vendor_categories": [
            "Venue", "Caterer", "Sound System", "Activity Organizer"
        ],
        "planning_notes": "Template-based community event plan."
    },
    "corporate": {
        "theme": "Corporate Event",
        "description": "Professional corporate event or conference.",
        "budget_categories": [
            {"name": "Venue & AV", "pct": 0.30, "mandatory": True, "fixed": False},
            {"name": "Catering", "pct": 0.25, "mandatory": True, "fixed": False},
            {"name": "Speaker/Performer Fees", "pct": 0.15, "mandatory": False, "fixed": False},
            {"name": "Marketing & Materials", "pct": 0.10, "mandatory": False, "fixed": False},
            {"name": "Accommodation", "pct": 0.10, "mandatory": False, "fixed": False},
            {"name": "Miscellaneous", "pct": 0.10, "mandatory": False, "fixed": False},
        ],
        "tasks": [
            ("Book Venue", "Reserve conference venue with AV support", "critical", 3, True),
            ("Confirm Speakers", "Finalize speaker list and presentations", "high", 5, False),
            ("Registration System", "Set up attendee registration portal", "medium", 3, False),
            ("Catering Arrangements", "Confirm meal plans and dietary requirements", "high", 2, False),
            ("Marketing Materials", "Prepare brochures, banners, and digital assets", "medium", 4, False),
        ],
        "vendor_categories": [
            "Venue", "AV Company", "Caterer", "Accommodation",
            "Printing", "Transportation"
        ],
        "planning_notes": "Template-based corporate event plan."
    },
    "other": {
        "theme": "Custom Event",
        "description": "A custom event tailored to your specific requirements.",
        "budget_categories": [
            {"name": "Venue", "pct": 0.25, "mandatory": True, "fixed": False},
            {"name": "Food & Beverages", "pct": 0.30, "mandatory": True, "fixed": False},
            {"name": "Entertainment", "pct": 0.15, "mandatory": False, "fixed": False},
            {"name": "Decorations", "pct": 0.15, "mandatory": False, "fixed": False},
            {"name": "Miscellaneous", "pct": 0.15, "mandatory": False, "fixed": False},
        ],
        "tasks": [
            ("Initial Planning", "Define event scope and objectives", "critical", 2, True),
            ("Book Venue", "Reserve venue for the event date", "critical", 2, False),
            ("Arrange Vendors", "Contact and confirm all required vendors", "high", 3, False),
            ("Final Confirmation", "Confirm all bookings and arrangements", "high", 1, False),
        ],
        "vendor_categories": ["Venue", "Caterer", "Decorator"],
        "planning_notes": "Template-based plan. Customize categories and tasks."
    }
}


def _build_fallback_plan(
    event_type: str,
    total_budget: float,
    guest_count: int,
    event_name: str,
) -> EventPlanAI:
    """Build a deterministic fallback plan based on event type templates."""
    template = FALLBACK_TEMPLATES.get(event_type, FALLBACK_TEMPLATES["other"])

    budget_categories = []
    for cat_def in template["budget_categories"]:
        amount = round(total_budget * cat_def["pct"])
        budget_categories.append(BudgetCategoryAI(
            name=cat_def["name"],
            allocated_amount=float(amount),
            is_mandatory=cat_def.get("mandatory", False),
            is_fixed=cat_def.get("fixed", False),
            notes=f"Illustrative estimate only (≈{int(cat_def['pct']*100)}% of budget)"
        ))

    tasks = []
    task_data = template.get("tasks", [])
    for t in task_data:
        if isinstance(t, tuple):
            name, desc, prio, dur, milestone = t
            tasks.append(TaskAI(
                name=name, description=desc, priority=prio,
                duration_days=dur, is_milestone=milestone
            ))
        else:
            tasks.append(TaskAI(**t))

    vendor_categories = [
        VendorCategoryAI(category=c)
        for c in template.get("vendor_categories", [])
    ]

    return EventPlanAI(
        theme=template["theme"],
        description=template["description"],
        budget_categories=budget_categories,
        tasks=tasks,
        vendor_categories=vendor_categories,
        planning_notes=(
            f"⚠️ TEMPLATE-BASED PLAN (not AI-generated). "
            f"{template['planning_notes']} "
            f"Budget allocations are illustrative estimates only, not verified costs."
        ),
        is_ai_generated=False,
    )


class GeminiService:
    """
    Gemini AI integration service.

    Uses google-genai SDK. Falls back to deterministic templates when API key
    is not configured or when the API call fails.
    """

    def __init__(self):
        self._client = None
        self._available = False
        self._init_client()

    def _init_client(self):
        """Initialize Gemini client if API key is available."""
        if not settings.gemini_api_key or settings.gemini_api_key == "your_gemini_api_key_here":
            logger.info("Gemini API key not configured. Using fallback template mode.")
            return
        try:
            from google import genai
            self._client = genai.Client(api_key=settings.gemini_api_key)
            self._available = True
            logger.info("Gemini client initialized successfully.")
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini client: {e}")

    @property
    def is_available(self) -> bool:
        return self._available

    def generate_event_plan(
        self,
        event_type: str,
        event_name: str,
        total_budget: float,
        guest_count: int,
        event_date: str,
        location: str,
        description: Optional[str] = None,
        preferences: Optional[str] = None,
        mandatory_expenses: Optional[List[Dict]] = None,
    ) -> EventPlanAI:
        """
        Generate a structured event plan.

        Returns AI-generated plan if Gemini is available, otherwise
        returns clearly-labeled template-based fallback.
        """
        if not self._available:
            return _build_fallback_plan(event_type, total_budget, guest_count, event_name)

        try:
            return self._call_gemini_for_plan(
                event_type, event_name, total_budget, guest_count,
                event_date, location, description, preferences, mandatory_expenses
            )
        except Exception as e:
            logger.warning(f"Gemini plan generation failed: {e}. Using fallback.")
            plan = _build_fallback_plan(event_type, total_budget, guest_count, event_name)
            plan.planning_notes += f" (AI call failed: {type(e).__name__})"
            plan.is_ai_generated = False
            return plan

    def _call_gemini_for_plan(
        self,
        event_type: str,
        event_name: str,
        total_budget: float,
        guest_count: int,
        event_date: str,
        location: str,
        description: Optional[str],
        preferences: Optional[str],
        mandatory_expenses: Optional[List[Dict]],
    ) -> EventPlanAI:
        """Make the actual Gemini API call for event planning."""
        mandatory_str = ""
        if mandatory_expenses:
            mandatory_str = f"\nMandatory expenses that must be included:\n" + \
                "\n".join([f"- {e.get('name', 'Item')}: ₹{e.get('amount', 0):,.0f}" for e in mandatory_expenses])

        prompt = f"""You are an expert event planner. Generate a detailed, practical event plan for:

Event Name: {event_name}
Event Type: {event_type}
Event Date: {event_date}
Location: {location}
Number of Guests: {guest_count}
Total Budget: ₹{total_budget:,.0f} (Indian Rupees)
{f'Description: {description}' if description else ''}
{f'Special Preferences: {preferences}' if preferences else ''}
{mandatory_str}

Return ONLY a valid JSON object with this exact structure:
{{
  "theme": "string - creative theme for this event",
  "description": "string - 2-3 sentence event description",
  "budget_categories": [
    {{
      "name": "Category Name",
      "allocated_amount": <number in INR>,
      "is_mandatory": <true/false>,
      "is_fixed": <true/false>,
      "notes": "brief note"
    }}
  ],
  "tasks": [
    {{
      "name": "Task Name",
      "description": "brief description",
      "priority": "low|medium|high|critical",
      "duration_days": <integer>,
      "is_milestone": <true/false>,
      "notes": "optional note"
    }}
  ],
  "vendor_categories": [
    {{
      "category": "Vendor Category Name",
      "notes": "what to look for",
      "estimated_cost": <number or null>
    }}
  ],
  "planning_notes": "string - key planning considerations"
}}

Rules:
- All allocated_amounts must sum to ≤ ₹{total_budget:,.0f}
- Include 5-10 budget categories covering major expense areas
- Include 6-12 specific, actionable tasks
- Mark mandatory items (cannot be removed) with is_mandatory: true
- Mark fixed-price items with is_fixed: true
- Include 4-8 vendor categories relevant to this event type
- Use INR amounts only
- Do not invent specific vendor names or booking confirmations
- Notes should clarify that costs are illustrative estimates
- Return ONLY the JSON, no markdown, no explanation"""

        from google import genai
        response = self._client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        data = json.loads(raw)
        plan = EventPlanAI(**data)
        plan.is_ai_generated = True
        return plan

    def parse_replan_request(
        self,
        change_description: str,
        current_budget: float,
        current_date: str,
        current_guest_count: int,
        event_type: str,
        event_name: str,
    ) -> Dict[str, Any]:
        """
        Parse a natural-language replan request into structured changes.
        """
        if not self._available:
            return self._fallback_parse_replan(
                change_description, current_budget, current_date, current_guest_count
            )

        try:
            return self._call_gemini_replan(
                change_description, current_budget, current_date,
                current_guest_count, event_type, event_name
            )
        except Exception as e:
            logger.warning(f"Gemini replan parsing failed: {e}. Using fallback.")
            return self._fallback_parse_replan(
                change_description, current_budget, current_date, current_guest_count
            )

    def _call_gemini_replan(
        self,
        change_description: str,
        current_budget: float,
        current_date: str,
        current_guest_count: int,
        event_type: str,
        event_name: str,
    ) -> Dict[str, Any]:
        """Call Gemini to parse replan request."""
        prompt = f"""Parse this event planning change request and extract structured changes.

Event: {event_name} ({event_type})
Current Budget: ₹{current_budget:,.0f}
Current Date: {current_date}
Current Guests: {current_guest_count}

Change Request: "{change_description}"

Return ONLY valid JSON:
{{
  "new_budget": <number or null>,
  "new_date": "<ISO date string or null>",
  "new_guest_count": <integer or null>,
  "summary": "one sentence summary of changes",
  "warnings": ["list of potential issues"],
  "is_ai_generated": true
}}

Rules:
- Extract only explicitly stated changes
- If budget is mentioned (e.g., "reduce to 1 lakh"), set new_budget in INR
- If date changes mentioned, calculate new ISO date
- Return null for unchanged fields
- Return ONLY the JSON"""

        from google import genai
        response = self._client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        return json.loads(raw)

    def _fallback_parse_replan(
        self,
        change_description: str,
        current_budget: float,
        current_date: str,
        current_guest_count: int,
    ) -> Dict[str, Any]:
        """
        Deterministic fallback parser for replan requests.
        Extracts numbers and keywords from the description.
        """
        import re
        desc_lower = change_description.lower()

        new_budget = None
        new_date = None
        new_guest_count = None
        warnings = []

        # Extract budget mentions
        budget_patterns = [
            r'₹\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lakhs|l\b)?',
            r'rs\.?\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lakhs|l\b)?',
            r'inr\s*([\d,]+(?:\.\d+)?)',
            r'budget.*?(\d[\d,]+)',
        ]
        for pattern in budget_patterns:
            match = re.search(pattern, desc_lower)
            if match:
                amount_str = match.group(1).replace(',', '')
                amount = float(amount_str)
                if 'lakh' in desc_lower or ' l ' in desc_lower:
                    amount *= 100000
                new_budget = amount
                break

        # Extract guest count
        guest_match = re.search(r'(\d+)\s*(?:guests?|people|persons?|attendees?)', desc_lower)
        if guest_match:
            new_guest_count = int(guest_match.group(1))

        # Extract date shifts
        days_earlier = re.search(r'(\d+)\s*days?\s+earlier', desc_lower)
        days_later = re.search(r'(\d+)\s*days?\s+later', desc_lower)
        if days_earlier:
            from datetime import datetime, timedelta
            try:
                dt = datetime.fromisoformat(current_date)
                new_dt = dt - timedelta(days=int(days_earlier.group(1)))
                new_date = new_dt.date().isoformat()
            except Exception:
                warnings.append("Could not parse date change. Please specify an exact date.")
        elif days_later:
            from datetime import datetime, timedelta
            try:
                dt = datetime.fromisoformat(current_date)
                new_dt = dt + timedelta(days=int(days_later.group(1)))
                new_date = new_dt.date().isoformat()
            except Exception:
                warnings.append("Could not parse date change.")

        if new_budget and new_budget < current_budget * 0.5:
            warnings.append(
                f"Budget reduction of more than 50% (from ₹{current_budget:,.0f} to "
                f"₹{new_budget:,.0f}) may make the plan infeasible."
            )

        changes = []
        if new_budget:
            changes.append(f"budget to ₹{new_budget:,.0f}")
        if new_date:
            changes.append(f"date to {new_date}")
        if new_guest_count:
            changes.append(f"guests to {new_guest_count}")

        return {
            "new_budget": new_budget,
            "new_date": new_date,
            "new_guest_count": new_guest_count,
            "summary": f"Changing {', '.join(changes)}" if changes else "No specific changes detected",
            "warnings": warnings,
            "is_ai_generated": False,
        }

    def explain_constraint_violation(
        self,
        violation_details: Dict[str, Any],
        event_name: str,
    ) -> str:
        """Generate a human-readable explanation of constraint violations."""
        if not self._available:
            return self._fallback_explain_violation(violation_details)

        try:
            prompt = f"""Explain these event planning constraint violations to a non-technical user:

Event: {event_name}
Violations: {json.dumps(violation_details, indent=2)}

Write 2-3 clear, actionable sentences explaining:
1. What the problem is
2. Why it matters
3. What the user can do to fix it

Be concise and helpful. No jargon."""

            from google import genai
            response = self._client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini explanation failed: {e}")
            return self._fallback_explain_violation(violation_details)

    def _fallback_explain_violation(self, violation_details: Dict[str, Any]) -> str:
        """Deterministic fallback explanation."""
        violations = violation_details.get("violations", [])
        if not violations:
            return "The plan has constraint violations. Please review budget and scheduling."
        return (
            f"Found {len(violations)} constraint violation(s): "
            + "; ".join(violations[:3])
            + ". Please adjust your budget or timeline to resolve these conflicts."
        )


# Singleton instance
gemini_service = GeminiService()
