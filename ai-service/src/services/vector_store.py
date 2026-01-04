"""
Vector Store Service - ChromaDB implementation
Handles document embeddings and semantic search
"""

import os
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from openai import AsyncOpenAI
import asyncio

logger = logging.getLogger(__name__)

class VectorStoreService:
    """
    Vector store service using ChromaDB for document embeddings
    and semantic search capabilities
    """
    
    def __init__(self, persist_directory: str = "./vector_db_data"):
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.openai_client = None
        self.embedding_model = "text-embedding-ada-002"
        
    async def initialize(self):
        """Initialize ChromaDB and OpenAI clients"""
        logger.info(f"Initializing vector store at {self.persist_directory}")
        
        # Create persist directory if needed
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Initialize ChromaDB with persistence
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create main collection
        self.collection = self.client.get_or_create_collection(
            name="reuler_ai_documents",
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )
        
        # Initialize OpenAI client for embeddings
        self.openai_client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        logger.info(f"Vector store initialized. Collection has {self.collection.count()} documents")
    
    async def close(self):
        """Close connections"""
        logger.info("Closing vector store connections")
        # ChromaDB doesn't require explicit closing for PersistentClient
    
    async def add_documents(
        self,
        documents: List[Dict[str, Any]],
        batch_size: int = 100
    ) -> int:
        """
        Add documents to the vector store
        
        Args:
            documents: List of document chunks with content and metadata
            batch_size: Number of documents to process at once
            
        Returns:
            Number of documents added
        """
        if not documents:
            return 0
        
        total_added = 0
        
        # Process in batches
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            
            # Extract content for embedding
            contents = [doc["content"] for doc in batch]
            
            # Generate embeddings
            embeddings = await self._generate_embeddings(contents)
            
            # Prepare data for ChromaDB
            ids = [doc["chunk_id"] for doc in batch]
            metadatas = [
                {
                    "document_id": doc.get("document_id", ""),
                    "source": doc.get("metadata", {}).get("source", ""),
                    "page": doc.get("metadata", {}).get("page", 0),
                    "document_type": doc.get("metadata", {}).get("document_type", ""),
                    "course_id": doc.get("metadata", {}).get("course_id", ""),
                    "chunk_index": doc.get("chunk_index", 0)
                }
                for doc in batch
            ]
            
            # Add to collection
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=contents,
                metadatas=metadatas
            )
            
            total_added += len(batch)
            logger.info(f"Added batch of {len(batch)} documents. Total: {total_added}")
        
        return total_added
    
    async def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query the vector store for similar documents
        
        Args:
            query_text: The query text
            n_results: Number of results to return
            where: Filter on metadata
            where_document: Filter on document content
            
        Returns:
            List of matching document chunks with similarity scores
        """
        # Generate query embedding
        query_embedding = await self._generate_embeddings([query_text])
        
        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where=where,
            where_document=where_document,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        formatted_results = []
        if results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                formatted_results.append({
                    "chunk_id": doc_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "similarity": 1 - results["distances"][0][i] if results["distances"] else 0
                })
        
        return formatted_results
    
    async def delete_documents(
        self,
        document_id: str
    ) -> int:
        """
        Delete all chunks for a document
        
        Args:
            document_id: The document ID to delete
            
        Returns:
            Number of chunks deleted
        """
        # Get all chunk IDs for this document
        results = self.collection.get(
            where={"document_id": document_id},
            include=[]
        )
        
        if not results["ids"]:
            return 0
        
        # Delete chunks
        self.collection.delete(
            ids=results["ids"]
        )
        
        return len(results["ids"])
    
    async def get_document_chunks(
        self,
        document_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all chunks for a document
        """
        results = self.collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"]
        )
        
        chunks = []
        if results["ids"]:
            for i, chunk_id in enumerate(results["ids"]):
                chunks.append({
                    "chunk_id": chunk_id,
                    "content": results["documents"][i] if results["documents"] else "",
                    "metadata": results["metadatas"][i] if results["metadatas"] else {}
                })
        
        return chunks
    
    async def _generate_embeddings(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        """
        Generate embeddings using OpenAI API
        """
        try:
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=texts
            )
            
            return [item.embedding for item in response.data]
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collection"""
        return {
            "total_documents": self.collection.count(),
            "collection_name": self.collection.name
        }
    
    async def similarity_search_with_score(
        self,
        query: str,
        k: int = 5,
        filter_dict: Optional[Dict] = None
    ) -> List[tuple]:
        """
        Compatibility method for langchain-style search
        Returns list of (document, score) tuples
        """
        results = await self.query(
            query_text=query,
            n_results=k,
            where=filter_dict
        )
        
        return [
            ({"content": r["content"], "metadata": r["metadata"]}, r["similarity"])
            for r in results
        ]
