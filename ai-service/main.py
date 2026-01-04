"""
Reuler AI Service - Main Application
Agentic AI system for curriculum-aware learning
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

import structlog

# Import our modules
from services.document_processor import DocumentProcessor
from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from agents.orchestrator import AgentOrchestrator
from agents.retrieval_agent import RetrievalAgent
from agents.pedagogy_agent import PedagogyAgent
from agents.verification_agent import VerificationAgent
from services.concept_graph import ConceptGraphEngine
from services.study_generator import StudyMaterialGenerator


# Configuration
class Settings(BaseSettings):
    openai_api_key: str = Field(default="")
    chroma_host: str = Field(default="localhost")
    chroma_port: int = Field(default=8000)
    upload_dir: str = Field(default="/app/uploads")
    model_name: str = Field(default="gpt-4o-mini")
    embedding_model: str = Field(default="text-embedding-3-small")
    
    class Config:
        # Docker Compose passes env vars directly, but also check for .env file
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Allow reading from environment variables (which Docker Compose sets)
        case_sensitive = False


settings = Settings()

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


# Global services (initialized on startup)
document_processor: Optional[DocumentProcessor] = None
embedding_service: Optional[EmbeddingService] = None
vector_store: Optional[VectorStore] = None
agent_orchestrator: Optional[AgentOrchestrator] = None
concept_graph_engine: Optional[ConceptGraphEngine] = None
study_generator: Optional[StudyMaterialGenerator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown"""
    global document_processor, embedding_service, vector_store
    global agent_orchestrator, concept_graph_engine, study_generator
    
    logger.info("Initializing AI services...")
    
    # Initialize services
    embedding_service = EmbeddingService(
        api_key=settings.openai_api_key,
        model=settings.embedding_model
    )
    
    vector_store = VectorStore(
        host=settings.chroma_host,
        port=settings.chroma_port
    )
    await vector_store.initialize()
    
    document_processor = DocumentProcessor(
        embedding_service=embedding_service,
        vector_store=vector_store,
        upload_dir=settings.upload_dir
    )
    
    # Initialize agents
    retrieval_agent = RetrievalAgent(
        vector_store=vector_store,
        embedding_service=embedding_service
    )
    
    pedagogy_agent = PedagogyAgent(
        api_key=settings.openai_api_key,
        model=settings.model_name
    )
    
    verification_agent = VerificationAgent(
        api_key=settings.openai_api_key,
        model=settings.model_name
    )
    
    agent_orchestrator = AgentOrchestrator(
        retrieval_agent=retrieval_agent,
        pedagogy_agent=pedagogy_agent,
        verification_agent=verification_agent
    )
    
    concept_graph_engine = ConceptGraphEngine(
        api_key=settings.openai_api_key,
        model=settings.model_name
    )
    
    study_generator = StudyMaterialGenerator(
        api_key=settings.openai_api_key,
        model=settings.model_name,
        vector_store=vector_store
    )
    
    logger.info("AI services initialized successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down AI services...")


# Create FastAPI app
app = FastAPI(
    title="Reuler AI Service",
    description="Agentic AI system for curriculum-aware learning",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000)
    course_id: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    include_sources: bool = True
    detect_misconceptions: bool = True


class SourceInfo(BaseModel):
    title: str
    page: Optional[int] = None
    chunk_id: str
    confidence: float
    excerpt: str


class StructuredAnswer(BaseModel):
    definition: str
    explanation: str
    example: str
    pitfalls: list[str]


class ChatResponse(BaseModel):
    answer: StructuredAnswer
    sources: list[SourceInfo]
    curriculum_alignment: float
    misconception_warning: Optional[str] = None
    related_concepts: list[str]
    confidence: float
    has_course_material: bool = False


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    concepts: list[str]
    chunk_count: int
    status: str


class ConceptNode(BaseModel):
    id: str
    name: str
    description: str
    prerequisites: list[str]
    difficulty: int


class ConceptGraphResponse(BaseModel):
    nodes: list[ConceptNode]
    edges: list[dict]
    learning_paths: list[list[str]]


class SummaryRequest(BaseModel):
    course_id: str
    topics: Optional[list[str]] = None
    format: str = "structured"


class SummaryResponse(BaseModel):
    summary: str
    key_concepts: list[str]
    study_tips: list[str]
    bibliography: list[dict]


class FlashcardRequest(BaseModel):
    course_id: str
    topics: Optional[list[str]] = None
    count: int = 20
    difficulty: str = "mixed"
    avoid_duplicates: Optional[list[str]] = None


class Flashcard(BaseModel):
    id: str
    front: str
    back: str
    topic: str
    difficulty: str
    source: Optional[str] = None


class FlashcardResponse(BaseModel):
    flashcards: list[Flashcard]
    total_count: int


class ExamRequest(BaseModel):
    course_id: str
    topics: Optional[list[str]] = None
    question_count: int = 10
    question_types: list[str] = ["multiple_choice", "short_answer", "essay"]
    difficulty: str = "mixed"
    avoid_duplicates: Optional[list[str]] = None


class ExamQuestion(BaseModel):
    id: str
    type: str
    question: str
    options: Optional[list[str]] = None
    correct_answer: str
    explanation: str
    topic: str
    difficulty: str
    points: int


class ExamResponse(BaseModel):
    exam_id: str
    title: str
    questions: list[ExamQuestion]
    total_points: int
    time_limit_minutes: int


