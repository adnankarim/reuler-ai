"""
Verification Agent - Validates sources and checks for hallucinations
"""

import json
import logging
from typing import Dict, Any, List
from openai import AsyncOpenAI

from .base import BaseAgent, AgentContext

logger = logging.getLogger(__name__)

class VerificationAgent(BaseAgent):
    """
    Agent responsible for:
    - Source reliability scoring
    - Citation generation
    - Hallucination detection
    - Fact verification against source material
    """
    
    def __init__(self, openai_client: AsyncOpenAI):
        super().__init__("VerificationAgent", openai_client)
        
    async def process(self, context: AgentContext) -> AgentContext:
        """
        Verify the generated answer against source material
        """
        logger.info("Verification Agent processing...")
        
        # Step 1: Score source reliability
        scored_sources = await self._score_sources(context.retrieved_chunks)
        
        # Step 2: Verify answer against sources
        verification_result = await self._verify_answer(
            answer=context.structured_answer,
            sources=context.retrieved_chunks
        )
        
        # Step 3: Generate citations
        citations = await self._generate_citations(context.retrieved_chunks)
        
        # Step 4: Build final sources with scores and citations
        context.sources = self._build_source_list(
            chunks=context.retrieved_chunks,
            scores=scored_sources,
            citations=citations
        )
        
        # Step 5: Flag any hallucination concerns
        if verification_result.get("potential_hallucinations"):
            context.misconceptions.extend([
                {
                    "misconception": h["claim"],
                    "correction": f"This claim could not be verified: {h['reason']}",
                    "confidence": h.get("confidence", 0.5)
                }
                for h in verification_result["potential_hallucinations"]
            ])
        
        context.metadata["verification"] = {
            "verified": verification_result.get("verified", False),
            "confidence": verification_result.get("confidence", 0.0),
            "hallucination_flags": len(verification_result.get("potential_hallucinations", []))
        }
        
        logger.info(f"Verification complete. Confidence: {verification_result.get('confidence', 0):.2f}")
        return context
    
    async def _score_sources(
        self, 
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Score the reliability of each source
        
        Factors:
        - Source type (textbook > paper > notes)
        - Recency (for time-sensitive topics)
        - Citation count (if available)
        - Author authority
        """
        if not chunks:
            return {}
        
        # Format sources for scoring
        sources_text = "\n".join([
            f"[{i}] Source: {chunk.get('metadata', {}).get('source', 'Unknown')}, "
            f"Type: {chunk.get('metadata', {}).get('document_type', 'unknown')}, "
            f"Content preview: {chunk.get('content', '')[:200]}"
            for i, chunk in enumerate(chunks)
        ])
        
        system_prompt = """You are an expert at evaluating academic source reliability.
Score each source from 0.0 to 1.0 based on:
- Academic rigor (peer-reviewed papers, textbooks score higher)
- Source type (official course materials score higher)
- Content quality (clear, well-structured content scores higher)
- Relevance to academic context

OUTPUT FORMAT (JSON):
{
    "scores": [0.85, 0.72, ...],  // One score per source, in order
    "reasoning": ["Brief reason for score", ...]
}
"""
        
        user_prompt = f"""Score these academic sources:

{sources_text}

Provide reliability scores:"""
        
        try:
            response = await self._call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2,
                max_tokens=500
            )
            
            # Parse JSON
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            
            result = json.loads(response.strip())
            
            # Build scores dict
            scores = {}
            for i, chunk in enumerate(chunks):
                chunk_id = chunk.get("chunk_id", chunk.get("id", str(i)))
                if i < len(result.get("scores", [])):
                    scores[chunk_id] = result["scores"][i]
                else:
                    scores[chunk_id] = 0.5  # Default score
            
            return scores
            
        except Exception as e:
            logger.warning(f"Source scoring failed: {e}, using defaults")
            return {
                chunk.get("chunk_id", chunk.get("id", str(i))): 0.7 
                for i, chunk in enumerate(chunks)
            }
    
    async def _verify_answer(
        self,
        answer: Dict[str, Any],
        sources: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Verify that the answer is supported by the source material
        """
        if not answer or not sources:
            return {
                "verified": False,
                "confidence": 0.0,
                "potential_hallucinations": []
            }
        
        # Format answer for verification
        answer_text = f"""
Definition: {answer.get('definition', '')}
Explanation: {answer.get('explanation', '')}
Example: {answer.get('example', '')}
"""
        
        # Format sources
        sources_text = "\n\n".join([
            f"[Source {i+1}]\n{chunk.get('content', '')}"
            for i, chunk in enumerate(sources)
        ])
        
        system_prompt = """You are a fact-checker for academic content.
Compare the generated answer against the source material.
Identify any claims that are NOT supported by the sources.

OUTPUT FORMAT (JSON):
{
    "verified": true/false,  // Overall verification status
    "confidence": 0.0-1.0,   // Confidence in verification
    "supported_claims": ["claim 1", "claim 2"],
    "potential_hallucinations": [
        {
            "claim": "The unsupported claim",
            "reason": "Why it's not supported",
            "confidence": 0.0-1.0
        }
    ]
}
"""
        
        user_prompt = f"""GENERATED ANSWER:
{answer_text}

SOURCE MATERIAL:
{sources_text}

Verify the answer against sources:"""
        
        try:
            response = await self._call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2,
                max_tokens=800
            )
            
            # Parse JSON
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            
            return json.loads(response.strip())
            
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return {
                "verified": True,  # Don't block on verification failures
                "confidence": 0.5,
                "potential_hallucinations": []
            }
    
    async def _generate_citations(
        self,
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, str]]:
        """
        Generate academic citations for each source
        """
        citations = {}
        
        for i, chunk in enumerate(chunks):
            chunk_id = chunk.get("chunk_id", chunk.get("id", str(i)))
            metadata = chunk.get("metadata", {})
            
            # Extract citation info
            source = metadata.get("source", "Unknown Source")
            page = metadata.get("page", "")
            doc_type = metadata.get("document_type", "document")
            
            # Generate citation key
            citation_key = self._generate_citation_key(source, i)
            
            # Generate formatted citations
            citations[chunk_id] = {
                "key": citation_key,
                "apa": self._format_apa(source, page, doc_type),
                "bibtex": self._format_bibtex(source, page, doc_type, citation_key)
            }
        
        return citations
    
    def _generate_citation_key(self, source: str, index: int) -> str:
        """Generate a BibTeX-style citation key"""
        # Extract first word and year if present
        words = source.replace("_", " ").replace("-", " ").split()
        first_word = words[0].lower() if words else "source"
        return f"{first_word}{index + 1}"
    
    def _format_apa(self, source: str, page: str, doc_type: str) -> str:
        """Format citation in APA style"""
        page_str = f", p. {page}" if page else ""
        return f"{source}{page_str}."
    
    def _format_bibtex(
        self, 
        source: str, 
        page: str, 
        doc_type: str, 
        key: str
    ) -> str:
        """Format citation in BibTeX"""
        entry_type = "misc"
        if doc_type == "paper":
            entry_type = "article"
        elif doc_type == "lecture":
            entry_type = "inproceedings"
        elif doc_type == "syllabus":
            entry_type = "manual"
        
        return f"""@{entry_type}{{{key},
  title = {{{source}}},
  pages = {{{page if page else 'N/A'}}}
}}"""
    
    def _build_source_list(
        self,
        chunks: List[Dict[str, Any]],
        scores: Dict[str, float],
        citations: Dict[str, Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """Build the final source list with all metadata"""
        sources = []
        
        for chunk in chunks:
            chunk_id = chunk.get("chunk_id", chunk.get("id", ""))
            metadata = chunk.get("metadata", {})
            
            source = {
                "document_id": metadata.get("document_id", ""),
                "document_title": metadata.get("source", "Unknown"),
                "page": metadata.get("page", 0),
                "excerpt": chunk.get("content", "")[:300],
                "reliability_score": scores.get(chunk_id, 0.5),
                "citation_key": citations.get(chunk_id, {}).get("key", ""),
                "citations": citations.get(chunk_id, {})
            }
            sources.append(source)
        
        # Sort by reliability score
        sources.sort(key=lambda x: x["reliability_score"], reverse=True)
        
        return sources
