"""
Vector Store Service - ChromaDB integration for document storage and retrieval
"""

import uuid
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings


class VectorStore:
    """ChromaDB-based vector store for document chunks"""
    
    def __init__(self, host: str = "localhost", port: int = 8000):
        self.host = host
        self.port = port
        self.client = None
        self.collections: Dict[str, Any] = {}
        
    async def initialize(self):
        """Initialize ChromaDB client connection"""
        try:
            self.client = chromadb.HttpClient(
                host=self.host,
                port=self.port,
                settings=Settings(anonymized_telemetry=False)
            )
            # Test connection
            self.client.heartbeat()
        except Exception as e:
            # Fallback to persistent local storage
            self.client = chromadb.PersistentClient(path="/app/data/chroma")
    
    def _get_collection(self, course_id: str):
        """Get or create a collection for a course"""
        collection_name = f"course_{course_id}"
        
        if collection_name not in self.collections:
            self.collections[collection_name] = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        
        return self.collections[collection_name]
    
    async def add_documents(
        self,
        course_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> int:
        """Add document chunks to the vector store"""
        collection = self._get_collection(course_id)
        
        ids = [chunk.get("id", str(uuid.uuid4())) for chunk in chunks]
        documents = [chunk["text"] for chunk in chunks]
        metadatas = [
            {
                "document_id": chunk.get("document_id", ""),
                "document_title": chunk.get("document_title", ""),
                "page": chunk.get("page", 0),
                "chunk_index": chunk.get("chunk_index", 0),
                "doc_type": chunk.get("doc_type", "notes"),
                "source": chunk.get("source", "")
            }
            for chunk in chunks
        ]
        
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        
        return len(chunks)
    
    async def search(
        self,
        query: str,
        course_id: str,
        limit: int = 10,
        embedding_service=None,
        filters: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Semantic search in the vector store"""
        import structlog
        logger = structlog.get_logger()
        
        collection = self._get_collection(course_id)
        
        # Check if collection has any documents
        collection_count = collection.count()
        logger.info("Vector store search", 
                   course_id=course_id, 
                   collection_count=collection_count,
                   query=query[:50])
        
        if collection_count == 0:
            logger.warning("Empty collection", course_id=course_id)
            return []
        
        # Generate query embedding
        query_embedding = await embedding_service.embed_text(query)
        
        # Build where filter
        where = filters if filters else None
        
        try:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=min(limit, collection_count),
                where=where,
                include=["documents", "metadatas", "distances"]
            )
        except Exception as e:
            logger.error("Search error", error=str(e), course_id=course_id)
            return []
        
        # Format results
        formatted_results = []
        if results and results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "text": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i] if results['distances'] else 0,
                    "score": 1 - (results['distances'][0][i] if results['distances'] else 0)
                })
        
        logger.info("Search results", 
                   course_id=course_id, 
                   results_count=len(formatted_results))
        
        return formatted_results
    
    async def get_documents(self, course_id: str) -> List[Dict[str, Any]]:
        """Get all unique documents for a course"""
        collection = self._get_collection(course_id)
        
        # Get all items
        results = collection.get(include=["metadatas"])
        
        # Extract unique documents
        documents = {}
        if results and results['metadatas']:
            for metadata in results['metadatas']:
                doc_id = metadata.get('document_id')
                if doc_id and doc_id not in documents:
                    documents[doc_id] = {
                        "document_id": doc_id,
                        "title": metadata.get('document_title', ''),
                        "doc_type": metadata.get('doc_type', 'notes'),
                        "source": metadata.get('source', '')
                    }
        
        return list(documents.values())
    
    async def get_all_chunks(self, course_id: str, doc_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all chunks for a course, optionally filtered by doc type"""
        collection = self._get_collection(course_id)
        
        where = {"doc_type": doc_type} if doc_type else None
        
        results = collection.get(
            where=where,
            include=["documents", "metadatas"]
        )
        
        chunks = []
        if results and results['ids']:
            for i in range(len(results['ids'])):
                chunks.append({
                    "id": results['ids'][i],
                    "text": results['documents'][i],
                    "metadata": results['metadatas'][i]
                })
        
        return chunks
    
    async def delete_document(self, course_id: str, document_id: str):
        """Delete all chunks from a specific document"""
        collection = self._get_collection(course_id)
        
        # Get chunks for this document
        results = collection.get(
            where={"document_id": document_id},
            include=["metadatas"]
        )
        
        if results and results['ids']:
            collection.delete(ids=results['ids'])
    
    async def count(self, course_id: str) -> int:
        """Get total chunk count for a course"""
        collection = self._get_collection(course_id)
        return collection.count()
    
    async def delete_course(self, course_id: str):
        """Delete all chunks and collection for a course"""
        import structlog
        logger = structlog.get_logger()
        
        try:
            collection = self._get_collection(course_id)
            collection_name = f"course_{course_id}"
            
            # Get all chunk IDs
            results = collection.get(include=["metadatas"])
            chunk_count = len(results['ids']) if results and results['ids'] else 0
            
            if chunk_count > 0:
                # Delete all chunks
                collection.delete(ids=results['ids'])
                logger.info("Deleted chunks", course_id=course_id, chunk_count=chunk_count)
            
            # Delete the collection
            try:
                self.client.delete_collection(name=collection_name)
                logger.info("Deleted collection", collection_name=collection_name)
            except Exception as e:
                logger.warning("Collection deletion", error=str(e), collection_name=collection_name)
            
            # Remove from cache
            if collection_name in self.collections:
                del self.collections[collection_name]
            
            return chunk_count
        except Exception as e:
            logger.error("Error deleting course", course_id=course_id, error=str(e))
            raise
