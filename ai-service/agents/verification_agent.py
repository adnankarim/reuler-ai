"""
Verification Agent - Adds citations and detects misconceptions
"""

import json
from typing import Dict, Any, List
from openai import AsyncOpenAI

from .base import AgentContext


class VerificationAgent:
    """
    Agent responsible for:
    1. Adding source citations to answers
    2. Detecting potential misconceptions in student questions
    3. Verifying answer accuracy against sources
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
    
    async def process(
        self,
        context: AgentContext,
        include_sources: bool = True,
        detect_misconceptions: bool = True
    ) -> AgentContext:
        """
        Verify and enhance the answer.
        
        Steps:
        1. Match answer claims to source chunks
        2. Detect misconceptions in the question
        3. Update curriculum alignment
        """
        
        if include_sources:
            context.sources = self._extract_sources(
                context.structured_answer,
                context.retrieved_chunks
            )
        
        if detect_misconceptions:
            misconceptions = await self._detect_misconceptions(
                context.question,
                context.structured_answer
            )
            context.misconceptions = misconceptions
        
        # Update curriculum alignment based on source coverage
        if context.sources:
            avg_confidence = sum(s.get("confidence", 0) for s in context.sources) / len(context.sources)
            context.curriculum_alignment = max(context.curriculum_alignment, avg_confidence)
        
        return context
    
    def _extract_sources(
        self,
        answer: Dict[str, Any],
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract and format source citations"""
        sources = []
        seen_sources = set()
        
        if not chunks:
            return sources
        
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            source_key = (
                metadata.get("document_id", ""),
                metadata.get("page", 0)
            )
            
            if source_key in seen_sources:
                continue
            seen_sources.add(source_key)
            
            score = chunk.get("score", 0.5)
            
            sources.append({
                "title": metadata.get("document_title", "Unknown Source"),
                "page": metadata.get("page"),
                "chunk_id": chunk.get("id", ""),
                "confidence": round(score, 2),
                "excerpt": self._create_excerpt(chunk.get("text", ""))
            })
        
        # Sort by confidence
        sources.sort(key=lambda x: x["confidence"], reverse=True)
        
        return sources[:5]  # Return top 5 sources
    
    def _create_excerpt(self, text: str, max_length: int = 150) -> str:
        """Create a brief excerpt from the source text"""
        if len(text) <= max_length:
            return text
        
        # Try to cut at sentence boundary
        truncated = text[:max_length]
        last_period = truncated.rfind(".")
        
        if last_period > max_length // 2:
            return truncated[:last_period + 1]
        
        return truncated.rsplit(" ", 1)[0] + "..."
    
    async def _detect_misconceptions(
        self,
        question: str,
        answer: Dict[str, Any]
    ) -> List[str]:
        """Detect potential misconceptions in the student's question"""
        
        prompt = f"""Analyze the following student question for potential misconceptions.

STUDENT'S QUESTION:
{question}

CORRECT ANSWER CONTEXT:
Definition: {answer.get('definition', '')}
Explanation: {answer.get('explanation', '')}
Common Pitfalls: {', '.join(answer.get('pitfalls', []))}

Identify if the student's question contains:
1. Incorrect assumptions about the topic
2. Confusion between related concepts
3. Common misconceptions in this field
4. Misunderstanding of terminology

Return a JSON object:
{{
    "has_misconception": true/false,
    "misconceptions": [
        {{
            "detected": "What the student seems to believe",
            "correct": "What is actually correct",
            "explanation": "Brief clarification"
        }}
    ]
}}

If no misconception is detected, return {{"has_misconception": false, "misconceptions": []}}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return []
        
        if not result.get("has_misconception"):
            return []
        
        # Format misconceptions as warnings
        warnings = []
        for m in result.get("misconceptions", []):
            warning = f"⚠️ Possible misconception: {m.get('detected', '')}. "
            warning += f"Actually: {m.get('correct', '')}. "
            warning += m.get('explanation', '')
            warnings.append(warning)
        
        return warnings
    
    async def verify_claim(
        self,
        claim: str,
        sources: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Verify a specific claim against sources"""
        
        source_texts = "\n\n".join([
            f"[{s['title']}, p.{s.get('page', 'N/A')}]: {s.get('excerpt', '')}"
            for s in sources
        ])
        
        prompt = f"""Verify the following claim against the source material.

CLAIM:
{claim}

SOURCE MATERIAL:
{source_texts}

Return a JSON object:
{{
    "verified": true/false,
    "confidence": 0.0-1.0,
    "supporting_source": "Source title if verified, null otherwise",
    "explanation": "Brief explanation of verification status"
}}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return {"verified": False, "confidence": 0.0, "explanation": "Unable to verify"}
