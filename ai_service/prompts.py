import json
import re
from typing import Dict, Any, Optional

def build_briefing_prompt(req_dict: Dict[str, Any]) -> str:
    """
    Builds a structured prompt for daily briefing generation.
    Strictly instructs the open-weight LLM to ground its output only in the supplied facts.
    """
    system_instruction = (
        "You are LocalBiz Copilot, a data-driven business assistant for independent bakeries and cafés.\n"
        "Your role is to analyze actual inventory, sales, and financial records and produce a structured daily briefing.\n"
        "CRITICAL GUARDRAILS:\n"
        "1. GROUND ALL CLAIMS IN THE GIVEN DATA. Do not invent sales numbers, customers, ingredients, or percentages.\n"
        "2. CLEARLY DISTINGUISH FACTS FROM SUGGESTIONS. In productsNeedingAttention, provide observedFact (exact data) and suggestedAction.\n"
        "3. IF COST DATA IS MISSING (has_missing_costs=True), explicitly list it in missingInfoAndUncertainties. Do not assume profit is 100%.\n"
        "4. Return ONLY a valid JSON object matching the requested schema. Do not write introductory or concluding prose.\n"
    )

    context_json = json.dumps(req_dict, indent=2)

    prompt = (
        f"{system_instruction}\n"
        f"--- BUSINESS DATA CONTEXT ---\n"
        f"{context_json}\n\n"
        f"--- REQUIRED OUTPUT FORMAT ---\n"
        "Respond with a single JSON object with these exact keys:\n"
        "{\n"
        '  "keyObservations": ["bullet 1 with actual numbers", "bullet 2"],\n'
        '  "productsNeedingAttention": [\n'
        "    {\n"
        '      "productId": "id",\n'
        '      "productName": "name",\n'
        '      "urgency": "high" | "medium" | "low",\n'
        '      "observedFact": "e.g., 3 units in stock, expires in 24 hours",\n'
        '      "reason": "why this is an issue",\n'
        '      "suggestedAction": "concrete action"\n'
        "    }\n"
        "  ],\n"
        '  "suggestedActions": [\n'
        "    {\n"
        '      "title": "Action title",\n'
        '      "rationale": "Grounded in sales/inventory numbers",\n'
        '      "expectedOutcome": "Outcome",\n'
        '      "riskOrConsideration": "Risk note"\n'
        "    }\n"
        "  ],\n"
        '  "marketingOpportunities": [\n'
        "    {\n"
        '      "angle": "Marketing angle",\n'
        '      "targetItem": "Product name",\n'
        '      "channel": "instagram" | "whatsapp" | "both",\n'
        '      "suggestedTiming": "e.g., 2:00 PM"\n'
        "    }\n"
        "  ],\n"
        '  "missingInfoAndUncertainties": ["List unrecorded costs or assumptions made"]\n'
        "}\n"
    )
    return prompt

def build_marketing_prompt(req_dict: Dict[str, Any]) -> str:
    """
    Builds a structured prompt for marketing copy generation in English or Hindi.
    """
    lang = req_dict.get("language", "en")
    is_hindi = lang == "hi"

    lang_instruction = (
        "Write the marketing text (headline, instagramCaption, whatsappMessage, callToAction) in natural, inviting Hindi "
        "(Devanagari script with popular café terms like बेकरी, ताज़ा, स्पेशल). Include friendly conversational warmth."
        if is_hindi else
        "Write the marketing text in high-converting, warm, professional English suited for an artisan bakery/café."
    )

    system_instruction = (
        "You are LocalBiz Copilot, an artisan marketing copywriter for independent bakeries and cafés.\n"
        f"{lang_instruction}\n"
        "CRITICAL GUARDRAILS:\n"
        "1. DO NOT invent ingredients, health benefits, organic certifications, or allergen claims unless explicitly written in product_description.\n"
        "2. If an optional_discount is provided, accurately reference it. If no discount is provided, DO NOT invent one.\n"
        "3. Return ONLY a valid JSON object matching the requested schema. No surrounding commentary.\n"
    )

    context_json = json.dumps(req_dict, indent=2)

    prompt = (
        f"{system_instruction}\n"
        f"--- PRODUCT & CAMPAIGN CONTEXT ---\n"
        f"{context_json}\n\n"
        f"--- REQUIRED OUTPUT FORMAT ---\n"
        "Respond with a single JSON object with these exact keys:\n"
        "{\n"
        '  "headline": "Short punchy hook",\n'
        '  "instagramCaption": "Engaging visual-first caption with emojis and spacing",\n'
        '  "whatsappMessage": "Friendly, direct message formatted with bolding for WhatsApp",\n'
        '  "callToAction": "Clear next step for the customer (e.g. Visit before 3 PM, Reserve via reply)",\n'
        '  "suggestedHashtags": ["#BakeryLife", "#FreshBread", "#ArtisanCafe"],\n'
        '  "strategicExplanation": "1-2 sentences explaining why this angle works based on the campaign objective"\n'
        "}\n"
    )
    return prompt

def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Extracts and parses JSON from raw LLM output, handling markdown code fences and whitespace.
    """
    if not text:
        return None

    # Try 1: Markdown json block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        clean_text = match.group(1).strip()
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            pass

    # Try 2: Finding outermost curly braces
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_candidate = text[first_brace : last_brace + 1]
        try:
            return json.loads(json_candidate)
        except json.JSONDecodeError:
            pass

    # Try 3: Direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return None
