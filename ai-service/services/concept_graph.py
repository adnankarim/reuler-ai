"""
Concept Graph Engine - Build and manage concept prerequisite graphs
"""

import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI


class ConceptGraphEngine:
    """Build and query concept graphs from course materials"""
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        self.graphs: Dict[str, Dict] = {}  # In-memory cache (use DB in production)
    
    async def build_from_documents(
        self,
        course_id: str,
        vector_store
    ) -> Dict[str, Any]:
        """Build concept graph from course documents"""
        
        # Get all document chunks, prioritizing syllabus
        syllabus_chunks = await vector_store.get_all_chunks(course_id, doc_type="syllabus")
        notes_chunks = await vector_store.get_all_chunks(course_id, doc_type="notes")
        all_chunks = await vector_store.get_all_chunks(course_id)  # Get all chunks if no specific type
        
        # If no chunks found, raise an error
        total_chunks = len(syllabus_chunks) + len(notes_chunks) + len(all_chunks)
        if total_chunks == 0:
            raise ValueError(f"No documents found for course {course_id}. Please upload documents first.")
        
        # Combine and limit text for LLM
        all_text = ""
        for chunk in syllabus_chunks[:20]:
            all_text += chunk["text"] + "\n\n"
        for chunk in notes_chunks[:30]:
            all_text += chunk["text"] + "\n\n"
        # If still no text, use all chunks
        if not all_text.strip():
            for chunk in all_chunks[:50]:
                all_text += chunk["text"] + "\n\n"
        
        # Use LLM to extract concepts and relationships
        prompt = f"""Analyze the following course material and extract a concept graph.

Course Material:
{all_text[:15000]}

Extract:
1. Key concepts (topics, theories, methods, principles)
2. Prerequisites for each concept (what must be understood first)
3. Difficulty level (1-5, where 1 is introductory and 5 is advanced)

Return a JSON object with this structure:
{{
    "nodes": [
        {{
            "id": "unique_id",
            "name": "Concept Name",
            "description": "Brief description",
            "prerequisites": ["prerequisite_id_1", "prerequisite_id_2"],
            "difficulty": 1-5
        }}
    ]
}}

Focus on the most important concepts (max 30). Ensure prerequisites reference valid node IDs.
Return ONLY valid JSON, no other text."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
            nodes = result.get("nodes", [])
        except json.JSONDecodeError:
            nodes = []
        
        # Build edges from prerequisites
        edges = []
        node_ids = {node["id"] for node in nodes}
        for node in nodes:
            for prereq in node.get("prerequisites", []):
                if prereq in node_ids:
                    edges.append({
                        "source": prereq,
                        "target": node["id"],
                        "from": prereq,  # Also include 'from' for compatibility
                        "to": node["id"],  # Also include 'to' for compatibility
                        "type": "prerequisite",
                        "relationship": "prerequisite"
                    })
        
        # Generate learning paths (topological sort)
        learning_paths = self._generate_learning_paths(nodes, edges)
        
        graph = {
            "nodes": nodes,
            "edges": edges,
            "learning_paths": learning_paths
        }
        
        # Cache the graph
        self.graphs[course_id] = graph
        
        return graph
    
    async def get_graph(self, course_id: str) -> Dict[str, Any]:
        """Get cached concept graph for a course"""
        if course_id in self.graphs:
            return self.graphs[course_id]
        
        # Return empty graph if not built
        return {
            "nodes": [],
            "edges": [],
            "learning_paths": []
        }
    
    def _generate_learning_paths(
        self,
        nodes: List[Dict],
        edges: List[Dict]
    ) -> List[List[str]]:
        """Generate learning paths using topological sort"""
        
        # Build adjacency list
        in_degree = {node["id"]: 0 for node in nodes}
        graph = {node["id"]: [] for node in nodes}
        
        for edge in edges:
            graph[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] += 1
        
        # Find all nodes with no prerequisites (starting points)
        queue = [nid for nid, degree in in_degree.items() if degree == 0]
        
        # Generate paths by difficulty levels
        paths = []
        difficulty_map = {node["id"]: node.get("difficulty", 3) for node in nodes}
        
        # Sort by difficulty
        sorted_nodes = sorted(nodes, key=lambda n: n.get("difficulty", 3))
        
        # Group by difficulty
        difficulty_groups = {}
        for node in sorted_nodes:
            diff = node.get("difficulty", 3)
            if diff not in difficulty_groups:
                difficulty_groups[diff] = []
            difficulty_groups[diff].append(node["id"])
        
        # Create paths for each difficulty level
        for diff in sorted(difficulty_groups.keys()):
            if difficulty_groups[diff]:
                paths.append(difficulty_groups[diff])
        
        return paths
    
    async def get_concept_details(
        self,
        course_id: str,
        concept_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific concept"""
        graph = await self.get_graph(course_id)
        
        for node in graph["nodes"]:
            if node["id"] == concept_id:
                # Find related concepts
                related = []
                for edge in graph["edges"]:
                    if edge["source"] == concept_id:
                        related.append(edge["target"])
                    elif edge["target"] == concept_id:
                        related.append(edge["source"])
                
                return {
                    **node,
                    "related_concepts": related
                }
        
        return None
    
    async def get_next_concepts(
        self,
        course_id: str,
        mastered_concepts: List[str]
    ) -> List[Dict[str, Any]]:
        """Get recommended next concepts based on mastered ones"""
        graph = await self.get_graph(course_id)
        mastered_set = set(mastered_concepts)
        
        next_concepts = []
        
        for node in graph["nodes"]:
            if node["id"] in mastered_set:
                continue
            
            # Check if all prerequisites are mastered
            prereqs = set(node.get("prerequisites", []))
            if prereqs.issubset(mastered_set):
                next_concepts.append(node)
        
        # Sort by difficulty
        next_concepts.sort(key=lambda n: n.get("difficulty", 3))
        
        return next_concepts[:5]  # Return top 5 recommendations
