"""
App Settings
============

Shared runtime objects for the platform.
"""

from agno.models.openai import OpenAIResponses


def default_model() -> OpenAIResponses:
    """Fresh model instance per agent; keep Agno session history explicit."""
    return OpenAIResponses(id="gpt-5.4", store=False)
