"""
Pydantic models for Reuler AI Service
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

# Enums
class DocumentType(str, Enum):
    SYLLABUS = "syllabus"
    LECTURE = "lecture"
    PAPER = "paper"
    NOTES = "notes"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class DetailLevel(str, Enum):
    CONCISE = "concise"
    DETAILED = "detailed"
    EXPERT = "expert"

class SummaryFormat(str, Enum):
    EXAM_READY = "exam-ready"
    DETAILED = "detailed"
    BULLET_POINTS = "bullet-points"

class CitationFormat(str, Enum):
    APA = "apa"
    BIBTEX = "bibtex"
    MLA = "mla"
    CHICAGO = "chicago"

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple-choice"
    SHORT_ANSWER = "short-answer"
    CODING = "coding"
    TRUE_FALSE = "true-false"

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    MIXED = "mixed"

# Document Models
class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    document_type: DocumentType
    course_id: Optional[str] = None
    title: Optional[str] = None
    page_count: int = 0
    status: ProcessingStatus = ProcessingStatus.PENDING
    chunks_created: int = 0
    concepts_extracted: int = 0
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    error: Optional[str] = None

class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    page_number: int
    chunk_index: int
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = {}

# Chat Models
class ChatOptions(BaseModel):
    include_examples: bool = True
    detail_level: DetailLevel = DetailLevel.DETAILED
    check_misconceptions: bool = True

class ChatRequest(BaseModel):
    question: str
    session_id: str
    course_id: Optional[str] = None
    options: ChatOptions = ChatOptions()

class Source(BaseModel):
    document_id: str
    document_title: str
    page: int
    excerpt: str
    reliability_score: float
    citation_key: Optional[str] = None

class Pitfall(BaseModel):
    misconception: str
    correction: str
    confidence: float

class CurriculumAlignment(BaseModel):
    topic: str
    week: Optional[int] = None
    relevance: float

class MisconceptionWarning(BaseModel):
    detected: bool
    user_assumption: Optional[str] = None
    clarification: Optional[str] = None

class StructuredAnswer(BaseModel):
    definition: str
    explanation: str
    example: str
    pitfalls: List[Pitfall] = []
    curriculum_alignment: Optional[CurriculumAlignment] = None

class ChatResponse(BaseModel):
    message_id: str
    answer: StructuredAnswer
    sources: List[Source]
    misconception_warning: MisconceptionWarning
    metadata: Dict[str, Any] = {}

# Concept Models
class ConceptNode(BaseModel):
    id: str
    name: str
    description: str
    mastery: float = 0.0
    document_refs: List[str] = []

class ConceptEdge(BaseModel):
    from_id: str
    to_id: str
    relationship: str = "prerequisite"
    strength: float = 1.0

class ConceptGraph(BaseModel):
    course_id: str
    nodes: List[ConceptNode]
    edges: List[ConceptEdge]
    metadata: Dict[str, Any] = {}

# Summary Models
class SummaryRequest(BaseModel):
    document_ids: List[str]
    topics: List[str] = []
    format: SummaryFormat = SummaryFormat.EXAM_READY
    max_length: int = 2000

class SummarySection(BaseModel):
    topic: str
    key_points: List[str]
    exam_tips: List[str] = []
    sources: List[str] = []

class Summary(BaseModel):
    summary_id: str
    title: str
    overview: str
    sections: List[SummarySection]
    bibliography: List[Dict[str, Any]] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# Flashcard Models
class FlashcardRequest(BaseModel):
    document_ids: List[str]
    topics: List[str] = []
    count: int = 10
    difficulty: Difficulty = Difficulty.MIXED

class Flashcard(BaseModel):
    card_id: str
    front: str
    back: str
    difficulty: Difficulty
    topic: str
    source_ref: Optional[str] = None

class FlashcardDeck(BaseModel):
    deck_id: str
    title: str
    cards: List[Flashcard]
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# Exam Models
class ExamRequest(BaseModel):
    course_id: str
    topics: List[str] = []
    question_count: int = 20
    time_limit: int = 60
    question_types: List[QuestionType] = [QuestionType.MULTIPLE_CHOICE]

class ExamQuestion(BaseModel):
    question_id: str
    type: QuestionType
    question: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None  # Hidden from student
    points: int = 5
    topic: str

class Exam(BaseModel):
    exam_id: str
    title: str
    time_limit: int
    questions: List[ExamQuestion]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExamSubmission(BaseModel):
    answers: Dict[str, str]
    time_taken: int

class QuestionResult(BaseModel):
    question_id: str
    correct: bool
    explanation: str

class ExamFeedback(BaseModel):
    strengths: List[str]
    areas_to_improve: List[str]
    recommended_topics: List[str]

class ExamResult(BaseModel):
    submission_id: str
    score: int
    max_score: int
    results: List[QuestionResult]
    feedback: ExamFeedback

# Search Models
class SearchFilters(BaseModel):
    document_types: List[DocumentType] = []
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class SearchRequest(BaseModel):
    query: str
    course_id: Optional[str] = None
    filters: SearchFilters = SearchFilters()
    limit: int = 10

class SearchResult(BaseModel):
    document_id: str
    document_title: str
    page: int
    excerpt: str
    relevance_score: float
    highlighted_text: str

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_results: int
    search_time_ms: int

# Session Models
class LearningState(BaseModel):
    topics_reviewed: List[str] = []
    questions_asked: int = 0
    misconceptions_resolved: int = 0
    concepts_unlocked: List[str] = []

class SessionSnapshot(BaseModel):
    snapshot_id: str
    session_id: str
    learning_state: LearningState
    notes: Optional[str] = None
    saved_at: datetime = Field(default_factory=datetime.utcnow)
