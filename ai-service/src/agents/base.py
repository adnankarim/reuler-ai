"""
Agent Base Class and Orchestrator for Reuler AI
Implements the agentic AI architecture
"""

import os
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import asyncio
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

@dataclass
class AgentContext:
    """Context passed between agents"""
    question: str
    session_id: str
    course_id: Optional[str]
    retrieved_chunks: List[Dict[str, Any]] = None
    structured_answer: Dict[str, Any] = None
    sources: List[Dict[str, Any]] = None
    misconceptions: List[Dict[str, Any]] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.retrieved_chunks is None:
            self.retrieved_chunks = []
        if self.sources is None:
            self.sources = []
        if self.misconceptions is None:
            self.misconceptions = []
        if self.metadata is None:
            self.metadata = {}

class BaseAgent(ABC):
    """Base class for all agents"""
    
    def __init__(self, name: str, openai_client: AsyncOpenAI):
        self.name = name
        self.client = openai_client
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
        
    @abstractmethod
    async def process(self, context: AgentContext) -> AgentContext:
        """Process the context and return updated context"""
        pass
    
    async def _call_llm(
        self, 
        system_prompt: str, 
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """Call OpenAI API"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM call failed in {self.name}: {e}")
            raise

class AgentOrchestrator:
    """
    Orchestrates the multi-agent pipeline for answering questions
    
    Pipeline:
    1. Retrieval Agent -> finds relevant chunks
    2. Pedagogy Agent -> structures the answer
    3. Verification Agent -> validates sources and checks for hallucinations
    """
    
    def __init__(
        self,
        retrieval_agent: 'RetrievalAgent',
        pedagogy_agent: 'PedagogyAgent', 
        verification_agent: 'VerificationAgent'
    ):
        self.retrieval_agent = retrieval_agent
        self.pedagogy_agent = pedagogy_agent
        self.verification_agent = verification_agent
        
    async def process_question(
        self,
        question: str,
        session_id: str,
        course_id: Optional[str] = None,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process a question through the agent pipeline
        """
        options = options or {}
        
        # Initialize context
        context = AgentContext(
            question=question,
            session_id=session_id,
            course_id=course_id,
            metadata={"options": options}
        )
        
        logger.info(f"Processing question: {question[:100]}...")
        
        try:
            # Step 1: Retrieval
            logger.info("Step 1: Retrieval Agent")
            context = await self.retrieval_agent.process(context)
            
            # Step 2: Pedagogy (can run in parallel with some verification)
            logger.info("Step 2: Pedagogy Agent")
            context = await self.pedagogy_agent.process(context)
            
            # Step 3: Verification
            logger.info("Step 3: Verification Agent")
            context = await self.verification_agent.process(context)
            
            # Build final response
            return self._build_response(context)
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            raise
    
    def _build_response(self, context: AgentContext) -> Dict[str, Any]:
        """Build the final response from context"""
        return {
            "answer": context.structured_answer,
            "sources": context.sources,
            "misconception_warning": {
                "detected": len(context.misconceptions) > 0,
                "issues": context.misconceptions
            },
            "metadata": context.metadata
        }
