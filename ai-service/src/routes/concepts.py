"""
Concepts API Routes
Handles concept graph generation and retrieval
"""

import os
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import json

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory concept storage
concepts_db = {}

def get_services():
    from main import get_vector_store, get_cache_service
    return get_vector_store(), get_cache_service()

@router.get("/graph/{course_id}")
async def get_concept_graph(course_id: str):
    """Get the concept graph for a course"""
    
    vector_store, cache_service = get_services()
    
    # Check cache first
    if cache_service:
        cached_graph = await cache_service.get_cached_concept_graph(course_id)
        if cached_graph:
            # Build graph structure
            concepts = cached_graph.get("concepts", [])
            
            nodes = []
            edges = []
            
            for i, concept in enumerate(concepts):
                node_id = f"concept_{i}"
                nodes.append({
                    "id": node_id,
                    "name": concept.get("name", ""),
                    "description": concept.get("description", ""),
                    "mastery": 0.0,
                    "documentRefs": concept.get("document_refs", []),
                    "difficulty": concept.get("difficulty", "intermediate")
                })
                
                # Create prerequisite edges
                for prereq in concept.get("prerequisites", []):
                    # Find prerequisite node
                    for j, other in enumerate(concepts):
                        if other.get("name", "").lower() == prereq.lower():
                            edges.append({
                                "from": f"concept_{j}",
                                "to": node_id,
                                "relationship": "prerequisite",
                                "strength": 0.8
                            })
                            break
            
            return {
                "success": True,
                "data": {
                    "courseId": course_id,
                    "nodes": nodes,
                    "edges": edges,
                    "metadata": {
                        "totalConcepts": len(nodes),
                        "avgMastery": 0.0,
                        "lastUpdated": cached_graph.get("updated_at")
                    }
                }
            }
    
    # No cached graph found
    return {
        "success": True,
        "data": {
            "courseId": course_id,
            "nodes": [],
            "edges": [],
            "metadata": {
                "totalConcepts": 0,
                "message": "No concepts extracted yet. Upload course materials to generate concept graph."
            }
        }
    }

@router.post("/graph/{course_id}/generate")
async def generate_concept_graph(course_id: str):
    """
    Generate or regenerate concept graph from course materials
    """
    
    vector_store, cache_service = get_services()
    
    # Get all chunks for the course
    try:
        chunks = await vector_store.query(
            query_text="course concepts topics learning objectives",
            n_results=30,
            where={"course_id": course_id}
        )
        
        if not chunks:
            raise HTTPException(
                status_code=404,
                detail="No course materials found. Upload documents first."
            )
        
        # Use LLM to extract concepts
        openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Combine chunk content
        content = "\n\n".join([c.get("content", "") for c in chunks])[:12000]
        
        system_prompt = """You are an expert at analyzing academic course content and extracting key concepts.
Analyze the provided course material and extract:
1. Key concepts/topics covered
2. Prerequisites for each concept
3. Difficulty level (beginner/intermediate/advanced)
4. Connections between concepts

OUTPUT FORMAT (JSON):
{
    "concepts": [
        {
            "name": "Concept Name",
            "description": "Brief description of the concept",
            "prerequisites": ["prerequisite1", "prerequisite2"],
            "difficulty": "beginner|intermediate|advanced",
            "related_concepts": ["related1", "related2"]
        }
    ]
}

Extract 15-30 key concepts that represent the main learning objectives."""

        user_prompt = f"""Analyze this course material and extract key concepts:

{content}

Course ID: {course_id}

Extract the concept graph:"""

        response = await openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=3000
        )
        
        result_text = response.choices[0].message.content
        
        # Parse JSON
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        result = json.loads(result_text.strip())
        concepts = result.get("concepts", [])
        
        # Cache the graph
        if cache_service:
            await cache_service.cache_concept_graph(
                course_id=course_id,
                graph_data={
                    "course_id": course_id,
                    "concepts": concepts
                }
            )
        
        # Build response
        nodes = []
        edges = []
        
        for i, concept in enumerate(concepts):
            node_id = f"concept_{i}"
            nodes.append({
                "id": node_id,
                "name": concept.get("name", ""),
                "description": concept.get("description", ""),
                "mastery": 0.0,
                "difficulty": concept.get("difficulty", "intermediate")
            })
            
            # Create edges for prerequisites
            for prereq in concept.get("prerequisites", []):
                for j, other in enumerate(concepts):
                    if other.get("name", "").lower() == prereq.lower():
                        edges.append({
                            "from": f"concept_{j}",
                            "to": node_id,
                            "relationship": "prerequisite",
                            "strength": 0.9
                        })
                        break
            
            # Create edges for related concepts
            for related in concept.get("related_concepts", []):
                for j, other in enumerate(concepts):
                    if other.get("name", "").lower() == related.lower() and i != j:
                        edges.append({
                            "from": node_id,
                            "to": f"concept_{j}",
                            "relationship": "related",
                            "strength": 0.6
                        })
                        break
        
        return {
            "success": True,
            "data": {
                "courseId": course_id,
                "nodes": nodes,
                "edges": edges,
                "metadata": {
                    "totalConcepts": len(nodes),
                    "totalEdges": len(edges),
                    "generated": True
                }
            }
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse concept graph response: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse concept extraction")
    except Exception as e:
        logger.error(f"Concept graph generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/mastery/{course_id}/{concept_id}")
async def update_concept_mastery(course_id: str, concept_id: str, mastery: float):
    """Update mastery level for a concept"""
    
    if mastery < 0 or mastery > 1:
        raise HTTPException(status_code=400, detail="Mastery must be between 0 and 1")
    
    vector_store, cache_service = get_services()
    
    if cache_service:
        graph = await cache_service.get_cached_concept_graph(course_id)
        if graph:
            concepts = graph.get("concepts", [])
            # Extract index from concept_id
            try:
                idx = int(concept_id.replace("concept_", ""))
                if 0 <= idx < len(concepts):
                    concepts[idx]["mastery"] = mastery
                    await cache_service.cache_concept_graph(course_id, graph)
                    return {"success": True, "message": "Mastery updated"}
            except (ValueError, IndexError):
                pass
    
    raise HTTPException(status_code=404, detail="Concept not found")
