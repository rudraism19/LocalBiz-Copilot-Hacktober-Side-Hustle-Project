from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

# Health & Status
class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "model_not_loaded", "error"]
    model_id: str
    model_loaded: bool
    device: str
    cuda_available: bool
    torch_version: str
    memory_allocated_mb: Optional[float] = None
    license_info: str = "Apache 2.0 (Qwen2.5) / Google Gemma Terms (Gemma 4)"
    error_message: Optional[str] = None

# Business Data Schemas for Briefing
class AttentionItem(BaseModel):
    productId: str
    productName: str
    urgency: Literal["high", "medium", "low"]
    observedFact: str
    reason: str
    suggestedAction: str

class ActionItem(BaseModel):
    title: str
    rationale: str
    expectedOutcome: str
    riskOrConsideration: Optional[str] = None

class OpportunityItem(BaseModel):
    angle: str
    targetItem: str
    channel: Literal["instagram", "whatsapp", "both"]
    suggestedTiming: Optional[str] = None

class BriefingRequest(BaseModel):
    business_name: str
    brand_tone: str
    currency: str = "USD"
    total_revenue: float
    gross_profit: Optional[float] = None
    has_missing_costs: bool = False
    total_units_sold: int = 0
    low_stock_items: List[Dict[str, Any]] = Field(default_factory=list)
    expiring_items: List[Dict[str, Any]] = Field(default_factory=list)
    products_summary: List[Dict[str, Any]] = Field(default_factory=list)
    monthly_budget: float = 100.0

class BriefingResponse(BaseModel):
    keyObservations: List[str]
    productsNeedingAttention: List[AttentionItem]
    suggestedActions: List[ActionItem]
    marketingOpportunities: List[OpportunityItem]
    missingInfoAndUncertainties: List[str]
    latency_ms: float
    model_id: str

# Marketing Generator Schemas
class MarketingRequest(BaseModel):
    product_name: str
    product_description: Optional[str] = ""
    selling_price: float
    campaign_objective: str = "boost_slow_moving"
    brand_tone: str = "warm_artisan"
    language: Literal["en", "hi"] = "en"
    preferred_platform: Literal["instagram", "whatsapp", "both"] = "both"
    optional_discount: Optional[str] = None
    target_audience: Optional[str] = None
    business_name: Optional[str] = None

class MarketingResponse(BaseModel):
    headline: str
    instagramCaption: str
    whatsappMessage: str
    callToAction: str
    suggestedHashtags: List[str]
    strategicExplanation: str
    language: str
    latency_ms: float
    model_id: str
