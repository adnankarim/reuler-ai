"""
Document Processor Service
Handles PDF parsing, text extraction, and chunking
"""

import os
import re
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

@dataclass
class DocumentChunk:
    """Represents a chunk of document content"""
    chunk_id: str
    document_id: str
    content: str
    page_number: int
    chunk_index: int
    metadata: Dict[str, Any]

class DocumentProcessor:
    """
    Service for processing PDF documents:
    - Text extraction
    - Recursive text chunking
    - Metadata extraction
    """
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        min_chunk_size: int = 100
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size
        
    async def process_pdf(
        self,
        file_path: str,
        document_id: str,
        metadata: Dict[str, Any] = None
    ) -> Tuple[List[DocumentChunk], Dict[str, Any]]:
        """
        Process a PDF file and return chunks
        
        Args:
            file_path: Path to the PDF file
            document_id: Unique identifier for the document
            metadata: Additional metadata to attach to chunks
            
        Returns:
            Tuple of (list of chunks, document metadata)
        """
        metadata = metadata or {}
        
        logger.info(f"Processing PDF: {file_path}")
        
        # Extract text from PDF
        pages_content, doc_metadata = await self._extract_text(file_path)
        
        # Chunk the content
        chunks = await self._chunk_document(
            pages_content=pages_content,
            document_id=document_id,
            base_metadata={**metadata, **doc_metadata}
        )
        
        logger.info(f"Extracted {len(chunks)} chunks from {len(pages_content)} pages")
        
        return chunks, doc_metadata
    
    async def _extract_text(
        self,
        file_path: str
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extract text content from PDF using PyMuPDF
        """
        try:
            doc = fitz.open(file_path)
            
            pages_content = []
            for page_num, page in enumerate(doc, 1):
                text = page.get_text("text")
                
                # Clean text
                text = self._clean_text(text)
                
                if text.strip():
                    pages_content.append({
                        "page_number": page_num,
                        "content": text,
                        "char_count": len(text)
                    })
            
            # Extract document metadata
            doc_metadata = {
                "page_count": len(doc),
                "title": doc.metadata.get("title", ""),
                "author": doc.metadata.get("author", ""),
                "subject": doc.metadata.get("subject", ""),
                "keywords": doc.metadata.get("keywords", ""),
                "total_chars": sum(p["char_count"] for p in pages_content)
            }
            
            doc.close()
            return pages_content, doc_metadata
            
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove page numbers (common patterns)
        text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)
        
        # Remove excessive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    async def _chunk_document(
        self,
        pages_content: List[Dict[str, Any]],
        document_id: str,
        base_metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """
        Chunk document content using recursive character splitting
        """
        chunks = []
        chunk_index = 0
        
        for page_info in pages_content:
            page_num = page_info["page_number"]
            content = page_info["content"]
            
            # Split page content into chunks
            page_chunks = self._recursive_split(content)
            
            for chunk_content in page_chunks:
                if len(chunk_content) < self.min_chunk_size:
                    continue
                
                chunk = DocumentChunk(
                    chunk_id=f"{document_id}_chunk_{chunk_index}",
                    document_id=document_id,
                    content=chunk_content,
                    page_number=page_num,
                    chunk_index=chunk_index,
                    metadata={
                        **base_metadata,
                        "page": page_num,
                        "chunk_index": chunk_index
                    }
                )
                chunks.append(chunk)
                chunk_index += 1
        
        return chunks
    
    def _recursive_split(
        self,
        text: str,
        separators: List[str] = None
    ) -> List[str]:
        """
        Recursively split text using a hierarchy of separators
        """
        if separators is None:
            separators = ["\n\n", "\n", ". ", " ", ""]
        
        chunks = []
        separator = separators[0]
        new_separators = separators[1:] if len(separators) > 1 else []
        
        # Split by current separator
        splits = text.split(separator) if separator else list(text)
        
        current_chunk = ""
        for split in splits:
            # Add separator back (except for empty string)
            piece = split + separator if separator else split
            
            # If adding this piece would exceed chunk size
            if len(current_chunk) + len(piece) > self.chunk_size:
                # Save current chunk if it's big enough
                if len(current_chunk) >= self.min_chunk_size:
                    chunks.append(current_chunk.strip())
                
                # If the piece itself is too large, recursively split it
                if len(piece) > self.chunk_size and new_separators:
                    sub_chunks = self._recursive_split(piece, new_separators)
                    chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    # Start new chunk with overlap from previous
                    overlap = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else current_chunk
                    current_chunk = overlap + piece
            else:
                current_chunk += piece
        
        # Add remaining content
        if len(current_chunk) >= self.min_chunk_size:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def chunks_to_dict(
        self,
        chunks: List[DocumentChunk]
    ) -> List[Dict[str, Any]]:
        """Convert DocumentChunk objects to dictionaries"""
        return [
            {
                "chunk_id": c.chunk_id,
                "document_id": c.document_id,
                "content": c.content,
                "page_number": c.page_number,
                "chunk_index": c.chunk_index,
                "metadata": c.metadata
            }
            for c in chunks
        ]


class ConceptExtractor:
    """
    Extract key concepts from document chunks
    for building the concept graph
    """
    
    def __init__(self, openai_client):
        self.client = openai_client
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    async def extract_concepts(
        self,
        chunks: List[DocumentChunk],
        course_id: str,
        max_concepts: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Extract key concepts from document chunks
        """
        # Combine chunk contents
        all_content = "\n\n".join([c.content for c in chunks[:20]])  # Use first 20 chunks
        
        system_prompt = """You are an expert at extracting academic concepts from course material.
Identify the key concepts, their definitions, and prerequisites.

OUTPUT FORMAT (JSON):
{
    "concepts": [
        {
            "name": "Concept Name",
            "description": "Brief description",
            "prerequisites": ["prerequisite1", "prerequisite2"],
            "difficulty": "beginner|intermediate|advanced"
        }
    ]
}

Extract up to 30 key concepts."""
        
        user_prompt = f"""Extract key concepts from this course material:

{all_content[:8000]}  

Course ID: {course_id}"""
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            
            import json
            result = json.loads(content.strip())
            return result.get("concepts", [])
            
        except Exception as e:
            logger.error(f"Concept extraction failed: {e}")
            return []
