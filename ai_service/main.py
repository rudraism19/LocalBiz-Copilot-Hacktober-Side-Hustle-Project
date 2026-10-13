from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware

from .config import config
from .models import (
    HealthResponse,
    BriefingRequest,
    BriefingResponse,
    MarketingRequest,
    MarketingResponse,
)
from .inference import ModelManager
from .prompts import (
    build_briefing_prompt,
    build_marketing_prompt,
    extract_json_from_text,
)

logger = logging.getLogger("ai_service")

# Authentication via optional API Key
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if config.api_key:
        if not api_key or api_key != config.api_key:
            raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")
    return api_key

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lifecycle startup
    manager = ModelManager.get_instance()
    logger.info(f"AI Service starting. Target model: {config.model_id} on {manager.device}")
    if config.load_on_startup:
        logger.info("Pre-loading model weights on service startup...")
        manager.load_model()
    yield
    # Lifecycle shutdown
    logger.info("AI Service shutting down...")
    manager.unload_model()

app = FastAPI(
    title="LocalBiz Copilot — Local Transformers Inference Service",
    description="Production-grade local open-weight model serving microservice for bakeries and small businesses",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    manager = ModelManager.get_instance()
    status = manager.get_status()
    license_info = (
        "Apache 2.0 (Permissive Commercial)"
        if "qwen" in config.model_id.lower()
        else "Google Gemma Terms of Use"
    )
    return HealthResponse(
        status=status["status"],
        model_id=status["model_id"],
        model_loaded=status["model_loaded"],
        device=status["device"],
        cuda_available=status["cuda_available"],
        torch_version=status["torch_version"],
        memory_allocated_mb=status["memory_allocated_mb"],
        license_info=license_info,
        error_message=status["error_message"],
    )

@app.post("/api/load")
async def trigger_load_model(payload: Optional[dict] = None, _: str = Depends(verify_api_key)):
    manager = ModelManager.get_instance()
    if payload and "model_id" in payload and payload["model_id"]:
        new_model_id = payload["model_id"]
        if new_model_id != config.model_id:
            logger.info(f"Switching active model to '{new_model_id}'...")
            manager.unload_model()
            config.model_id = new_model_id

    success = manager.load_model()
    if not success:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to load model '{config.model_id}': {manager.error_message}",
        )
    return {
        "message": f"Model '{config.model_id}' successfully loaded on {manager.device}.",
        "model_id": config.model_id,
        "device": manager.device,
        "model_loaded": True,
    }

@app.post("/api/briefing", response_model=BriefingResponse)
async def generate_briefing(request: BriefingRequest, _: str = Depends(verify_api_key)):
    manager = ModelManager.get_instance()
    if not manager.model_loaded:
        loaded = manager.load_model()
        if not loaded:
            raise HTTPException(
                status_code=503,
                detail=f"Inference model is not loaded. Error: {manager.error_message or 'Model download/load failed.'}",
            )

    prompt = build_briefing_prompt(request.model_dump())

    try:
        raw_text, latency_ms = await manager.generate(prompt, max_new_tokens=config.max_new_tokens)
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    parsed_json = extract_json_from_text(raw_text)
    if not parsed_json:
        logger.warning(f"Malformed LLM output. Raw: {raw_text[:300]}")
        raise HTTPException(
            status_code=502,
            detail=f"Model output could not be parsed as valid JSON: {raw_text[:200]}...",
        )

    return BriefingResponse(
        keyObservations=parsed_json.get("keyObservations", ["Observations computed from inventory records."]),
        productsNeedingAttention=parsed_json.get("productsNeedingAttention", []),
        suggestedActions=parsed_json.get("suggestedActions", []),
        marketingOpportunities=parsed_json.get("marketingOpportunities", []),
        missingInfoAndUncertainties=parsed_json.get("missingInfoAndUncertainties", []),
        latency_ms=round(latency_ms, 1),
        model_id=config.model_id,
    )

@app.post("/api/marketing", response_model=MarketingResponse)
async def generate_marketing(request: MarketingRequest, _: str = Depends(verify_api_key)):
    manager = ModelManager.get_instance()
    if not manager.model_loaded:
        loaded = manager.load_model()
        if not loaded:
            raise HTTPException(
                status_code=503,
                detail=f"Inference model is not loaded. Error: {manager.error_message or 'Model download/load failed.'}",
            )

    prompt = build_marketing_prompt(request.model_dump())

    try:
        raw_text, latency_ms = await manager.generate(prompt, max_new_tokens=config.max_new_tokens)
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    parsed_json = extract_json_from_text(raw_text)
    if not parsed_json:
        logger.warning(f"Malformed LLM output. Raw: {raw_text[:300]}")
        raise HTTPException(
            status_code=502,
            detail=f"Model output could not be parsed as valid JSON: {raw_text[:200]}...",
        )

    return MarketingResponse(
        headline=parsed_json.get("headline", f"Fresh from {request.product_name}"),
        instagramCaption=parsed_json.get("instagramCaption", f"Enjoy our fresh {request.product_name}!"),
        whatsappMessage=parsed_json.get("whatsappMessage", f"*Special Announcement*: {request.product_name}"),
        callToAction=parsed_json.get("callToAction", "Order now or visit today!"),
        suggestedHashtags=parsed_json.get("suggestedHashtags", ["#Bakery", "#FreshBakes"]),
        strategicExplanation=parsed_json.get("strategicExplanation", "Promotional angle aligned with customer preferences."),
        language=request.language,
        latency_ms=round(latency_ms, 1),
        model_id=config.model_id,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service.main:app", host=config.host, port=config.port, reload=True)
