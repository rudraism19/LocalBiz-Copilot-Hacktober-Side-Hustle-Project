import time
import logging
from typing import Optional, Dict, Any, Tuple
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from starlette.concurrency import run_in_threadpool

from .config import config
from .prompts import extract_json_from_text

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

class ModelManager:
    _instance: Optional["ModelManager"] = None

    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.model_loaded = False
        self.error_message: Optional[str] = None
        self.device = self._determine_device()
        self.dtype = self._determine_dtype()

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = ModelManager()
        return cls._instance

    def _determine_device(self) -> str:
        if config.device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return config.device

    def _determine_dtype(self):
        if self.device == "cuda":
            return torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        # On CPU, float32 is most stable
        return torch.float32

    def load_model(self) -> bool:
        if self.model_loaded and self.model is not None:
            return True

        logger.info(f"Loading model '{config.model_id}' on device '{self.device}' with dtype '{self.dtype}'...")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                config.model_id,
                trust_remote_code=True,
            )
            if self.tokenizer.pad_token_id is None:
                self.tokenizer.pad_token_id = self.tokenizer.eos_token_id

            self.model = AutoModelForCausalLM.from_pretrained(
                config.model_id,
                torch_dtype=self.dtype,
                low_cpu_mem_usage=True,
                trust_remote_code=True,
            )
            self.model.to(self.device)
            self.model.eval()

            self.model_loaded = True
            self.error_message = None
            logger.info(f"Model '{config.model_id}' successfully loaded into memory.")
            return True
        except Exception as e:
            logger.error(f"Failed to load model '{config.model_id}': {e}", exc_info=True)
            self.model_loaded = False
            self.error_message = str(e)
            return False

    def unload_model(self):
        if self.model is not None:
            del self.model
            self.model = None
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        self.model_loaded = False
        logger.info("Model unloaded from memory.")

    def _generate_sync(self, prompt: str, max_new_tokens: int = 512) -> Tuple[str, float]:
        if not self.model_loaded or self.model is None or self.tokenizer is None:
            raise RuntimeError(
                f"Model is not loaded. Current error status: {self.error_message or 'Model not initialized'}"
            )

        start_time = time.perf_counter()

        # Format input using chat template if available, else raw prompt
        if hasattr(self.tokenizer, "apply_chat_template") and self.tokenizer.chat_template:
            messages = [{"role": "user", "content": prompt}]
            formatted_prompt = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
        else:
            formatted_prompt = prompt

        inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.device)
        input_len = inputs.input_ids.shape[1]

        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=config.temperature if config.temperature > 0 else None,
                do_sample=config.temperature > 0,
                pad_token_id=self.tokenizer.pad_token_id,
            )

        # Slice off input tokens to keep only generated content
        gen_tokens = outputs[0][input_len:]
        decoded_text = self.tokenizer.decode(gen_tokens, skip_special_tokens=True)
        latency_ms = (time.perf_counter() - start_time) * 1000

        return decoded_text, latency_ms

    async def generate(self, prompt: str, max_new_tokens: Optional[int] = None) -> Tuple[str, float]:
        tokens = max_new_tokens or config.max_new_tokens
        return await run_in_threadpool(self._generate_sync, prompt, tokens)

    def get_status(self) -> Dict[str, Any]:
        mem_mb = None
        if self.device == "cuda" and torch.cuda.is_available():
            mem_mb = torch.cuda.memory_allocated() / (1024 * 1024)

        return {
            "status": "healthy" if self.model_loaded else ("error" if self.error_message else "model_not_loaded"),
            "model_id": config.model_id,
            "model_loaded": self.model_loaded,
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
            "torch_version": torch.__version__,
            "memory_allocated_mb": mem_mb,
            "error_message": self.error_message,
        }
