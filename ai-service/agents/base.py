"""
Base classes and types for agents
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class AgentContext:
    """Shared context between agents"""
    question: str
    course_id: str
    retrieved_chunks: list = None
    structured_answer: dict = None
    sources: list = None
    misconceptions: list = None
    curriculum_alignment: float = 0.0
    related_concepts: list = None
    confidence: float = 0.0


class BaseAgent:
    """Base class for all agents"""
    
    async def process(self, context: 'AgentContext') -> 'AgentContext':
        """Process the context and return updated context"""
        raise NotImplementedError

