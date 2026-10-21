"""
Groq AI service for Aventra.

Replaces the Gemini integration. Uses the official Groq Python SDK with
OpenAI-compatible JSON mode for structured output.

All prompts are defined here, away from business logic.
Callers receive the same Pydantic types (EventPlanAI, etc.) regardless of
whether Groq or the deterministic template fallback is used.
"""
import json
import logging
import time
from typing import Optional, List, Dict, Any

from app.config import settings

# Re-export schema types so callers can import from one place
from app.services.gemini_service import (  # noqa: F401
    BudgetCategoryAI,
    TaskAI,
    VendorCategoryAI,
    EventPlanAI,
    ReplanChangeAI,
    ReplanResultAI,
    FALLBACK_TEMPLATES,
    _build_fallback_plan,
)

logger = logging.getLogger(__name__)

# ─── Retry / timeout constants ────────────────────────────────────────────────
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 2.0   # seconds (doubles on each retry for 429)
_REQUEST_TIMEOUT = 30.0   # seconds


class GroqService:
    """
    Groq AI integration service.

    Uses the official Groq Python SDK (openai-compatible).
    Falls back to deterministic templates when:
    - API key is not configured
    - The API call fails after retries
    - The response is not valid JSON / fails Pydantic validation

    The is_ai_generated flag is ALWAYS True for successful Groq responses
    and ALWAYS False for template fallback results.
    """

    def __init__(self):
        self._client = None
        self._available = False
        self._init_client()

    def _init_client(self):
        """Initialise Groq client if API key is set."""
        if not settings.groq_api_key or settings.groq_api_key in (
            "your_groq_api_key_here", ""
        ):
            logger.info("Groq API key not configured. Using fallback template mode.")
            return
        try:
            import groq
            self._client = groq.Groq(api_key=settings.groq_api_key)
            self._available = True
            logger.info(
                "Groq client initialised successfully. Model: %s",
                settings.groq_model,
            )
        except Exception as exc:
            logger.warning("Failed to initialise Groq client: %s", exc)

    @property
    def is_available(self) -> bool:
        return self._available

    # ─── Internal: raw Groq call with retries ─────────────────────────────────

    def _call_groq(
        self,
        messages: List[Dict[str, str]],
        *,
        label: str = "groq call",
    ) -> str:
        """
        Make a Groq chat-completion call with bounded retries and 429 handling.

        Returns the raw text content of the first choice.
        Raises on non-recoverable failures.
        """
        import groq as groq_sdk

        last_exc: Optional[Exception] = None
        delay = _RETRY_BASE_DELAY

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                response = self._client.chat.completions.create(
                    model=settings.groq_model,
                    messages=messages,  # type: ignore[arg-type]
                    response_format={"type": "json_object"},
                    temperature=0.3,
                    timeout=_REQUEST_TIMEOUT,
                )
                return response.choices[0].message.content or ""
            except groq_sdk.RateLimitError as exc:
                logger.warning(
                    "%s: Rate limit hit (attempt %d/%d). Retrying in %.1fs.",
                    label, attempt, _MAX_RETRIES, delay,
                )
                last_exc = exc
                if attempt < _MAX_RETRIES:
                    time.sleep(delay)
                    delay *= 2
            except groq_sdk.APITimeoutError as exc:
                logger.warning(
                    "%s: Timeout (attempt %d/%d).", label, attempt, _MAX_RETRIES,
                )
                last_exc = exc
                if attempt < _MAX_RETRIES:
                    time.sleep(delay)
            except groq_sdk.APIStatusError as exc:
                # 5xx → retry; 4xx (except 429) → fail immediately
                if exc.status_code >= 500 and attempt < _MAX_RETRIES:
                    logger.warning(
                        "%s: Server error %d (attempt %d/%d). Retrying.",
                        label, exc.status_code, attempt, _MAX_RETRIES,
                    )
                    last_exc = exc
                    time.sleep(delay)
                else:
                    raise
            except Exception as exc:
                raise exc

        raise last_exc  # type: ignore[misc]

    # ─── Event plan generation ─────────────────────────────────────────────────

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

        Returns AI-generated plan when Groq is available, otherwise returns a
        clearly-labelled deterministic template fallback.
        """
        if not self._available:
            return _build_fallback_plan(event_type, total_budget, guest_count, event_name)

        try:
            return self._call_groq_for_plan(
                event_type, event_name, total_budget, guest_count,
                event_date, location, description, preferences, mandatory_expenses,
            )
        except Exception as exc:
            logger.warning("Groq plan generation failed: %s. Using fallback.", exc)
            plan = _build_fallback_plan(event_type, total_budget, guest_count, event_name)
            plan.planning_notes += f" (AI call failed: {type(exc).__name__})"
            plan.is_ai_generated = False
            return plan

    def _call_groq_for_plan(
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
        """Actual Groq API call for event plan generation."""
        mandatory_str = ""
        if mandatory_expenses:
            mandatory_str = "\nMandatory expenses that must be included:\n" + \
                "\n".join([
                    f"- {e.get('name', 'Item')}: ₹{e.get('amount', 0):,.0f}"
                    for e in mandatory_expenses
                ])

        system_msg = (
            "You are an expert event planner specialising in Indian events. "
            "Respond ONLY with a single valid JSON object — no markdown, no explanation."
        )
        user_msg = f"""Generate a detailed, practical event plan for:

