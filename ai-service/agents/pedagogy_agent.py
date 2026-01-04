"""
Pedagogy Agent - Generates structured, educational answers
"""

import json
from typing import Dict, Any
from openai import AsyncOpenAI

from .base import AgentContext


class PedagogyAgent:
    """
    Agent responsible for generating pedagogically structured answers.
    Enforces the structure: Definition → Explanation → Example → Pitfalls
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
    
    async def process(self, context: AgentContext) -> AgentContext:
        """
        Generate a structured answer based on retrieved content.
        
        Structure:
        1. Definition - What is it?
        2. Explanation - How does it work?
        3. Example - Real-world application
        4. Pitfalls - Common mistakes to avoid
        """
        
        # Prepare context from retrieved chunks
        retrieved_context = self._prepare_context(context.retrieved_chunks)
        
        prompt = self._build_prompt(context.question, retrieved_context)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": self._get_system_prompt()
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,
            response_format={"type": "json_object"}
        )
        
        try:
            answer = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            # Fallback to unstructured answer
            answer = {
                "definition": response.choices[0].message.content,
                "explanation": "",
                "example": "",
                "pitfalls": []
            }
        
        context.structured_answer = answer
        
        # Calculate confidence based on context coverage
        context.confidence = self._calculate_confidence(answer, context.retrieved_chunks)
        
        return context
    
    def _get_system_prompt(self) -> str:
        """System prompt for pedagogical structure"""
        return """You are an expert educational tutor specializing in clear, structured explanations.

Your role is to provide comprehensive answers that help students truly understand concepts, not just memorize them.

IMPORTANT RULES:
1. PRIORITIZE the provided course material - use it as the primary source
2. If course material is insufficient, supplement with your general knowledge but clearly indicate this
3. Use precise academic language but explain complex terms
4. Always follow the structured format exactly
5. Examples should be concrete and relatable
6. Pitfalls should be actionable warnings
7. When using general knowledge (not from course material), mention it in the explanation

Your answers help students:
- Build deep understanding
- Connect concepts to prior knowledge
- Avoid common mistakes
- Prepare for exams"""

    def _build_prompt(self, question: str, context: str) -> str:
        """Build the prompt for answer generation"""
        has_course_material = context and context != "No relevant course material found."
        
        if has_course_material:
            return f"""Answer the student's question using the course material provided below. Prioritize information from the course material, but you may supplement with your general knowledge if needed.

COURSE MATERIAL:
{context}

STUDENT'S QUESTION:
{question}

Provide a structured answer in JSON format:
{{
    "definition": "A clear, concise definition based primarily on course material. 2-3 sentences.",
    "explanation": "A detailed explanation using course material when available. If course material is insufficient, supplement with general knowledge but note this. 4-6 sentences.",
    "example": "A concrete example from course material if available, otherwise a relevant general example.",
    "pitfalls": [
        "Common mistake or misconception #1",
        "Common mistake or misconception #2",
        "Common mistake or misconception #3"
    ]
}}

IMPORTANT:
- Use course material as the PRIMARY source
- If course material lacks information, use your general knowledge but mention it in the explanation
- Always provide a complete, helpful answer even if course material is limited

Return ONLY valid JSON."""
        else:
            return f"""Answer the student's question. No course-specific material was found, so use your general knowledge to provide a comprehensive answer.

STUDENT'S QUESTION:
{question}

Provide a structured answer in JSON format:
{{
    "definition": "A clear, concise definition. 2-3 sentences.",
    "explanation": "A detailed explanation. Note that this answer is based on general knowledge since no course material was found. 4-6 sentences.",
    "example": "A concrete, practical example that illustrates the concept.",
    "pitfalls": [
        "Common mistake or misconception #1",
        "Common mistake or misconception #2",
        "Common mistake or misconception #3"
    ]
}}

Note in the explanation that this answer is based on general knowledge, not course-specific material.

Return ONLY valid JSON."""

    def _prepare_context(self, chunks: list) -> str:
        """Prepare context string from retrieved chunks"""
        if not chunks:
            return "No relevant course material found."
        
        context_parts = []
        for i, chunk in enumerate(chunks):
            source = chunk.get("metadata", {}).get("source", f"Source {i+1}")
            text = chunk.get("text", "")
            context_parts.append(f"[{source}]\n{text}")
        
        return "\n\n---\n\n".join(context_parts)
    
    def _calculate_confidence(self, answer: Dict, chunks: list) -> float:
        """Calculate confidence score based on answer quality and sources"""
        confidence = 0.5  # Base confidence
        
        # Boost for having retrieved chunks
        if chunks:
            confidence += 0.2 * min(len(chunks) / 5, 1.0)
        
        # Boost for complete answer structure
        if answer.get("definition"):
            confidence += 0.1
        if answer.get("explanation"):
            confidence += 0.1
        if answer.get("example"):
            confidence += 0.05
        if answer.get("pitfalls"):
            confidence += 0.05
        
        return min(confidence, 1.0)
