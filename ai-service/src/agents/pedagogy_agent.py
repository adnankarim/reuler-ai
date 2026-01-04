"""
Pedagogy Agent - Structures answers for optimal learning
"""

import json
import logging
from typing import Dict, Any, Optional
from openai import AsyncOpenAI

from .base import BaseAgent, AgentContext

logger = logging.getLogger(__name__)

PEDAGOGY_SYSTEM_PROMPT = """You are an expert academic tutor specializing in structured, pedagogical explanations.
Your role is to transform retrieved academic content into clear, educational responses.

IMPORTANT RULES:
1. Always structure your response with: Definition, Explanation, Example, Pitfalls
2. Use ONLY information from the provided context - never make up facts
3. If the context doesn't contain enough information, say so clearly
4. Align your explanation with the course curriculum when relevant
5. Use clear, precise academic language appropriate for university students
6. Include concrete examples from the source material when available
7. Highlight common misconceptions and how to avoid them

OUTPUT FORMAT (JSON):
{
    "definition": "Clear, concise definition of the concept",
    "explanation": "Detailed explanation with context and reasoning",
    "example": "Concrete example illustrating the concept",
    "pitfalls": [
        {
            "misconception": "Common wrong assumption",
            "correction": "The correct understanding",
            "confidence": 0.0-1.0
        }
    ],
    "curriculum_alignment": {
        "topic": "Related course topic",
        "relevance": 0.0-1.0
    },
    "insufficient_context": false,
    "context_gaps": []
}
"""

class PedagogyAgent(BaseAgent):
    """
    Agent responsible for:
    - Structuring answers pedagogically
    - Aligning with curriculum
    - Detecting and addressing misconceptions
    - Ensuring educational quality
    """
    
    def __init__(self, openai_client: AsyncOpenAI):
        super().__init__("PedagogyAgent", openai_client)
        
    async def process(self, context: AgentContext) -> AgentContext:
        """
        Generate a structured, pedagogical answer
        """
        logger.info(f"Pedagogy Agent processing...")
        
        # Build context from retrieved chunks
        chunks_context = self._format_chunks(context.retrieved_chunks)
        
        # Get detail level from options
        detail_level = context.metadata.get("options", {}).get("detail_level", "detailed")
        
        # Generate structured answer
        structured_answer = await self._generate_structured_answer(
            question=context.question,
            chunks_context=chunks_context,
            course_id=context.course_id,
            detail_level=detail_level
        )
        
        context.structured_answer = structured_answer
        
        # Extract misconceptions for verification agent
        if structured_answer.get("pitfalls"):
            context.misconceptions = structured_answer["pitfalls"]
        
        context.metadata["pedagogy"] = {
            "detail_level": detail_level,
            "has_insufficient_context": structured_answer.get("insufficient_context", False),
            "context_gaps": structured_answer.get("context_gaps", [])
        }
        
        logger.info("Pedagogy Agent completed")
        return context
    
    def _format_chunks(self, chunks: list) -> str:
        """Format retrieved chunks for the prompt"""
        if not chunks:
            return "No relevant context found."
        
        formatted = []
        for i, chunk in enumerate(chunks):
            content = chunk.get("content", "")
            source = chunk.get("metadata", {}).get("source", "Unknown")
            page = chunk.get("metadata", {}).get("page", "?")
            
            formatted.append(f"""
[Source {i+1}] {source} (Page {page})
{content}
---""")
        
        return "\n".join(formatted)
    
    async def _generate_structured_answer(
        self,
        question: str,
        chunks_context: str,
        course_id: Optional[str],
        detail_level: str
    ) -> Dict[str, Any]:
        """
        Generate a structured answer using the retrieved context
        """
        detail_instructions = {
            "concise": "Keep explanations brief and to the point. Target 2-3 sentences per section.",
            "detailed": "Provide thorough explanations with full context. Target 4-6 sentences per section.",
            "expert": "Provide deep, expert-level explanations with nuances and edge cases. Include advanced considerations."
        }
        
        user_prompt = f"""STUDENT QUESTION: {question}

COURSE ID: {course_id or "Not specified"}

DETAIL LEVEL: {detail_level}
{detail_instructions.get(detail_level, detail_instructions["detailed"])}

RETRIEVED CONTEXT:
{chunks_context}

Based on the above context, provide a structured educational response.
If the context is insufficient to answer fully, indicate what's missing.
Return your response as valid JSON matching the specified format."""
        
        try:
            response = await self._call_llm(
                system_prompt=PEDAGOGY_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.4,
                max_tokens=2000
            )
            
            # Parse JSON response
            # Clean up response if needed
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            
            structured = json.loads(response.strip())
            return structured
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse pedagogy response as JSON: {e}")
            # Return a fallback structure
            return {
                "definition": "Unable to generate structured response",
                "explanation": response if 'response' in locals() else "Processing error",
                "example": "",
                "pitfalls": [],
                "curriculum_alignment": None,
                "insufficient_context": True,
                "context_gaps": ["JSON parsing error"]
            }
        except Exception as e:
            logger.error(f"Pedagogy agent failed: {e}")
            raise
    
    async def detect_student_misconceptions(
        self,
        question: str,
        chat_history: list = None
    ) -> Dict[str, Any]:
        """
        Analyze the student's question for potential misconceptions
        """
        chat_history = chat_history or []
        
        history_context = ""
        if chat_history:
            history_context = "\n".join([
                f"{'Student' if msg['role'] == 'user' else 'Tutor'}: {msg['content'][:200]}"
                for msg in chat_history[-5:]  # Last 5 messages
            ])
        
        system_prompt = """You are an expert at detecting student misconceptions.
Analyze the student's question (and chat history if available) to identify any incorrect assumptions or misunderstandings.

OUTPUT FORMAT (JSON):
{
    "detected": true/false,
    "misconceptions": [
        {
            "assumption": "What the student seems to believe",
            "issue": "Why this is incorrect or incomplete",
            "clarification": "The correct understanding"
        }
    ],
    "confidence": 0.0-1.0
}
"""
        
        user_prompt = f"""STUDENT QUESTION: {question}

CHAT HISTORY:
{history_context if history_context else "No previous messages"}

Analyze for misconceptions:"""
        
        try:
            response = await self._call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
                max_tokens=500
            )
            
            # Parse JSON
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            
            return json.loads(response.strip())
            
        except Exception as e:
            logger.error(f"Misconception detection failed: {e}")
            return {"detected": False, "misconceptions": [], "confidence": 0.0}
