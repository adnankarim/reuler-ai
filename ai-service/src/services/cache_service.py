"""
Cache Service - SQLite-based caching for offline support
"""

import os
import json
import hashlib
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import aiosqlite

logger = logging.getLogger(__name__)

class CacheService:
    """
    SQLite-based cache for:
    - Query response caching
    - Embedding caching
    - Concept graph caching
    """
    
    def __init__(self, db_path: str = "./cache/reuler_ai.db"):
        self.db_path = db_path
        self.db = None
        self.default_ttl = timedelta(hours=24)
        
    async def initialize(self):
        """Initialize the cache database"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        # Connect to database
        self.db = await aiosqlite.connect(self.db_path)
        
        # Create tables
        await self._create_tables()
        
        logger.info(f"Cache service initialized at {self.db_path}")
    
    async def _create_tables(self):
        """Create cache tables"""
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS query_cache (
                cache_key TEXT PRIMARY KEY,
                response TEXT NOT NULL,
                course_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                hit_count INTEGER DEFAULT 0
            )
        """)
        
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS embedding_cache (
                text_hash TEXT PRIMARY KEY,
                embedding TEXT NOT NULL,
                model TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS concept_graph_cache (
                course_id TEXT PRIMARY KEY,
                graph_data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_query_cache_course 
            ON query_cache(course_id)
        """)
        
        await self.db.commit()
    
    async def close(self):
        """Close database connection"""
        if self.db:
            await self.db.close()
            logger.info("Cache service closed")
    
    # Query Cache Methods
    
    def _generate_cache_key(self, query: str, course_id: Optional[str] = None) -> str:
        """Generate a unique cache key for a query"""
        key_string = f"{query}:{course_id or 'all'}"
        return hashlib.sha256(key_string.encode()).hexdigest()[:32]
    
    async def get_cached_response(
        self,
        query: str,
        course_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a cached response for a query"""
        cache_key = self._generate_cache_key(query, course_id)
        
        cursor = await self.db.execute(
            """SELECT response, expires_at FROM query_cache 
               WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > ?)""",
            (cache_key, datetime.utcnow())
        )
        row = await cursor.fetchone()
        
        if row:
            # Update hit count
            await self.db.execute(
                "UPDATE query_cache SET hit_count = hit_count + 1 WHERE cache_key = ?",
                (cache_key,)
            )
            await self.db.commit()
            
            logger.debug(f"Cache hit for query: {query[:50]}...")
            return json.loads(row[0])
        
        return None
    
    async def cache_response(
        self,
        query: str,
        response: Dict[str, Any],
        course_id: Optional[str] = None,
        ttl: Optional[timedelta] = None
    ):
        """Cache a query response"""
        cache_key = self._generate_cache_key(query, course_id)
        ttl = ttl or self.default_ttl
        expires_at = datetime.utcnow() + ttl
        
        await self.db.execute(
            """INSERT OR REPLACE INTO query_cache 
               (cache_key, response, course_id, expires_at) 
               VALUES (?, ?, ?, ?)""",
            (cache_key, json.dumps(response), course_id, expires_at)
        )
        await self.db.commit()
        
        logger.debug(f"Cached response for query: {query[:50]}...")
    
    # Embedding Cache Methods
    
    def _hash_text(self, text: str) -> str:
        """Generate hash for text"""
        return hashlib.sha256(text.encode()).hexdigest()
    
    async def get_cached_embedding(self, text: str) -> Optional[list]:
        """Get a cached embedding for text"""
        text_hash = self._hash_text(text)
        
        cursor = await self.db.execute(
            "SELECT embedding FROM embedding_cache WHERE text_hash = ?",
            (text_hash,)
        )
        row = await cursor.fetchone()
        
        if row:
            return json.loads(row[0])
        return None
    
    async def cache_embedding(
        self,
        text: str,
        embedding: list,
        model: str = "text-embedding-ada-002"
    ):
        """Cache an embedding"""
        text_hash = self._hash_text(text)
        
        await self.db.execute(
            """INSERT OR REPLACE INTO embedding_cache 
               (text_hash, embedding, model) 
               VALUES (?, ?, ?)""",
            (text_hash, json.dumps(embedding), model)
        )
        await self.db.commit()
    
    async def get_cached_embeddings_batch(
        self,
        texts: list
    ) -> Dict[str, Optional[list]]:
        """Get cached embeddings for multiple texts"""
        results = {}
        for text in texts:
            results[text] = await self.get_cached_embedding(text)
        return results
    
    # Concept Graph Cache Methods
    
    async def get_cached_concept_graph(
        self,
        course_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached concept graph for a course"""
        cursor = await self.db.execute(
            "SELECT graph_data FROM concept_graph_cache WHERE course_id = ?",
            (course_id,)
        )
        row = await cursor.fetchone()
        
        if row:
            return json.loads(row[0])
        return None
    
    async def cache_concept_graph(
        self,
        course_id: str,
        graph_data: Dict[str, Any]
    ):
        """Cache a concept graph"""
        await self.db.execute(
            """INSERT OR REPLACE INTO concept_graph_cache 
               (course_id, graph_data, updated_at) 
               VALUES (?, ?, ?)""",
            (course_id, json.dumps(graph_data), datetime.utcnow())
        )
        await self.db.commit()
    
    # Cache Management Methods
    
    async def clear_expired(self):
        """Clear expired cache entries"""
        await self.db.execute(
            "DELETE FROM query_cache WHERE expires_at < ?",
            (datetime.utcnow(),)
        )
        await self.db.commit()
        logger.info("Cleared expired cache entries")
    
    async def clear_course_cache(self, course_id: str):
        """Clear all cache entries for a course"""
        await self.db.execute(
            "DELETE FROM query_cache WHERE course_id = ?",
            (course_id,)
        )
        await self.db.execute(
            "DELETE FROM concept_graph_cache WHERE course_id = ?",
            (course_id,)
        )
        await self.db.commit()
        logger.info(f"Cleared cache for course: {course_id}")
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        cursor = await self.db.execute(
            "SELECT COUNT(*) FROM query_cache"
        )
        query_count = (await cursor.fetchone())[0]
        
        cursor = await self.db.execute(
            "SELECT COUNT(*) FROM embedding_cache"
        )
        embedding_count = (await cursor.fetchone())[0]
        
        cursor = await self.db.execute(
            "SELECT COUNT(*) FROM concept_graph_cache"
        )
        graph_count = (await cursor.fetchone())[0]
        
        cursor = await self.db.execute(
            "SELECT SUM(hit_count) FROM query_cache"
        )
        total_hits = (await cursor.fetchone())[0] or 0
        
        return {
            "query_cache_entries": query_count,
            "embedding_cache_entries": embedding_count,
            "concept_graph_entries": graph_count,
            "total_cache_hits": total_hits
        }
