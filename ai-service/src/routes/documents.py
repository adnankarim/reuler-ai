"""
Documents API Routes
Handles document upload and processing
"""

import os
import uuid
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel

from src.services.document_processor import DocumentProcessor, ConceptExtractor
from src.services.vector_store import VectorStoreService
from src.services.cache_service import CacheService
from src.models.schemas import DocumentMetadata, DocumentType, ProcessingStatus

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory document storage (would be MongoDB in production)
documents_db = {}
processing_tasks = {}

class DocumentUploadResponse(BaseModel):
    success: bool
    data: dict

class DocumentStatusResponse(BaseModel):
    success: bool
    data: dict

# Get services from main app
def get_services():
    from main import get_vector_store, get_cache_service
    return get_vector_store(), get_cache_service()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    course_id: Optional[str] = Form(None),
    document_type: str = Form("lecture"),
    title: Optional[str] = Form(None)
):
    """Upload and process a PDF document"""
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Validate file size (50MB max)
    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    # Generate document ID
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    
    # Save file temporarily
    upload_dir = os.getenv("UPLOAD_DIR", "/tmp/reuler_ai_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{document_id}.pdf")
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create document metadata
    doc_metadata = DocumentMetadata(
        document_id=document_id,
        filename=file.filename,
        document_type=DocumentType(document_type),
        course_id=course_id,
        title=title or file.filename,
        status=ProcessingStatus.PROCESSING
    )
    
    # Store in memory (would be MongoDB)
    documents_db[document_id] = doc_metadata.model_dump()
    
    # Start background processing
    background_tasks.add_task(
        process_document_background,
        document_id=document_id,
        file_path=file_path,
        metadata=doc_metadata.model_dump()
    )
    
    return DocumentUploadResponse(
        success=True,
        data={
            "documentId": document_id,
            "filename": file.filename,
            "status": "processing",
            "uploadedAt": datetime.utcnow().isoformat(),
            "processingEstimate": "1-3 minutes"
        }
    )

async def process_document_background(
    document_id: str,
    file_path: str,
    metadata: dict
):
    """Background task to process uploaded document"""
    try:
        logger.info(f"Starting background processing for {document_id}")
        
        vector_store, cache_service = get_services()
        
        # Initialize processor
        processor = DocumentProcessor(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        # Process PDF
        chunks, doc_meta = await processor.process_pdf(
            file_path=file_path,
            document_id=document_id,
            metadata={
                "source": metadata.get("filename", "Unknown"),
                "document_type": metadata.get("document_type", "lecture"),
                "course_id": metadata.get("course_id", ""),
                "document_id": document_id
            }
        )
        
        # Convert chunks to dict format
        chunks_dict = processor.chunks_to_dict(chunks)
        
        # Add to vector store
        await vector_store.add_documents(chunks_dict)
        
        # Update document metadata
        documents_db[document_id].update({
            "status": ProcessingStatus.READY.value,
            "chunks_created": len(chunks),
            "page_count": doc_meta.get("page_count", 0),
            "processed_at": datetime.utcnow().isoformat()
        })
        
        # Extract concepts if course_id provided
        if metadata.get("course_id"):
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            extractor = ConceptExtractor(client)
            
            concepts = await extractor.extract_concepts(
                chunks=chunks,
                course_id=metadata["course_id"]
            )
            
            documents_db[document_id]["concepts_extracted"] = len(concepts)
            
            # Cache concept graph
            if cache_service:
                existing_graph = await cache_service.get_cached_concept_graph(
                    metadata["course_id"]
                )
                
                if existing_graph:
                    # Merge concepts
                    existing_concepts = existing_graph.get("concepts", [])
                    concept_names = {c["name"] for c in existing_concepts}
                    new_concepts = [c for c in concepts if c["name"] not in concept_names]
                    existing_graph["concepts"].extend(new_concepts)
                    await cache_service.cache_concept_graph(
                        metadata["course_id"],
                        existing_graph
                    )
                else:
                    await cache_service.cache_concept_graph(
                        metadata["course_id"],
                        {"course_id": metadata["course_id"], "concepts": concepts}
                    )
        
        logger.info(f"Successfully processed document {document_id}")
        
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)
            
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        documents_db[document_id].update({
            "status": ProcessingStatus.FAILED.value,
            "error": str(e)
        })

@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(document_id: str):
    """Get processing status of a document"""
    
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = documents_db[document_id]
    
    return DocumentStatusResponse(
        success=True,
        data={
            "documentId": document_id,
            "status": doc.get("status", "unknown"),
            "chunksCreated": doc.get("chunks_created", 0),
            "conceptsExtracted": doc.get("concepts_extracted", 0),
            "pageCount": doc.get("page_count", 0),
            "error": doc.get("error")
        }
    )

@router.get("")
async def list_documents(
    course_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """List all documents"""
    
    docs = list(documents_db.values())
    
    # Filter by course_id if provided
    if course_id:
        docs = [d for d in docs if d.get("course_id") == course_id]
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    paginated = docs[start:end]
    
    return {
        "success": True,
        "data": {
            "documents": [
                {
                    "documentId": d.get("document_id"),
                    "filename": d.get("filename"),
                    "documentType": d.get("document_type"),
                    "pageCount": d.get("page_count", 0),
                    "status": d.get("status"),
                    "uploadedAt": d.get("uploaded_at")
                }
                for d in paginated
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": len(docs),
                "hasMore": end < len(docs)
            }
        }
    }

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its chunks"""
    
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    vector_store, cache_service = get_services()
    
    # Delete from vector store
    deleted_count = await vector_store.delete_documents(document_id)
    
    # Delete from memory store
    doc = documents_db.pop(document_id)
    
    # Clear course cache if applicable
    if cache_service and doc.get("course_id"):
        await cache_service.clear_course_cache(doc["course_id"])
    
    return {
        "success": True,
        "message": f"Document deleted successfully. {deleted_count} chunks removed."
    }
