import json
from loguru import logger
from pydantic_ai import Agent
from ..agents.models import DashboardInsightsResponse, AgentDeps
from ..agents.utils import get_model

async def generate_dashboard_insights(stats: dict) -> list:
    """
    Uses LLM to generate dynamic insights based on incident statistics.
    """
    try:
        model = get_model()
        agent = Agent(
            model,
            output_type=DashboardInsightsResponse,
            system_prompt=(
                "You are an expert IT Operations Analyst. Analyze the provided incident statistics "
                "and generate 3-5 actionable insights for the admin dashboard. "
                "Insights should be categorized as 'warning', 'alert', 'info', or 'success'. "
                "Focus on anomalies, trends, AI vs Human performance, and critical spikes. "
                "Keep titles short and messages concise. Suggest a clear 'action' for each insight."
            )
        )

        pruned_stats = {k: v for k, v in stats.items() if k != "heatmap"} 
        
        prompt = f"Analyze these stats: {json.dumps(pruned_stats, indent=2)}"
        
        result = await agent.run(prompt)
        return [insight.dict() for insight in result.output.insights]

    except Exception as e:
        logger.error(f"Error generating LLM insights: {e}")
        return []
