"""
Chat API Routes
Handles question-answering with agentic RAG
"""

import os
import uuid
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI
import json
import asyncio

from src.models.schemas import ChatRequest, ChatOptions, DetailLevel
from src.agents.base import AgentOrchestrator
from src.agents.retrieval_agent import RetrievalAgent
from src.agents.pedagogy_agent import PedagogyAgent
from src.agents.verification_agent import VerificationAgent

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory chat history storage
chat_history_db = {}

class AskRequest(BaseModel):
    question: str
    session_id: str
    course_id: Optional[str] = None
    options: Optional[dict] = None

class AskResponse(BaseModel):
    success: bool
    data: dict

def get_services():
    from main import get_vector_store, get_cache_service
    return get_vector_store(), get_cache_service()

def get_orchestrator():
    """Create and return the agent orchestrator"""
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    vector_store, cache_service = get_services()
    
    retrieval_agent = RetrievalAgent(openai_client, vector_store)
    pedagogy_agent = PedagogyAgent(openai_client)
    verification_agent = VerificationAgent(openai_client)
    
    return AgentOrchestrator(
        retrieval_agent=retrieval_agent,
        pedagogy_agent=pedagogy_agent,
        verification_agent=verification_agent
    )

@router.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """
    Ask a question and get a structured, pedagogical answer
    with curriculum alignment and verified sources
    """
    
    # Validate question
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # Check for cached response
    vector_store, cache_service = get_services()
    
    if cache_service:
        cached = await cache_service.get_cached_response(
            query=request.question,
            course_id=request.course_id
        )
        if cached:
            logger.info(f"Returning cached response for: {request.question[:50]}...")
            return AskResponse(
                success=True,
                data={
                    "messageId": f"msg_{uuid.uuid4().hex[:8]}",
                    "cached": True,
                    **cached
                }
            )
    
    # Generate new response
    message_id = f"msg_{uuid.uuid4().hex[:8]}"
    start_time = datetime.utcnow()
    
    try:
        # Get orchestrator and process question
        orchestrator = get_orchestrator()
        
        result = await orchestrator.process_question(
            question=request.question,
            session_id=request.session_id,
            course_id=request.course_id,
            options=request.options or {}
        )
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Format response
        response_data = {
            "messageId": message_id,
            "answer": result.get("answer", {}),
            "sources": result.get("sources", []),
            "misconceptionWarning": result.get("misconception_warning", {}),
            "metadata": {
                "processingTimeMs": int(processing_time),
                "retrievedChunks": len(result.get("sources", [])),
                **result.get("metadata", {})
            }
        }
        
        # Cache the response
        if cache_service:
            await cache_service.cache_response(
                query=request.question,
                response=response_data,
                course_id=request.course_id
            )
        
        # Store in chat history
        if request.session_id not in chat_history_db:
            chat_history_db[request.session_id] = []
        
        chat_history_db[request.session_id].append({
            "messageId": message_id,
            "role": "user",
            "content": request.question,
            "timestamp": start_time.isoformat()
        })
        
        chat_history_db[request.session_id].append({
            "messageId": f"msg_{uuid.uuid4().hex[:8]}",
            "role": "assistant",
            "answer": response_data["answer"],
            "sources": response_data["sources"],
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return AskResponse(
            success=True,
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Question processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask/stream")
async def ask_question_stream(request: AskRequest):
    """
    Ask a question with streaming response (SSE)
    """
    
    async def generate_stream():
        """Generate SSE events"""
        message_id = f"msg_{uuid.uuid4().hex[:8]}"
        
        # Send start event
        yield f"event: start\ndata: {json.dumps({'messageId': message_id, 'status': 'processing'})}\n\n"
        
        try:
            # Get orchestrator
            orchestrator = get_orchestrator()
            
            # Send retrieval status
            yield f"event: status\ndata: {json.dumps({'step': 'retrieving', 'message': 'Searching course materials...'})}\n\n"
            
            # Process question
            result = await orchestrator.process_question(
                question=request.question,
                session_id=request.session_id,
                course_id=request.course_id,
                options=request.options or {}
            )
            
            # Stream answer sections
            answer = result.get("answer", {})
            
            for section in ["definition", "explanation", "example"]:
                if section in answer and answer[section]:
                    yield f"event: chunk\ndata: {json.dumps({'type': section, 'content': answer[section]})}\n\n"
                    await asyncio.sleep(0.1)  # Small delay for UX
            
            # Send pitfalls
            if answer.get("pitfalls"):
                yield f"event: pitfalls\ndata: {json.dumps({'pitfalls': answer['pitfalls']})}\n\n"
            
            # Send sources
            yield f"event: sources\ndata: {json.dumps({'sources': result.get('sources', [])})}\n\n"
            
            # Send misconception warning if any
            if result.get("misconception_warning", {}).get("detected"):
                yield f"event: warning\ndata: {json.dumps(result['misconception_warning'])}\n\n"
            
            # Send complete event
            yield f"event: complete\ndata: {json.dumps({'messageId': message_id, 'success': True})}\n\n"
            
        except Exception as e:
            logger.error(f"Stream processing failed: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@router.get("/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50):
    """Get chat history for a session"""
    
    if session_id not in chat_history_db:
        return {
            "success": True,
            "data": {
                "sessionId": session_id,
                "messages": []
            }
        }
    
    messages = chat_history_db[session_id][-limit:]
    
    return {
        "success": True,
        "data": {
            "sessionId": session_id,
            "messages": messages
        }
    }

@router.delete("/history/{session_id}")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session"""
    
    if session_id in chat_history_db:
        del chat_history_db[session_id]
    
    return {
        "success": True,
        "message": "Chat history cleared"
    }

@router.post("/misconception-check")
async def check_misconceptions(request: AskRequest):
    """
    Check a question for potential student misconceptions
    without generating a full answer
    """
    
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    pedagogy_agent = PedagogyAgent(openai_client)
    
    # Get chat history if available
    history = []
    if request.session_id in chat_history_db:
        history = [
            {"role": m["role"], "content": m.get("content", "")}
            for m in chat_history_db[request.session_id][-5:]
        ]
    
    result = await pedagogy_agent.detect_student_misconceptions(
        question=request.question,
        chat_history=history
    )
    
    return {
        "success": True,
        "data": result
    }
