"""
Exams API Routes
Handles exam generation and simulation
"""

import os
import uuid
import logging
from typing import List, Dict, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import json

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory exam storage
exams_db = {}
submissions_db = {}

class ExamRequest(BaseModel):
    course_id: str
    topics: List[str] = []
    question_count: int = 20
    time_limit: int = 60  # minutes
    question_types: List[str] = ["multiple-choice"]  # multiple-choice, short-answer, coding, true-false

class ExamSubmission(BaseModel):
    answers: Dict[str, str]
    time_taken: int  # minutes

def get_services():
    from main import get_vector_store, get_cache_service
    return get_vector_store(), get_cache_service()

@router.post("/generate")
async def generate_exam(request: ExamRequest):
    """Generate a practice exam from course materials"""
    
    vector_store, _ = get_services()
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Validate
    if request.question_count < 1 or request.question_count > 50:
        raise HTTPException(status_code=400, detail="Question count must be between 1 and 50")
    
    # Retrieve relevant content
    if request.topics:
        topic_query = " ".join(request.topics)
    else:
        topic_query = "exam important concepts key topics"
    
    chunks = await vector_store.query(
        query_text=topic_query,
        n_results=25,
        where={"course_id": request.course_id} if request.course_id else None
    )
    
    if not chunks:
        # Try without filter
        chunks = await vector_store.query(
            query_text=topic_query,
            n_results=25
        )
    
    if not chunks:
        raise HTTPException(status_code=404, detail="No course materials found")
    
    content = "\n\n".join([c.get("content", "") for c in chunks])
    
    # Build question type distribution
    type_distribution = {}
    total_types = len(request.question_types)
    base_count = request.question_count // total_types
    
    for i, qt in enumerate(request.question_types):
        type_distribution[qt] = base_count
        if i < request.question_count % total_types:
            type_distribution[qt] += 1
    
    system_prompt = f"""You are an expert exam creator for university courses.
Create a practice exam based on the course content provided.

QUESTION TYPE DISTRIBUTION:
{json.dumps(type_distribution, indent=2)}

QUESTION FORMAT GUIDELINES:
- Multiple-choice: 4 options (A, B, C, D), exactly one correct
- Short-answer: Clear question requiring 1-3 sentence response
- True-false: Statement that is definitively true or false
- Coding: Small coding problem with clear requirements

OUTPUT FORMAT (JSON):
{{
    "title": "Practice Exam Title",
    "questions": [
        {{
            "type": "multiple-choice",
            "question": "Question text",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correct_answer": "A",
            "explanation": "Why this is correct",
            "points": 5,
            "topic": "Topic name",
            "difficulty": "easy|medium|hard"
        }},
        {{
            "type": "short-answer",
            "question": "Question text",
            "correct_answer": "Expected answer",
            "explanation": "Grading criteria",
            "points": 10,
            "topic": "Topic name",
            "difficulty": "medium"
        }}
    ]
}}

Create exactly {request.question_count} questions with varied difficulty."""

    user_prompt = f"""Create a practice exam from this course content:

COURSE ID: {request.course_id}
TOPICS TO COVER: {', '.join(request.topics) if request.topics else 'All topics'}
TIME LIMIT: {request.time_limit} minutes

COURSE CONTENT:
{content[:12000]}

Generate the exam:"""

    try:
        response = await openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,
            max_tokens=4000
        )
        
        result_text = response.choices[0].message.content
        
        # Parse JSON
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        exam_data = json.loads(result_text.strip())
        
        # Generate exam ID and format questions
        exam_id = f"exam_{uuid.uuid4().hex[:8]}"
        questions = []
        
        for i, q in enumerate(exam_data.get("questions", [])):
            question_id = f"q_{uuid.uuid4().hex[:6]}"
            
            # Store correct answer separately (don't send to student)
            questions.append({
                "questionId": question_id,
                "type": q.get("type", "multiple-choice"),
                "question": q.get("question", ""),
                "options": q.get("options") if q.get("type") == "multiple-choice" else None,
                "points": q.get("points", 5),
                "topic": q.get("topic", "General"),
                "difficulty": q.get("difficulty", "medium"),
                # Hidden from student response
                "_correct_answer": q.get("correct_answer"),
                "_explanation": q.get("explanation")
            })
        
        # Calculate max score
        max_score = sum(q.get("points", 5) for q in questions)
        
        # Store exam with answers
        exam = {
            "examId": exam_id,
            "title": exam_data.get("title", f"Practice Exam - {request.course_id}"),
            "courseId": request.course_id,
            "timeLimit": request.time_limit,
            "questions": questions,
            "maxScore": max_score,
            "createdAt": datetime.utcnow().isoformat()
        }
        
        exams_db[exam_id] = exam
        
        # Return exam without answers
        return {
            "success": True,
            "data": {
                "examId": exam_id,
                "title": exam["title"],
                "timeLimit": request.time_limit,
                "questions": [
                    {
                        "questionId": q["questionId"],
                        "type": q["type"],
                        "question": q["question"],
                        "options": q.get("options"),
                        "points": q["points"],
                        "topic": q["topic"]
                    }
                    for q in questions
                ],
                "totalQuestions": len(questions),
                "maxScore": max_score,
                "createdAt": exam["createdAt"]
            }
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse exam response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate exam")
    except Exception as e:
        logger.error(f"Exam generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{exam_id}/submit")
async def submit_exam(exam_id: str, submission: ExamSubmission):
    """Submit exam answers and get results"""
    
    if exam_id not in exams_db:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    exam = exams_db[exam_id]
    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Grade the exam
    results = []
    total_score = 0
    topics_performance = {}
    
    for question in exam["questions"]:
        q_id = question["questionId"]
        student_answer = submission.answers.get(q_id, "")
        correct_answer = question.get("_correct_answer", "")
        topic = question.get("topic", "General")
        
        # Initialize topic tracking
        if topic not in topics_performance:
            topics_performance[topic] = {"correct": 0, "total": 0, "points": 0, "max_points": 0}
        
        topics_performance[topic]["total"] += 1
        topics_performance[topic]["max_points"] += question.get("points", 5)
        
        # Grade based on question type
        if question["type"] == "multiple-choice" or question["type"] == "true-false":
            # Exact match for MC and T/F
            is_correct = student_answer.strip().upper() == correct_answer.strip().upper()
        else:
            # Use LLM to grade short-answer questions
            is_correct = await grade_short_answer(
                openai_client,
                question["question"],
                correct_answer,
                student_answer
            )
        
        points = question.get("points", 5) if is_correct else 0
        total_score += points
        
        if is_correct:
            topics_performance[topic]["correct"] += 1
            topics_performance[topic]["points"] += points
        
        results.append({
            "questionId": q_id,
            "correct": is_correct,
            "studentAnswer": student_answer,
            "correctAnswer": correct_answer,
            "explanation": question.get("_explanation", ""),
            "pointsEarned": points,
            "pointsPossible": question.get("points", 5)
        })
    
    # Generate feedback
    strengths = []
    weaknesses = []
    
    for topic, perf in topics_performance.items():
        accuracy = perf["correct"] / perf["total"] if perf["total"] > 0 else 0
        if accuracy >= 0.7:
            strengths.append(f"Strong understanding of {topic}")
        elif accuracy < 0.5:
            weaknesses.append(f"Review needed: {topic}")
    
    # Store submission
    submission_id = f"sub_{uuid.uuid4().hex[:8]}"
    submissions_db[submission_id] = {
        "submissionId": submission_id,
        "examId": exam_id,
        "answers": submission.answers,
        "timeTaken": submission.time_taken,
        "score": total_score,
        "maxScore": exam["maxScore"],
        "submittedAt": datetime.utcnow().isoformat()
    }
    
    return {
        "success": True,
        "data": {
            "submissionId": submission_id,
            "score": total_score,
            "maxScore": exam["maxScore"],
            "percentage": round(total_score / exam["maxScore"] * 100, 1) if exam["maxScore"] > 0 else 0,
            "timeTaken": submission.time_taken,
            "results": results,
            "feedback": {
                "strengths": strengths or ["Keep practicing!"],
                "areasToImprove": weaknesses or ["Good overall performance"],
                "recommendedTopics": [t for t, p in topics_performance.items() if p["correct"] / p["total"] < 0.5] if topics_performance else []
            }
        }
    }

async def grade_short_answer(client, question: str, correct_answer: str, student_answer: str) -> bool:
    """Use LLM to grade short-answer questions"""
    
    if not student_answer.strip():
        return False
    
    try:
        response = await client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {
                    "role": "system",
                    "content": "You are a fair exam grader. Determine if the student's answer demonstrates understanding of the concept. Be somewhat lenient with exact wording. Respond with only 'CORRECT' or 'INCORRECT'."
                },
                {
                    "role": "user",
                    "content": f"Question: {question}\n\nExpected Answer: {correct_answer}\n\nStudent's Answer: {student_answer}\n\nIs this correct?"
                }
            ],
            temperature=0.1,
            max_tokens=10
        )
        
        return "CORRECT" in response.choices[0].message.content.upper()
        
    except Exception as e:
        logger.error(f"Short answer grading failed: {e}")
        # Fall back to simple comparison
        return correct_answer.lower() in student_answer.lower()

