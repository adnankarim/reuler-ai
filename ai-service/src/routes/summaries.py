"""
Summaries API Routes
Handles automatic knowledge summarization
"""

import os
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import json

logger = logging.getLogger(__name__)
router = APIRouter()

class SummaryRequest(BaseModel):
    document_ids: List[str]
    topics: List[str] = []
    format: str = "exam-ready"  # exam-ready, detailed, bullet-points
    max_length: int = 2000

def get_services():
    from main import get_vector_store, get_cache_service
    return get_vector_store(), get_cache_service()

@router.post("/generate")
async def generate_summary(request: SummaryRequest):
    """Generate a structured summary from course materials"""
    
    vector_store, cache_service = get_services()
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Retrieve relevant chunks
    all_chunks = []
    
    for doc_id in request.document_ids:
        chunks = await vector_store.get_document_chunks(doc_id)
        all_chunks.extend(chunks)
    
    if not all_chunks:
        raise HTTPException(status_code=404, detail="No content found for specified documents")
    
    # If topics specified, filter/prioritize relevant chunks
    if request.topics:
        topic_query = " ".join(request.topics)
        relevant_chunks = await vector_store.query(
            query_text=topic_query,
            n_results=20
        )
        all_chunks = relevant_chunks if relevant_chunks else all_chunks
    
    # Combine content
    content = "\n\n".join([c.get("content", "") for c in all_chunks[:25]])
    
    # Format-specific prompts
    format_instructions = {
        "exam-ready": """Create an exam-ready summary with:
- Key definitions clearly stated
- Important formulas/concepts highlighted
- Common exam topics emphasized
- Brief exam tips for each section""",
        "detailed": """Create a detailed summary with:
- Comprehensive explanations
- Examples and applications
- Connections between topics
- Additional context and nuances""",
        "bullet-points": """Create a bullet-point summary with:
- Main concepts as bullet points
- Sub-points for key details
- Quick reference format
- Easy to scan structure"""
    }
    
    system_prompt = f"""You are an expert academic summarizer. 
Create a structured summary optimized for university students.

{format_instructions.get(request.format, format_instructions["exam-ready"])}

OUTPUT FORMAT (JSON):
{{
    "title": "Summary Title",
    "overview": "Brief overview paragraph",
    "sections": [
        {{
            "topic": "Topic Name",
            "keyPoints": ["Point 1", "Point 2", "Point 3"],
            "examTips": ["Tip 1", "Tip 2"],
            "importance": "high|medium|low"
        }}
    ],
    "keyTerms": [
        {{
            "term": "Term",
            "definition": "Definition"
        }}
    ]
}}"""

    user_prompt = f"""Create a {request.format} summary of this academic content:

TOPICS TO FOCUS ON: {', '.join(request.topics) if request.topics else 'All topics'}
MAX LENGTH: {request.max_length} words

CONTENT:
{content[:15000]}

Generate the structured summary:"""

    try:
        response = await openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4,
            max_tokens=3000
        )
        
        result_text = response.choices[0].message.content
        
        # Parse JSON
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        summary_data = json.loads(result_text.strip())
        
        # Generate bibliography
        bibliography = []
        seen_sources = set()
        for chunk in all_chunks[:10]:
            source = chunk.get("metadata", {}).get("source", "Unknown Source")
            if source not in seen_sources:
                seen_sources.add(source)
                citation_key = source.split()[0].lower() + str(len(bibliography) + 1)
                bibliography.append({
                    "key": citation_key,
                    "formatted": {
                        "apa": f"{source}.",
                        "bibtex": f"@misc{{{citation_key},\n  title = {{{source}}}\n}}"
                    }
                })
        
        summary_id = f"sum_{uuid.uuid4().hex[:8]}"
        
        return {
            "success": True,
            "data": {
                "summaryId": summary_id,
                "title": summary_data.get("title", "Course Summary"),
                "content": {
                    "overview": summary_data.get("overview", ""),
                    "sections": summary_data.get("sections", []),
                    "keyTerms": summary_data.get("keyTerms", [])
                },
                "bibliography": bibliography,
                "generatedAt": datetime.utcnow().isoformat(),
                "format": request.format
            }
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse summary response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate structured summary")
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quick")
async def quick_summary(document_id: str, max_sentences: int = 5):
    """Generate a quick summary of a single document"""
    
    vector_store, _ = get_services()
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    chunks = await vector_store.get_document_chunks(document_id)
    
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found")
    
    content = "\n\n".join([c.get("content", "") for c in chunks[:10]])
    
    response = await openai_client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        messages=[
            {
                "role": "system",
                "content": f"Summarize the following academic content in exactly {max_sentences} sentences. Be concise and focus on the main points."
            },
            {
                "role": "user",
                "content": content[:8000]
            }
        ],
        temperature=0.3,
        max_tokens=500
    )
    
    return {
        "success": True,
        "data": {
            "documentId": document_id,
            "summary": response.choices[0].message.content,
            "sentenceCount": max_sentences
        }
    }
