"""
Document Processor - PDF parsing, chunking, and embedding
"""

import os
import uuid
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import re

from fastapi import UploadFile


class DocumentProcessor:
    """Process documents: parse PDFs, chunk text, generate embeddings"""
    
    def __init__(
        self,
        embedding_service,
        vector_store,
        upload_dir: str = "/app/uploads",
        chunk_size: int = 500,
        chunk_overlap: int = 100
    ):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.upload_dir = upload_dir
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        os.makedirs(upload_dir, exist_ok=True)
    
    async def process_document(
        self,
        file: UploadFile,
        course_id: str,
        doc_type: str = "notes"
    ) -> Dict[str, Any]:
        """Process an uploaded PDF document"""
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Save file
        file_path = os.path.join(self.upload_dir, f"{document_id}.pdf")
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Parse PDF
        text_by_page = self._parse_pdf(file_path)
        
        # Create chunks
        chunks = self._create_chunks(
            text_by_page=text_by_page,
            document_id=document_id,
            document_title=file.filename,
            doc_type=doc_type
        )
        
        # Generate embeddings
        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = await self.embedding_service.embed_texts(chunk_texts)
        
        # Store in vector database
        await self.vector_store.add_documents(
            course_id=course_id,
            chunks=chunks,
            embeddings=embeddings
        )
        
        # Extract concepts (simplified - in production, use LLM)
        concepts = self._extract_concepts(chunk_texts)
        
        return {
            "document_id": document_id,
            "filename": file.filename,
            "concepts": concepts,
            "chunk_count": len(chunks),
            "status": "processed"
        }
    
    def _parse_pdf(self, file_path: str) -> Dict[int, str]:
        """Parse PDF and extract text by page"""
        doc = fitz.open(file_path)
        text_by_page = {}
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            # Clean up text
            text = self._clean_text(text)
            if text.strip():
                text_by_page[page_num + 1] = text
        
        doc.close()
        return text_by_page
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        # Remove special characters but keep math symbols
        text = re.sub(r'[^\w\s.,;:!?()[\]{}<>+=\-*/^%$#@&|~`"\'\\]', '', text)
        return text.strip()
    
    def _create_chunks(
        self,
        text_by_page: Dict[int, str],
        document_id: str,
        document_title: str,
        doc_type: str
    ) -> List[Dict[str, Any]]:
        """Create overlapping chunks from text"""
        chunks = []
        chunk_index = 0
        
        for page_num, text in text_by_page.items():
            # Split into sentences
            sentences = re.split(r'(?<=[.!?])\s+', text)
            
            current_chunk = ""
            current_sentences = []
            
            for sentence in sentences:
                # Check if adding this sentence exceeds chunk size
                potential_chunk = current_chunk + " " + sentence if current_chunk else sentence
                
                if len(potential_chunk.split()) > self.chunk_size:
                    # Save current chunk
                    if current_chunk:
                        chunks.append({
                            "id": f"{document_id}_{chunk_index}",
                            "text": current_chunk.strip(),
                            "document_id": document_id,
                            "document_title": document_title,
                            "page": page_num,
                            "chunk_index": chunk_index,
                            "doc_type": doc_type,
                            "source": f"{document_title}, p.{page_num}"
                        })
                        chunk_index += 1
                    
                    # Start new chunk with overlap
                    overlap_sentences = current_sentences[-3:] if len(current_sentences) >= 3 else current_sentences
                    current_chunk = " ".join(overlap_sentences) + " " + sentence
                    current_sentences = overlap_sentences + [sentence]
                else:
                    current_chunk = potential_chunk
                    current_sentences.append(sentence)
            
            # Don't forget the last chunk of the page
            if current_chunk:
                chunks.append({
                    "id": f"{document_id}_{chunk_index}",
                    "text": current_chunk.strip(),
                    "document_id": document_id,
                    "document_title": document_title,
                    "page": page_num,
                    "chunk_index": chunk_index,
                    "doc_type": doc_type,
                    "source": f"{document_title}, p.{page_num}"
                })
                chunk_index += 1
        
        return chunks
    
    def _extract_concepts(self, texts: List[str], max_concepts: int = 20) -> List[str]:
        """Extract key concepts from text (simplified version)"""
        # In production, use LLM for better concept extraction
        all_text = " ".join(texts)
        
        # Simple keyword extraction based on capitalized words and patterns
        # Look for patterns like "X is defined as", "The concept of X"
        patterns = [
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are)\s+(?:defined|described)',
            r'(?:concept|principle|theory|law|theorem)\s+of\s+(\w+(?:\s+\w+)*)',
            r'(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:theorem|principle|law|equation)',
        ]
        
        concepts = set()
        for pattern in patterns:
            matches = re.findall(pattern, all_text, re.IGNORECASE)
            concepts.update(matches)
        
        # Also extract frequently occurring capitalized phrases
        capitalized = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', all_text)
        from collections import Counter
        common = Counter(capitalized).most_common(10)
        concepts.update([c[0] for c in common])
        
        return list(concepts)[:max_concepts]