class BibliographyRequest(BaseModel):
    course_id: str
    format: str = "apa"


class BibliographyResponse(BaseModel):
    entries: list[str]
    format: str


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}


# Chat endpoint - Main Q&A functionality
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a learning question through the agentic AI system."""
    try:
        logger.info("Processing chat request", question=request.question[:100], course_id=request.course_id)
        
        result = await agent_orchestrator.process_question(
            question=request.question,
            course_id=request.course_id,
            include_sources=request.include_sources,
            detect_misconceptions=request.detect_misconceptions
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error("Chat processing error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


# Document upload endpoint
@app.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    course_id: str = Form(...),
    doc_type: str = Form(default="notes")
):
    """Upload and process a PDF document for the course."""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        logger.info("Processing document upload", filename=file.filename, course_id=course_id)
        
        result = await document_processor.process_document(
            file=file,
            course_id=course_id,
            doc_type=doc_type
        )
        
        return DocumentUploadResponse(**result)
        
    except Exception as e:
        logger.error("Document upload error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


# Concept graph endpoint
@app.get("/concepts/{course_id}", response_model=ConceptGraphResponse)
async def get_concept_graph(course_id: str):
    """Get the concept graph for a course."""
    try:
        result = await concept_graph_engine.get_graph(course_id)
        return ConceptGraphResponse(**result)
        
    except Exception as e:
        logger.error("Concept graph error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating concept graph: {str(e)}")


@app.post("/concepts/{course_id}/build")
async def build_concept_graph(course_id: str):
    """Build/rebuild the concept graph from course documents."""
    try:
        # Check if course has documents
        chunk_count = await vector_store.count(course_id)
        if chunk_count == 0:
            raise HTTPException(
                status_code=400, 
                detail="No documents found for this course. Please upload documents first."
            )
        
        result = await concept_graph_engine.build_from_documents(course_id, vector_store)
        
        if not result.get("nodes"):
            raise HTTPException(
                status_code=500,
                detail="Failed to extract concepts from documents. The documents may not contain enough content."
            )
        
        return {
            "status": "success", 
            "concepts_found": len(result["nodes"]),
            "nodes": result.get("nodes", []),
            "edges": result.get("edges", []),
            "learning_paths": result.get("learning_paths", [])
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error("Concept graph build error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Concept graph build error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error building concept graph: {str(e)}")


@app.post("/generate/summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """Generate a structured summary for exam preparation."""
    try:
        result = await study_generator.generate_summary(
            course_id=request.course_id,
            topics=request.topics,
            format=request.format
        )
        return SummaryResponse(**result)
        
    except Exception as e:
        logger.error("Summary generation error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")


@app.post("/generate/flashcards", response_model=FlashcardResponse)
async def generate_flashcards(request: FlashcardRequest):
    """Generate flashcards from course material."""
    try:
        result = await study_generator.generate_flashcards(
            course_id=request.course_id,
            topics=request.topics,
            count=request.count,
            difficulty=request.difficulty,
            avoid_duplicates=request.avoid_duplicates or []
        )
        return FlashcardResponse(**result)
        
    except Exception as e:
        logger.error("Flashcard generation error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")


@app.post("/generate/exam", response_model=ExamResponse)
async def generate_exam(request: ExamRequest):
    """Generate a practice exam with various question types."""
    try:
        result = await study_generator.generate_exam(
            course_id=request.course_id,
            topics=request.topics,
            question_count=request.question_count,
            question_types=request.question_types,
            difficulty=request.difficulty,
            avoid_duplicates=request.avoid_duplicates or []
        )
        return ExamResponse(**result)
        
    except Exception as e:
        logger.error("Exam generation error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating exam: {str(e)}")


@app.post("/generate/bibliography", response_model=BibliographyResponse)
async def generate_bibliography(request: BibliographyRequest):
    """Export bibliography in various formats."""
    try:
        result = await study_generator.generate_bibliography(
            course_id=request.course_id,
            format=request.format
        )
        return BibliographyResponse(**result)
        
    except Exception as e:
        logger.error("Bibliography generation error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating bibliography: {str(e)}")


@app.post("/search")
async def semantic_search(
    query: str = Form(...),
    course_id: str = Form(...),
    limit: int = Form(default=10)
):
    """Perform semantic search across course documents."""
    try:
        results = await vector_store.search(
            query=query,
            course_id=course_id,
            limit=limit,
            embedding_service=embedding_service
        )
        return {"results": results}
        
    except Exception as e:
        logger.error("Search error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")


@app.get("/documents/{course_id}")
async def get_documents(course_id: str):
    """Get list of documents for a course."""
    try:
        documents = await vector_store.get_documents(course_id)
        return {"documents": documents}
        
    except Exception as e:
        logger.error("Get documents error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")


# Delete course endpoint
@app.delete("/courses/{course_id}")
async def delete_course(course_id: str):
    """Delete a course and all its chunks from the vector store."""
    try:
        logger.info("Deleting course", course_id=course_id)
        
        # Delete all chunks for this course
        chunk_count = await vector_store.delete_course(course_id)
        
        logger.info("Course deleted", course_id=course_id, chunks_deleted=chunk_count)
        
        return {
            "success": True,
            "course_id": course_id,
            "chunks_deleted": chunk_count
        }
        
    except Exception as e:
        logger.error("Course deletion error", error=str(e), course_id=course_id)
        raise HTTPException(status_code=500, detail=f"Error deleting course: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
