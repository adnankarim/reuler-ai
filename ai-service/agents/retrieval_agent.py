"""
Retrieval Agent - Handles semantic search and context retrieval
"""

from typing import List, Dict, Any

from .base import AgentContext


class RetrievalAgent:
    """
    Agent responsible for retrieving relevant content from the vector store.
    Uses semantic search and relevance ranking.
    """
    
    def __init__(self, vector_store, embedding_service):
        self.vector_store = vector_store
        self.embedding_service = embedding_service
        self.top_k = 10  # Number of chunks to retrieve
        self.min_score = 0.5  # Minimum relevance score
    
    async def process(self, context: AgentContext) -> AgentContext:
        """
        Retrieve relevant chunks for the question.
        
        Steps:
        1. Generate query embedding
        2. Search vector store
        3. Rank and filter results
        4. Extract related concepts
        """
        
        # Search for relevant chunks
        import structlog
        logger = structlog.get_logger()
        
        logger.info("Retrieval agent searching", 
                   question=context.question[:50], 
                   course_id=context.course_id)
        
        results = await self.vector_store.search(
            query=context.question,
            course_id=context.course_id,
            limit=self.top_k,
            embedding_service=self.embedding_service
        )
        
        logger.info("Retrieval results", 
                   results_count=len(results),
                   course_id=context.course_id)
        
        # Filter by minimum score
        filtered_results = [
            r for r in results 
            if r.get("score", 0) >= self.min_score
        ]
        
        # If no results meet threshold, use top 3 anyway
        if not filtered_results and results:
            filtered_results = results[:3]
        
        # If still no results, log warning
        if not filtered_results:
            logger.warning("No chunks retrieved", 
                         course_id=context.course_id,
                         question=context.question[:50])
        
        context.retrieved_chunks = filtered_results
        
        # Calculate initial curriculum alignment based on retrieval quality
        if filtered_results:
            avg_score = sum(r.get("score", 0) for r in filtered_results) / len(filtered_results)
            context.curriculum_alignment = min(avg_score, 1.0)
        else:
            context.curriculum_alignment = 0.0
        
        # Extract related concepts from metadata
        context.related_concepts = self._extract_concepts(filtered_results)
        
        return context
    
    def _extract_concepts(self, results: List[Dict[str, Any]]) -> List[str]:
        """Extract unique concepts/topics from retrieved chunks"""
        concepts = set()
        
        for result in results:
            metadata = result.get("metadata", {})
            
            # Extract from document title
            title = metadata.get("document_title", "")
            if title:
                # Simple extraction: use title parts as concepts
                parts = title.replace(".pdf", "").replace("_", " ").split()
                for part in parts:
                    if len(part) > 3:  # Skip short words
                        concepts.add(part.title())
            
            # Extract from doc_type
            doc_type = metadata.get("doc_type", "")
            if doc_type:
                concepts.add(doc_type.title())
        
        return list(concepts)[:10]
    
    async def expand_query(self, query: str) -> List[str]:
        """
        Expand query with synonyms and related terms.
        Can be used for multi-query retrieval.
        """
        # Simple expansion - in production, use LLM
        expansions = [query]
        
        # Add variations
        if "what is" in query.lower():
            expansions.append(query.lower().replace("what is", "definition of"))
        if "how" in query.lower():
            expansions.append(query.lower().replace("how", "the process of"))
        
        return expansions
