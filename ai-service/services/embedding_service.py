"""
Embedding Service - Handles text embedding generation using OpenAI
"""

import asyncio
from typing import List, Optional
import hashlib
import json

from openai import AsyncOpenAI
import diskcache


class EmbeddingService:
    """Service for generating and caching text embeddings"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
        cache_dir: str = "/app/data/embedding_cache"
    ):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        self.cache = diskcache.Cache(cache_dir)
        self.embedding_dim = 1536  # For text-embedding-3-small
        
    def _cache_key(self, text: str) -> str:
        """Generate cache key for text"""
        return hashlib.md5(f"{self.model}:{text}".encode()).hexdigest()
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        cache_key = self._cache_key(text)
        
        # Check cache first
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        response = await self.client.embeddings.create(
            model=self.model,
            input=text
        )
        
        embedding = response.data[0].embedding
        
        # Cache the result
        self.cache[cache_key] = embedding
        
        return embedding
    
    async def embed_texts(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """Generate embeddings for multiple texts with batching"""
        embeddings = []
        uncached_texts = []
        uncached_indices = []
        
        # Check cache for each text
        for i, text in enumerate(texts):
            cache_key = self._cache_key(text)
            if cache_key in self.cache:
                embeddings.append(self.cache[cache_key])
            else:
                embeddings.append(None)
                uncached_texts.append(text)
                uncached_indices.append(i)
        
        # Batch embed uncached texts
        for i in range(0, len(uncached_texts), batch_size):
            batch = uncached_texts[i:i + batch_size]
            batch_indices = uncached_indices[i:i + batch_size]
            
            response = await self.client.embeddings.create(
                model=self.model,
                input=batch
            )
            
            for j, data in enumerate(response.data):
                idx = batch_indices[j]
                embedding = data.embedding
                embeddings[idx] = embedding
                
                # Cache the result
                cache_key = self._cache_key(batch[j])
                self.cache[cache_key] = embedding
        
        return embeddings
    
    async def similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        import numpy as np
        
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))