Event Name: {event_name}
Event Type: {event_type}
Event Date: {event_date}
Location: {location}
Number of Guests: {guest_count}
Total Budget: ₹{total_budget:,.0f} (Indian Rupees)
{f'Description: {description}' if description else ''}
{f'Special Preferences: {preferences}' if preferences else ''}
{mandatory_str}

Return a JSON object with this exact structure:
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
- Mark mandatory items with is_mandatory: true
- Mark fixed-price items with is_fixed: true
- Include 4-8 vendor categories relevant to this event type
- Use INR amounts only
- Notes should clarify that costs are illustrative estimates
- Return ONLY valid JSON"""

        raw = self._call_groq(
            [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            label="generate_event_plan",
        )

        data = json.loads(raw)
        plan = EventPlanAI(**data)
        plan.is_ai_generated = True
        return plan

    # ─── Replan request parsing ────────────────────────────────────────────────

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
        Falls back to a deterministic regex parser if Groq is unavailable.
        """
        if not self._available:
            return self._fallback_parse_replan(
                change_description, current_budget, current_date, current_guest_count
            )

        try:
            return self._call_groq_replan(
                change_description, current_budget, current_date,
                current_guest_count, event_type, event_name,
            )
        except Exception as exc:
            logger.warning("Groq replan parsing failed: %s. Using fallback.", exc)
            return self._fallback_parse_replan(
                change_description, current_budget, current_date, current_guest_count
            )

    def _call_groq_replan(
        self,
        change_description: str,
        current_budget: float,
        current_date: str,
        current_guest_count: int,
        event_type: str,
        event_name: str,
    ) -> Dict[str, Any]:
        """Groq API call to parse a replan request."""
        system_msg = (
            "You are an event planning assistant. "
            "Respond ONLY with a single valid JSON object — no markdown, no explanation."
        )
        user_msg = f"""Parse this event planning change request and extract structured changes.

Event: {event_name} ({event_type})
Current Budget: ₹{current_budget:,.0f}
Current Date: {current_date}
Current Guests: {current_guest_count}

Change Request: "{change_description}"

Return valid JSON:
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

        raw = self._call_groq(
            [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            label="parse_replan_request",
        )
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
        Extracts numbers and keywords from the description via regex.
        """
        import re
        desc_lower = change_description.lower()

        new_budget = None
        new_date = None
        new_guest_count = None
        warnings: List[str] = []

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
                    amount *= 100_000
                new_budget = amount
                break

        # Extract guest count
        guest_match = re.search(r'(\d+)\s*(?:guests?|people|persons?|attendees?)', desc_lower)
        if guest_match:
            new_guest_count = int(guest_match.group(1))

        # Extract relative date shifts
        days_earlier = re.search(r'(\d+)\s*days?\s+earlier', desc_lower)
        days_later = re.search(r'(\d+)\s*days?\s+later', desc_lower)
        if days_earlier:
            from datetime import datetime, timedelta
            try:
                dt = datetime.fromisoformat(current_date)
                new_date = (dt - timedelta(days=int(days_earlier.group(1)))).date().isoformat()
            except Exception:
                warnings.append("Could not parse date change. Please specify an exact date.")
        elif days_later:
            from datetime import datetime, timedelta
            try:
                dt = datetime.fromisoformat(current_date)
                new_date = (dt + timedelta(days=int(days_later.group(1)))).date().isoformat()
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

    # ─── Constraint-violation explanation ─────────────────────────────────────

    def explain_constraint_violation(
        self,
        violation_details: Dict[str, Any],
        event_name: str,
    ) -> str:
        """Generate a human-readable explanation of constraint violations."""
        if not self._available:
            return self._fallback_explain_violation(violation_details)

        try:
            system_msg = (
                "You are a helpful event planning assistant. "
                "Write clear, concise explanations for non-technical users."
            )
            user_msg = f"""Explain these event planning constraint violations to a non-technical user:

Event: {event_name}
Violations: {json.dumps(violation_details, indent=2)}

Write 2-3 clear, actionable sentences explaining:
1. What the problem is
2. Why it matters
3. What the user can do to fix it

Be concise and helpful. No jargon. Do NOT wrap text in JSON — just plain text."""

            # For plain-text explanations we cannot use json_object mode,
            # so we call the Groq client directly here without JSON mode.
            import groq as groq_sdk
            response = self._client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.4,
                timeout=_REQUEST_TIMEOUT,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            logger.warning("Groq explanation failed: %s", exc)
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


# Singleton instance used by all callers
groq_service = GroqService()
