import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class ServiceConfig(BaseModel):
    # Primary default model: Qwen/Qwen2.5-0.5B-Instruct (Apache 2.0, open-weight, ungated, cached locally)
    # Alternative tested: Qwen/Qwen2.5-1.5B-Instruct (Apache 2.0), google/gemma-4-E4B-it (Google Gemma Terms)
    model_id: str = os.getenv("AI_MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
    device: str = os.getenv("AI_DEVICE", "auto")
    torch_dtype: str = os.getenv("AI_TORCH_DTYPE", "auto")
    max_new_tokens: int = int(os.getenv("AI_MAX_NEW_TOKENS", "512"))
    temperature: float = float(os.getenv("AI_TEMPERATURE", "0.3"))
    api_key: str = os.getenv("AI_SERVICE_API_KEY", "")
    host: str = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    load_on_startup: bool = os.getenv("AI_LOAD_ON_STARTUP", "true").lower() == "true"

config = ServiceConfig()
