"""
Study Material Generator - Generate summaries, flashcards, exams, and bibliography
"""

import json
import uuid
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI


class StudyMaterialGenerator:
    """Generate study materials from course content"""
    
    def __init__(self, api_key: str, model: str, vector_store):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        self.vector_store = vector_store
    
    async def generate_summary(
        self,
        course_id: str,
        topics: Optional[List[str]] = None,
        format: str = "structured"
    ) -> Dict[str, Any]:
        """Generate exam-ready summary"""
        
        # Get relevant chunks
        chunks = await self.vector_store.get_all_chunks(course_id)
        
        if topics:
            # Filter by topics (simple keyword matching)
            chunks = [
                c for c in chunks 
                if any(t.lower() in c["text"].lower() for t in topics)
            ]
        
        # Combine text
        combined_text = "\n\n".join([c["text"] for c in chunks[:50]])
        
        prompt = f"""Create a comprehensive study summary from the following course material.

Course Material:
{combined_text[:12000]}

Generate a {format} summary that is exam-ready. Include:
1. Key concepts and definitions
2. Important relationships between concepts
3. Common examples and applications
4. Critical formulas or principles (if applicable)
5. Study tips and mnemonics

Format Requirements:
- If structured: Use clear sections with headers
- If bullet: Use concise bullet points
- If narrative: Write flowing paragraphs

Return a JSON object with:
{{
    "summary": "The formatted summary text",
    "key_concepts": ["concept1", "concept2", ...],
    "study_tips": ["tip1", "tip2", ...],
    "bibliography": [
        {{"title": "Source Title", "page": 1, "type": "textbook"}}
    ]
}}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            result = {
                "summary": response.choices[0].message.content,
                "key_concepts": [],
                "study_tips": [],
                "bibliography": []
            }
        
        return result
    
    async def generate_flashcards(
        self,
        course_id: str,
        topics: Optional[List[str]] = None,
        count: int = 20,
        difficulty: str = "mixed",
        avoid_duplicates: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate flashcards from course material"""
        
        chunks = await self.vector_store.get_all_chunks(course_id)
        
        if topics:
            chunks = [
                c for c in chunks 
                if any(t.lower() in c["text"].lower() for t in topics)
            ]
        
        combined_text = "\n\n".join([c["text"] for c in chunks[:40]])
        
        difficulty_instruction = ""
        if difficulty == "easy":
            difficulty_instruction = "Focus on basic definitions and simple concepts."
        elif difficulty == "hard":
            difficulty_instruction = "Focus on complex relationships, edge cases, and advanced applications."
        elif difficulty == "mixed":
            difficulty_instruction = "Include a mix of easy, medium, and hard questions."
        
        avoid_text = ""
        if avoid_duplicates:
            avoid_text = f"\n\nIMPORTANT: Avoid creating flashcards similar to these existing ones:\n" + "\n".join(avoid_duplicates[:20]) + "\n\nCreate NEW and UNIQUE flashcards that don't repeat these concepts."
        
        prompt = f"""Create {count} flashcards from the following course material.

Course Material:
{combined_text[:10000]}

{difficulty_instruction}
{avoid_text}

Each flashcard should:
1. Have a clear, specific question on the front
2. Have a concise but complete answer on the back
3. Test understanding, not just memorization
4. Include the source topic
5. Be unique and not duplicate existing flashcards

Return a JSON object with:
{{
    "flashcards": [
        {{
            "id": "unique_id",
            "front": "Question or prompt",
            "back": "Answer or explanation",
            "topic": "Related topic",
            "difficulty": "easy|medium|hard",
            "source": "Source reference"
        }}
    ]
}}

Generate exactly {count} flashcards."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
            flashcards = result.get("flashcards", [])
        except json.JSONDecodeError:
            flashcards = []
        
        # Ensure IDs are unique
        for i, card in enumerate(flashcards):
            if not card.get("id"):
                card["id"] = str(uuid.uuid4())
        
        return {
            "flashcards": flashcards,
            "total_count": len(flashcards)
        }
    
    async def generate_exam(
        self,
        course_id: str,
        topics: Optional[List[str]] = None,
        question_count: int = 10,
        question_types: List[str] = ["multiple_choice", "short_answer", "essay"],
        difficulty: str = "mixed",
        avoid_duplicates: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate a practice exam"""
        
        chunks = await self.vector_store.get_all_chunks(course_id)
        
        if topics:
            chunks = [
                c for c in chunks 
                if any(t.lower() in c["text"].lower() for t in topics)
            ]
        
        combined_text = "\n\n".join([c["text"] for c in chunks[:50]])
        
        types_str = ", ".join(question_types)
        
        avoid_text = ""
        if avoid_duplicates:
            avoid_text = f"\n\nIMPORTANT: Avoid creating questions similar to these existing ones:\n" + "\n".join(avoid_duplicates[:20]) + "\n\nCreate NEW and UNIQUE questions that don't repeat these concepts."
        
        avoid_text = ""
        if avoid_duplicates:
            avoid_text = f"\n\nIMPORTANT: Avoid creating questions similar to these existing ones:\n" + "\n".join(avoid_duplicates[:20]) + "\n\nCreate NEW and UNIQUE questions that don't repeat these concepts."
        
        prompt = f"""Create a practice exam from the following course material.

Course Material:
{combined_text[:12000]}
{avoid_text}

Exam Requirements:
- Total questions: {question_count}
- Question types: {types_str}
- Difficulty: {difficulty}

For each question type:
- multiple_choice: 4 options, one correct
- short_answer: Requires 1-3 sentence response
- essay: Requires detailed explanation

Return a JSON object with:
{{
    "title": "Practice Exam Title",
    "questions": [
        {{
            "id": "q1",
            "type": "multiple_choice|short_answer|essay",
            "question": "The question text",
            "options": ["A", "B", "C", "D"] or null,
            "correct_answer": "The correct answer",
            "explanation": "Why this is correct",
            "topic": "Related topic",
            "difficulty": "easy|medium|hard",
            "points": 5-20 based on difficulty
        }}
    ],
    "time_limit_minutes": 60
}}

Distribute questions evenly across types where possible."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            result = {
                "title": "Practice Exam",
                "questions": [],
                "time_limit_minutes": 60
            }
        
        # Calculate total points
        total_points = sum(q.get("points", 10) for q in result.get("questions", []))
        
        return {
            "exam_id": str(uuid.uuid4()),
            "title": result.get("title", "Practice Exam"),
            "questions": result.get("questions", []),
            "total_points": total_points,
            "time_limit_minutes": result.get("time_limit_minutes", 60)
        }
    
    async def generate_bibliography(
        self,
        course_id: str,
        format: str = "apa"
    ) -> Dict[str, Any]:
        """Generate bibliography from course documents"""
        
        documents = await self.vector_store.get_documents(course_id)
        
        entries = []
        for doc in documents:
            title = doc.get("title", "Unknown Title")
            doc_type = doc.get("doc_type", "document")
            
            if format == "apa":
                # Basic APA format
                entry = f"Author. (Year). {title}. Publisher."
            elif format == "bibtex":
                # BibTeX format
                cite_key = title.replace(" ", "_")[:20].lower()
                entry = f"@{doc_type}{{{cite_key},\n  title = {{{title}}},\n  author = {{Author}},\n  year = {{Year}}\n}}"
            elif format == "mla":
                # MLA format
                entry = f'Author. "{title}." Publisher, Year.'
            elif format == "chicago":
                # Chicago format
                entry = f"Author. {title}. Place: Publisher, Year."
            else:
                entry = title
            
            entries.append(entry)
        
        return {
            "entries": entries,
            "format": format
        }
