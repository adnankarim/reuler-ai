"""
Retrieval Agent - Handles semantic search and context retrieval
"""

import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI

from .base import BaseAgent, AgentContext

logger = logging.getLogger(__name__)

class RetrievalAgent(BaseAgent):
    """
    Agent responsible for:
    - Semantic search in vector database
    - Context ranking and selection
    - Query expansion for better retrieval
    """
    
    def __init__(self, openai_client: AsyncOpenAI, vector_store):
        super().__init__("RetrievalAgent", openai_client)
        self.vector_store = vector_store
        self.top_k = 8  # Number of chunks to retrieve
        self.rerank_top_k = 5  # After reranking
        
    async def process(self, context: AgentContext) -> AgentContext:
        """
        Retrieve relevant document chunks for the question
        """
        logger.info(f"Retrieval Agent processing: {context.question[:50]}...")
        
        # Step 1: Expand query for better retrieval
        expanded_queries = await self._expand_query(context.question)
        
        # Step 2: Retrieve chunks for all queries
        all_chunks = []
        for query in expanded_queries:
            chunks = await self._retrieve_chunks(
                query=query,
                course_id=context.course_id,
                top_k=self.top_k
            )
            all_chunks.extend(chunks)
        
        # Step 3: Deduplicate and rerank
        unique_chunks = self._deduplicate_chunks(all_chunks)
        reranked_chunks = await self._rerank_chunks(
            context.question, 
            unique_chunks
        )
        
        # Step 4: Select top chunks
        context.retrieved_chunks = reranked_chunks[:self.rerank_top_k]
        context.metadata["retrieval"] = {
            "total_retrieved": len(all_chunks),
            "unique_chunks": len(unique_chunks),
            "final_chunks": len(context.retrieved_chunks),
            "queries_used": expanded_queries
        }
        
        logger.info(f"Retrieved {len(context.retrieved_chunks)} chunks")
        return context
    
    async def _expand_query(self, question: str) -> List[str]:
        """
        Expand the original query into multiple search queries
        for better retrieval coverage
        """
        system_prompt = """You are a query expansion expert. Given a student's question,
generate 2-3 alternative search queries that would help find relevant academic content.
Return ONLY the queries, one per line, no numbering or explanations."""
        
        user_prompt = f"Original question: {question}\n\nGenerate alternative search queries:"
        
        try:
            response = await self._call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
                max_tokens=200
            )
            
            # Parse response into list of queries
            queries = [q.strip() for q in response.strip().split('\n') if q.strip()]
            queries = [question] + queries[:2]  # Original + 2 expansions
            return queries
            
        except Exception as e:
            logger.warning(f"Query expansion failed: {e}, using original query")
            return [question]
    
    async def _retrieve_chunks(
        self,
        query: str,
        course_id: Optional[str],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Retrieve chunks from vector store
        """
        try:
            # Build filter
            where_filter = None
            if course_id:
                where_filter = {"course_id": course_id}
            
            # Query vector store
            results = await self.vector_store.query(
                query_text=query,
                n_results=top_k,
                where=where_filter
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Vector store query failed: {e}")
            return []
    
    def _deduplicate_chunks(
        self, 
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Remove duplicate chunks based on chunk_id
        """
        seen = set()
        unique = []
        for chunk in chunks:
            chunk_id = chunk.get("chunk_id", chunk.get("id", ""))
            if chunk_id not in seen:
                seen.add(chunk_id)
                unique.append(chunk)
        return unique
    
    async def _rerank_chunks(
        self,
        question: str,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rerank chunks based on relevance to the question
        Uses LLM for more accurate ranking
        """
        if not chunks:
            return []
            
        if len(chunks) <= self.rerank_top_k:
            return chunks
        
        # Format chunks for reranking
        chunks_text = "\n\n".join([
            f"[{i}] {chunk.get('content', '')[:500]}"
            for i, chunk in enumerate(chunks)
        ])
        
        system_prompt = """You are a relevance expert. Given a question and numbered text chunks,
rank the chunks by relevance to answering the question.
Return ONLY the chunk numbers in order of relevance, comma-separated.
Example: 2,0,4,1,3"""
        
        user_prompt = f"""Question: {question}

Chunks:
{chunks_text}

Rank by relevance (most relevant first):"""
        
        try:
            response = await self._call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.1,
                max_tokens=100
            )
            
            # Parse ranking
            ranking = [int(x.strip()) for x in response.strip().split(',')]
            
            # Reorder chunks based on ranking
            reranked = []
            for idx in ranking:
                if 0 <= idx < len(chunks):
                    reranked.append(chunks[idx])
            
            # Add any chunks not in ranking
            for chunk in chunks:
                if chunk not in reranked:
                    reranked.append(chunk)
                    
            return reranked
            
        except Exception as e:
            logger.warning(f"Reranking failed: {e}, returning original order")
            return chunks
