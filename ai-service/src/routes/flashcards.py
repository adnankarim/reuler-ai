"""
Flashcards API Routes
Handles flashcard generation from course materials
"""

import os
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import json

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory flashcard storage
flashcard_decks_db = {}

class FlashcardRequest(BaseModel):
    document_ids: List[str]
    topics: List[str] = []
    count: int = 10
    difficulty: str = "mixed"  # easy, medium, hard, mixed

def get_services():
    from main import get_vector_store, get_cache_service
    return get_vector_store(), get_cache_service()

@router.post("/generate")
async def generate_flashcards(request: FlashcardRequest):
    """Generate flashcards from course materials"""
    
    vector_store, _ = get_services()
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Validate count
    if request.count < 1 or request.count > 50:
        raise HTTPException(status_code=400, detail="Card count must be between 1 and 50")
    
    # Retrieve relevant chunks
    all_chunks = []
    
    for doc_id in request.document_ids:
        chunks = await vector_store.get_document_chunks(doc_id)
        all_chunks.extend(chunks)
    
    if not all_chunks:
        raise HTTPException(status_code=404, detail="No content found for specified documents")
    
    # If topics specified, get relevant chunks
    if request.topics:
        topic_query = " ".join(request.topics)
        relevant_chunks = await vector_store.query(
            query_text=topic_query,
            n_results=20
        )
        all_chunks = relevant_chunks if relevant_chunks else all_chunks
    
    # Combine content
    content = "\n\n".join([c.get("content", "") for c in all_chunks[:20]])
    
    difficulty_instructions = {
        "easy": "Focus on basic definitions and simple recall questions.",
        "medium": "Include application questions and concept comparisons.",
        "hard": "Focus on synthesis, analysis, and complex problem-solving.",
        "mixed": "Include a mix of easy (30%), medium (40%), and hard (30%) questions."
    }
    
    system_prompt = f"""You are an expert flashcard creator for university students.
Create effective study flashcards based on academic content.

DIFFICULTY LEVEL: {request.difficulty}
{difficulty_instructions.get(request.difficulty, difficulty_instructions["mixed"])}

FLASHCARD BEST PRACTICES:
- Keep questions clear and specific
- Answers should be concise but complete
- Test understanding, not just memorization
- Include variety in question types

OUTPUT FORMAT (JSON):
{{
    "cards": [
        {{
            "front": "Question or prompt",
            "back": "Answer",
            "difficulty": "easy|medium|hard",
            "topic": "Topic name",
            "hint": "Optional hint"
        }}
    ]
}}

Generate exactly {request.count} flashcards."""

    user_prompt = f"""Create {request.count} flashcards from this academic content:

TOPICS TO FOCUS ON: {', '.join(request.topics) if request.topics else 'All topics'}

CONTENT:
{content[:12000]}

Generate the flashcards:"""

    try:
        response = await openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,
            max_tokens=3000
        )
        
        result_text = response.choices[0].message.content
        
        # Parse JSON
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        flashcard_data = json.loads(result_text.strip())
        cards = flashcard_data.get("cards", [])
        
        # Generate deck ID and card IDs
        deck_id = f"deck_{uuid.uuid4().hex[:8]}"
        formatted_cards = []
        
        for i, card in enumerate(cards):
            formatted_cards.append({
                "cardId": f"card_{uuid.uuid4().hex[:6]}",
                "front": card.get("front", ""),
                "back": card.get("back", ""),
                "difficulty": card.get("difficulty", "medium"),
                "topic": card.get("topic", "General"),
                "hint": card.get("hint"),
                "sourceRef": request.document_ids[0] if request.document_ids else None
            })
        
        # Store deck
        deck = {
            "deckId": deck_id,
            "title": f"{'_'.join(request.topics[:2]) if request.topics else 'Course'} Flashcards",
            "cards": formatted_cards,
            "generatedAt": datetime.utcnow().isoformat(),
            "documentIds": request.document_ids
        }
        
        flashcard_decks_db[deck_id] = deck
        
        return {
            "success": True,
            "data": deck
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse flashcard response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate flashcards")
    except Exception as e:
        logger.error(f"Flashcard generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/deck/{deck_id}")
async def get_flashcard_deck(deck_id: str):
    """Get a flashcard deck by ID"""
    
    if deck_id not in flashcard_decks_db:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")
    
    return {
        "success": True,
        "data": flashcard_decks_db[deck_id]
    }

@router.get("/decks")
async def list_flashcard_decks():
    """List all flashcard decks"""
    
    decks = [
        {
            "deckId": d["deckId"],
            "title": d["title"],
            "cardCount": len(d["cards"]),
            "generatedAt": d["generatedAt"]
        }
        for d in flashcard_decks_db.values()
    ]
    
    return {
        "success": True,
        "data": {
            "decks": decks,
            "total": len(decks)
        }
    }

@router.delete("/deck/{deck_id}")
async def delete_flashcard_deck(deck_id: str):
    """Delete a flashcard deck"""
    
    if deck_id not in flashcard_decks_db:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")
    
    del flashcard_decks_db[deck_id]
    
    return {
        "success": True,
        "message": "Flashcard deck deleted"
    }

@router.post("/deck/{deck_id}/study")
async def record_study_session(deck_id: str, correct_cards: List[str], incorrect_cards: List[str]):
    """Record a study session for spaced repetition"""
    
    if deck_id not in flashcard_decks_db:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")
    
    # In a real implementation, this would update spaced repetition intervals
    # For MVP, we just return basic stats
    
    total = len(correct_cards) + len(incorrect_cards)
    accuracy = len(correct_cards) / total if total > 0 else 0
    
    return {
        "success": True,
        "data": {
            "deckId": deck_id,
            "cardsStudied": total,
            "correct": len(correct_cards),
            "incorrect": len(incorrect_cards),
            "accuracy": round(accuracy * 100, 1),
            "recommendation": "Great job!" if accuracy >= 0.8 else "Review the incorrect cards again"
        }
    }
