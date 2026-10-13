import pytest
from fastapi.testclient import TestClient
from ai_service.main import app
from ai_service.prompts import extract_json_from_text, build_briefing_prompt, build_marketing_prompt

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_id" in data
    assert "device" in data
    assert "license_info" in data
    assert "cuda_available" in data

def test_extract_json_markdown():
    raw = """
    Here is your structured briefing:
    ```json
    {
      "keyObservations": ["Sales increased by 15%"],
      "productsNeedingAttention": []
    }
    ```
    Hope this helps!
    """
    parsed = extract_json_from_text(raw)
    assert parsed is not None
    assert parsed["keyObservations"] == ["Sales increased by 15%"]

def test_extract_json_plain():
    raw = '{"keyObservations": ["Observation 1"], "productsNeedingAttention": []}'
    parsed = extract_json_from_text(raw)
    assert parsed is not None
    assert parsed["keyObservations"] == ["Observation 1"]

def test_extract_json_malformed():
    raw = 'This is not JSON at all.'
    parsed = extract_json_from_text(raw)
    assert parsed is None

def test_briefing_prompt_grounding():
    context = {
        "business_name": "Test Bakery",
        "brand_tone": "warm_artisan",
        "total_revenue": 150.0,
        "has_missing_costs": True,
        "low_stock_items": [{"name": "Croissant", "stock": 2}],
    }
    prompt = build_briefing_prompt(context)
    assert "GROUND ALL CLAIMS IN THE GIVEN DATA" in prompt
    assert "Test Bakery" in prompt
    assert "has_missing_costs" in prompt
    assert "observedFact" in prompt

def test_marketing_prompt_hindi_support():
    req_hi = {
        "product_name": "ताज़ा क्रोइसैन",
        "selling_price": 4.5,
        "language": "hi",
    }
    prompt_hi = build_marketing_prompt(req_hi)
    assert "Hindi" in prompt_hi
    assert "Devanagari" in prompt_hi

def test_validation_error_on_empty_briefing_request():
    response = client.post("/api/briefing", json={})
    assert response.status_code == 422 # Unprocessable Entity
