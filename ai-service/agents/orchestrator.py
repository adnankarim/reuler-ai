"""
Agent Orchestrator - Coordinates multi-agent pipeline for question answering
"""

import asyncio
from typing import Dict, Any, Optional

from .base import AgentContext, BaseAgent
from .retrieval_agent import RetrievalAgent
from .pedagogy_agent import PedagogyAgent
from .verification_agent import VerificationAgent


class AgentOrchestrator:
    """
    Orchestrates the multi-agent pipeline:
    1. Retrieval Agent - Find relevant content
    2. Pedagogy Agent - Structure the answer
    3. Verification Agent - Add sources and detect misconceptions
    """
    
    def __init__(
        self,
        retrieval_agent: RetrievalAgent,
        pedagogy_agent: PedagogyAgent,
        verification_agent: VerificationAgent
    ):
        self.retrieval_agent = retrieval_agent
        self.pedagogy_agent = pedagogy_agent
        self.verification_agent = verification_agent
    
    async def process_question(
        self,
        question: str,
        course_id: str,
        include_sources: bool = True,
        detect_misconceptions: bool = True
    ) -> Dict[str, Any]:
        """
        Process a question through the agentic pipeline.
        
        Flow:
        1. Retrieval: Find relevant chunks from vector store
        2. Pedagogy: Generate structured answer
        3. Verification: Add citations and check for misconceptions
        """
        
        # Initialize context
        context = AgentContext(
            question=question,
            course_id=course_id
        )
        
        # Step 1: Retrieval Agent
        context = await self.retrieval_agent.process(context)
        
        # Step 2: Pedagogy Agent
        context = await self.pedagogy_agent.process(context)
        
        # Step 3: Verification Agent
        if include_sources or detect_misconceptions:
            context = await self.verification_agent.process(
                context,
                include_sources=include_sources,
                detect_misconceptions=detect_misconceptions
            )
        
        # Format final response
        return self._format_response(context)
    
    def _format_response(self, context: AgentContext) -> Dict[str, Any]:
        """Format the final response from agent context"""
        
        # Handle case where structured_answer might not have all fields
        answer = context.structured_answer or {}
        
        # Only include sources if we have retrieved chunks from course documents
        # If no course documents were found, sources should be empty (using general knowledge)
        sources = []
        if context.retrieved_chunks and len(context.retrieved_chunks) > 0:
            sources = context.sources or []
        
        # Adjust confidence based on whether we have course material
        confidence = context.confidence
        if not context.retrieved_chunks or len(context.retrieved_chunks) == 0:
            # Lower confidence when using general knowledge only
            confidence = min(confidence * 0.8, 0.85)
        
        return {
            "answer": {
                "definition": answer.get("definition", ""),
                "explanation": answer.get("explanation", ""),
                "example": answer.get("example", ""),
                "pitfalls": answer.get("pitfalls", [])
            },
            "sources": sources,  # Only course document sources
            "curriculum_alignment": context.curriculum_alignment,
            "misconception_warning": context.misconceptions[0] if context.misconceptions else None,
            "related_concepts": context.related_concepts or [],
            "confidence": confidence,
            "has_course_material": len(context.retrieved_chunks) > 0 if context.retrieved_chunks else False
        }


