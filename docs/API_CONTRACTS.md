# Reuler AI API Contracts

## Base URL
```
Development: http://localhost:3001/api/v1
Production: https://api.reuler.ai/v1
```

## Authentication
```
Header: Authorization: Bearer <jwt_token>
```

---

## 📄 Document Management

### Upload Document
```http
POST /documents/upload
Content-Type: multipart/form-data
```

**Request Body:**
```
file: <binary> (PDF, max 50MB)
courseId?: string
documentType: "syllabus" | "lecture" | "paper" | "notes"
title?: string
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "documentId": "doc_abc123",
    "filename": "cs101_syllabus.pdf",
    "status": "processing",
    "pageCount": 45,
    "uploadedAt": "2024-01-15T10:30:00Z",
    "processingEstimate": "2-3 minutes"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only PDF files are supported"
  }
}
```

### Get Document Status
```http
GET /documents/:documentId/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "doc_abc123",
    "status": "ready" | "processing" | "failed",
    "chunksCreated": 156,
    "conceptsExtracted": 23,
    "processingProgress": 100,
    "error": null
  }
}
```

### List Documents
```http
GET /documents?courseId=<courseId>&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "documentId": "doc_abc123",
        "filename": "cs101_syllabus.pdf",
        "documentType": "syllabus",
        "pageCount": 45,
        "status": "ready",
        "uploadedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "hasMore": false
    }
  }
}
```

### Delete Document
```http
DELETE /documents/:documentId
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## 💬 Chat & Q&A

### Ask Question
```http
POST /chat/ask
Content-Type: application/json
```

**Request Body:**
```json
{
  "question": "What is the time complexity of quicksort?",
  "sessionId": "session_xyz789",
  "courseId": "course_cs101",
  "options": {
    "includeExamples": true,
    "detailLevel": "detailed" | "concise" | "expert",
    "checkMisconceptions": true
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_def456",
    "answer": {
      "definition": "Time complexity measures how an algorithm's runtime scales with input size.",
      "explanation": "Quicksort has an average-case time complexity of O(n log n)...",
      "example": "For an array [3,1,4,1,5,9], quicksort would...",
      "pitfalls": [
        {
          "misconception": "Quicksort is always O(n log n)",
          "correction": "Worst case is O(n²) when pivot selection is poor",
          "confidence": 0.89
        }
      ],
      "curriculumAlignment": {
        "topic": "Sorting Algorithms",
        "week": 5,
        "relevance": 0.95
      }
    },
    "sources": [
      {
        "documentId": "doc_abc123",
        "documentTitle": "CS101 Lecture Notes",
        "page": 45,
        "excerpt": "The average case complexity of quicksort...",
        "reliabilityScore": 0.92,
        "citationKey": "cormen2009"
      }
    ],
    "misconceptionWarning": {
      "detected": true,
      "userAssumption": "implied quicksort is always fast",
      "clarification": "While quicksort is efficient on average..."
    },
    "metadata": {
      "tokensUsed": 1250,
      "processingTimeMs": 2340,
      "retrievedChunks": 8
    }
  }
}
```

### Stream Question (SSE)
```http
POST /chat/ask/stream
Content-Type: application/json
Accept: text/event-stream
```

**SSE Events:**
```
event: start
data: {"messageId": "msg_def456", "status": "retrieving"}

event: chunk
data: {"type": "definition", "content": "Time complexity measures..."}

event: chunk
data: {"type": "explanation", "content": "Quicksort has an average..."}

event: sources
data: {"sources": [...]}

event: complete
data: {"messageId": "msg_def456", "tokensUsed": 1250}
```

### Get Chat History
```http
GET /chat/history/:sessionId?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_xyz789",
    "messages": [
      {
        "messageId": "msg_001",
        "role": "user",
        "content": "What is quicksort?",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "messageId": "msg_002",
        "role": "assistant",
        "answer": {...},
        "sources": [...],
        "timestamp": "2024-01-15T10:30:05Z"
      }
    ]
  }
}
```

---

## 📚 Sessions

### Create Session
```http
POST /sessions
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": "course_cs101",
  "title": "Sorting Algorithms Study Session",
  "focusTopics": ["quicksort", "mergesort", "complexity"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_xyz789",
    "courseId": "course_cs101",
    "title": "Sorting Algorithms Study Session",
    "createdAt": "2024-01-15T10:00:00Z",
    "snapshot": null
  }
}
```

### Save Session Snapshot
```http
POST /sessions/:sessionId/snapshot
Content-Type: application/json
```

**Request Body:**
```json
{
  "learningState": {
    "topicsReviewed": ["quicksort", "mergesort"],
    "questionsAsked": 15,
    "misconceptionsResolved": 3,
    "conceptsUnlocked": ["partition", "divide-conquer"]
  },
  "notes": "Good progress on sorting algorithms"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "snapshotId": "snap_abc123",
    "sessionId": "session_xyz789",
    "savedAt": "2024-01-15T12:30:00Z"
  }
}
```

### Restore Session
```http
GET /sessions/:sessionId/restore
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_xyz789",
    "courseId": "course_cs101",
    "snapshot": {
      "learningState": {...},
      "notes": "Good progress on sorting algorithms"
    },
    "chatHistory": [...],
    "lastActive": "2024-01-15T12:30:00Z"
  }
}
```

---

## 🧠 Concept Graph

### Get Concept Graph
```http
GET /concepts/graph/:courseId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "courseId": "course_cs101",
    "nodes": [
      {
        "id": "concept_001",
        "name": "Quicksort",
        "description": "Divide-and-conquer sorting algorithm",
        "mastery": 0.75,
        "documentRefs": ["doc_abc123:45"]
      },
      {
        "id": "concept_002",
        "name": "Partitioning",
        "description": "Dividing array around pivot",
        "mastery": 0.60,
        "documentRefs": ["doc_abc123:46-48"]
      }
    ],
    "edges": [
      {
        "from": "concept_002",
        "to": "concept_001",
        "relationship": "prerequisite",
        "strength": 0.9
      }
    ],
    "metadata": {
      "totalConcepts": 45,
      "avgMastery": 0.65,
      "lastUpdated": "2024-01-15T12:00:00Z"
    }
  }
}
```

---

## 📝 Summaries

### Generate Summary
```http
POST /summaries/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "documentIds": ["doc_abc123", "doc_def456"],
  "topics": ["sorting", "complexity"],
  "format": "exam-ready" | "detailed" | "bullet-points",
  "maxLength": 2000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summaryId": "sum_abc123",
    "title": "Sorting Algorithms Summary",
    "content": {
      "overview": "This summary covers sorting algorithms...",
      "sections": [
        {
          "topic": "Quicksort",
          "keyPoints": [
            "Average O(n log n), worst O(n²)",
            "In-place sorting",
            "Divide and conquer approach"
          ],
          "examTips": ["Know pivot selection strategies"],
          "sources": ["doc_abc123:45-50"]
        }
      ]
    },
    "bibliography": [
      {
        "key": "cormen2009",
        "formatted": {
          "apa": "Cormen, T. H., et al. (2009). Introduction to Algorithms...",
          "bibtex": "@book{cormen2009,\n  author={Cormen, Thomas H.}..."
        }
      }
    ],
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🎴 Flashcards