@router.get("/{exam_id}")
async def get_exam(exam_id: str):
    """Get exam by ID (without answers)"""
    
    if exam_id not in exams_db:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    exam = exams_db[exam_id]
    
    return {
        "success": True,
        "data": {
            "examId": exam["examId"],
            "title": exam["title"],
            "timeLimit": exam["timeLimit"],
            "questions": [
                {
                    "questionId": q["questionId"],
                    "type": q["type"],
                    "question": q["question"],
                    "options": q.get("options"),
                    "points": q["points"],
                    "topic": q["topic"]
                }
                for q in exam["questions"]
            ],
            "maxScore": exam["maxScore"],
            "createdAt": exam["createdAt"]
        }
    }

@router.get("")
async def list_exams(course_id: Optional[str] = None):
    """List all exams"""
    
    exams = list(exams_db.values())
    
    if course_id:
        exams = [e for e in exams if e.get("courseId") == course_id]
    
    return {
        "success": True,
        "data": {
            "exams": [
                {
                    "examId": e["examId"],
                    "title": e["title"],
                    "courseId": e.get("courseId"),
                    "questionCount": len(e["questions"]),
                    "timeLimit": e["timeLimit"],
                    "maxScore": e["maxScore"],
                    "createdAt": e["createdAt"]
                }
                for e in exams
            ],
            "total": len(exams)
        }
    }
