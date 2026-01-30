import json
import logging
from typing import Dict, Any, Union
from pydantic import BaseModel

logger = logging.getLogger(__name__)

def parse_agent_output(output: Any, response_model: type[BaseModel]) -> BaseModel:
    
    def clean_json(text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    if isinstance(output, response_model):
        return output
    
    if isinstance(output, str):
        try:
            data = json.loads(clean_json(output))
            return response_model(**data)
        except (json.JSONDecodeError, TypeError):
            if response_model.__name__ == 'SupportResponse':
                return response_model(response=output, next_step='chat')
            print("ERROR: Failed to parse string as JSON for model")
    
    raise ValueError(f"Could not parse output of type {type(output)} into {response_model}")

def get_model():
    """Get the LLM model based on database settings."""
    from ..core.database import SystemSetting, SessionLocal
    from pydantic_ai.models.openai import OpenAIModel
    from pydantic_ai.models.gemini import GeminiModel
    import os
    
    def get_setting_value(key: str, default: str = "") -> str:
        """Get setting value from database with fallback to environment variable."""
        try:
            db = SessionLocal()
            try:
                setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
                if setting and setting.value:
                    return setting.value
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Database connection failed while fetching {key}: {e}. Falling back to environment variables.")
        
        env_map = {
            "llm_provider": "LLM_PROVIDER",
            "google_api_key": "GEMINI_API_KEY",
            "openai_api_key": "OPENAI_API_KEY",
            "model_name": "MODEL_NAME"
        }
        env_key = env_map.get(key, key.upper())
        return os.getenv(env_key, default)

    provider = get_setting_value("llm_provider", "gemini").lower()
    
    if provider == "gemini" or provider == "google":
        model_name = get_setting_value("google_model", get_setting_value("model_name", "gemini-1.5-flash"))
        api_key = get_setting_value("google_api_key", "")
        if api_key:
            os.environ["GEMINI_API_KEY"] = api_key
        clean_model_name = model_name.replace("models/", "")
        return GeminiModel(clean_model_name)
    else: 
        model_name = get_setting_value("openai_model", get_setting_value("model_name", "gpt-4.1"))
        api_key = get_setting_value("openai_api_key", "")
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
        return OpenAIModel(model_name)