### Generate Flashcards
```http
POST /flashcards/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "documentIds": ["doc_abc123"],
  "topics": ["quicksort"],
  "count": 10,
  "difficulty": "mixed" | "easy" | "medium" | "hard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deckId": "deck_abc123",
    "title": "Quicksort Flashcards",
    "cards": [
      {
        "cardId": "card_001",
        "front": "What is the average time complexity of quicksort?",
        "back": "O(n log n)",
        "difficulty": "easy",
        "topic": "quicksort",
        "sourceRef": "doc_abc123:45"
      }
    ],
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 📊 Exam Simulation

### Generate Exam
```http
POST /exams/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": "course_cs101",
  "topics": ["sorting", "searching"],
  "questionCount": 20,
  "timeLimit": 60,
  "questionTypes": ["multiple-choice", "short-answer", "coding"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "examId": "exam_abc123",
    "title": "CS101 Practice Exam",
    "timeLimit": 60,
    "questions": [
      {
        "questionId": "q_001",
        "type": "multiple-choice",
        "question": "Which sorting algorithm has O(n²) worst case?",
        "options": ["Mergesort", "Quicksort", "Heapsort", "Radixsort"],
        "correctAnswer": null,
        "points": 5,
        "topic": "sorting"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Submit Exam
```http
POST /exams/:examId/submit
Content-Type: application/json
```

**Request Body:**
```json
{
  "answers": {
    "q_001": "Quicksort",
    "q_002": "Binary search uses divide and conquer..."
  },
  "timeTaken": 45
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub_abc123",
    "score": 85,
    "maxScore": 100,
    "results": [
      {
        "questionId": "q_001",
        "correct": true,
        "explanation": "Quicksort's worst case occurs when..."
      }
    ],
    "feedback": {
      "strengths": ["Good understanding of time complexity"],
      "areasToImprove": ["Review space complexity"],
      "recommendedTopics": ["heapsort", "radixsort"]
    }
  }
}
```

---

## 📚 Bibliography

### Export Citations
```http
POST /bibliography/export
Content-Type: application/json
```

**Request Body:**
```json
{
  "documentIds": ["doc_abc123", "doc_def456"],
  "format": "bibtex" | "apa" | "mla" | "chicago",
  "sessionId": "session_xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "format": "bibtex",
    "content": "@book{cormen2009,\n  author={Cormen, Thomas H.}...",
    "entries": 5,
    "downloadUrl": "/downloads/bibliography_xyz789.bib"
  }
}
```

---

## 🔍 Search

### Semantic Search
```http
POST /search
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "how does quicksort partition work",
  "courseId": "course_cs101",
  "filters": {
    "documentTypes": ["lecture", "paper"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "documentId": "doc_abc123",
        "documentTitle": "CS101 Lecture Notes",
        "page": 46,
        "excerpt": "The partition function selects a pivot element...",
        "relevanceScore": 0.94,
        "highlightedText": "The <mark>partition</mark> function selects..."
      }
    ],
    "totalResults": 15,
    "searchTime": 45
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_FILE_TYPE` | Uploaded file type not supported |
| `FILE_TOO_LARGE` | File exceeds size limit |
| `DOCUMENT_NOT_FOUND` | Referenced document doesn't exist |
| `SESSION_NOT_FOUND` | Session ID invalid or expired |
| `PROCESSING_FAILED` | Document processing failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INSUFFICIENT_CONTEXT` | Not enough material to answer |
| `AI_SERVICE_UNAVAILABLE` | AI service temporarily down |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/chat/ask` | 30/minute |
| `/documents/upload` | 10/hour |
| `/summaries/generate` | 10/hour |
| `/flashcards/generate` | 20/hour |
| `/exams/generate` | 5/hour |
