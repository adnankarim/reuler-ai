# 🎓 Reuler AI - AI-Powered Learning Platform

A curriculum-aware AI study companion that provides structured, pedagogical answers with verifiable sources. Built for self-directed university students, researchers, and professors.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Document │ │   Chat   │ │ Concept  │ │ Summary  │ │Flashcard │          │
│  │  Upload  │ │Interface │ │  Graph   │ │  View    │ │Generator │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────┼────────────┼────────────┼─────────────────┘
        │            │            │            │            │
        ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node/Express)                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Auth &    │ │   Session   │ │  Document   │ │    API      │            │
│  │  Middleware │ │  Management │ │  Handler    │ │   Router    │            │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘            │
│         │               │               │               │                    │
│         ▼               ▼               ▼               ▼                    │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                      MongoDB (Sessions, Docs)                │            │
│  └─────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI SERVICE (Python FastAPI)                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │                    AGENTIC AI ORCHESTRATOR                  │             │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │             │
│  │  │  Retrieval   │ │   Pedagogy   │ │ Verification │        │             │
│  │  │    Agent     │ │    Agent     │ │    Agent     │        │             │
│  │  │              │ │              │ │              │        │             │
│  │  │ • Search     │ │ • Structure  │ │ • Cite       │        │             │
│  │  │ • Rank       │ │ • Explain    │ │ • Verify     │        │             │
│  │  │ • Filter     │ │ • Example    │ │ • Detect     │        │             │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘        │             │
│  └─────────┼────────────────┼────────────────┼────────────────┘             │
│            │                │                │                               │
│            ▼                ▼                ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │               RAG PIPELINE                                   │            │
│  │  ┌───────┐ ┌────────┐ ┌─────────┐ ┌──────────┐              │            │
│  │  │ PDF   │→│ Chunk  │→│ Embed   │→│ Store in │              │            │
│  │  │Parser │ │ Text   │ │ (OpenAI)│ │ ChromaDB │              │            │
│  │  └───────┘ └────────┘ └─────────┘ └──────────┘              │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │               CONCEPT GRAPH ENGINE                           │            │
│  │  • Extract concepts from syllabus                            │            │
│  │  • Build prerequisite relationships                          │            │
│  │  • Generate learning paths                                   │            │
│  └─────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VECTOR DATABASE (ChromaDB)                          │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  Collection: course_documents                                │            │
│  │  • Embedded chunks with metadata                             │            │
│  │  • Source tracking                                           │            │
│  │  • Semantic search capability                                │            │
│  └─────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow - Question Answering

```
User Question
     │
     ▼
┌─────────────────────┐
│  1. RETRIEVAL AGENT │ ──→ Query ChromaDB ──→ Get relevant chunks
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│  2. PEDAGOGY AGENT  │ ──→ Structure answer with:
└─────────────────────┘     Definition → Explanation → Example → Pitfalls
     │
     ▼
┌─────────────────────┐
│3. VERIFICATION AGENT│ ──→ Add citations, detect misconceptions
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│   STRUCTURED OUTPUT │
│   • Answer          │
│   • Sources         │
│   • Confidence      │
│   • Misconceptions  │
└─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenAI API Key

### One-Command Startup

```bash
# Clone and configure
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Build and run
docker-compose up --build
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Service**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📁 Project Structure

```
reuler-ai/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React context providers
│   │   ├── utils/           # Utility functions
│   │   └── styles/          # CSS styles
│   ├── Dockerfile
│   └── package.json
│
├── backend/                  # Node.js/Express API
│   ├── routes/              # API route definitions
│   ├── controllers/         # Request handlers
│   ├── models/              # MongoDB models
│   ├── middleware/          # Express middleware
│   ├── services/            # Business logic
│   ├── config/              # Configuration
│   ├── Dockerfile
│   └── package.json
│
├── ai-service/              # Python FastAPI service
│   ├── agents/              # Agentic AI components
│   ├── services/            # RAG & embedding services
│   ├── utils/               # Helper functions
│   ├── Dockerfile
│   └── requirements.txt
│
├── vector-db/               # ChromaDB persistent storage
├── docker/                  # Docker configurations
├── docker-compose.yml
└── README.md
```

## 🔌 API Contracts

### Chat Endpoint
```
POST /api/chat
{
  "sessionId": "string",
  "question": "string",
  "courseId": "string"
}

Response:
{
  "answer": {
    "definition": "string",
    "explanation": "string",
    "example": "string",
    "pitfalls": ["string"],
    "sources": [{
      "title": "string",
      "page": "number",
      "confidence": "number",
      "url": "string"
    }]
  },
  "curriculumAlignment": "number",
  "misconceptionWarning": "string | null",
  "relatedConcepts": ["string"]
}
```

### Upload Documents
```
POST /api/documents/upload
Content-Type: multipart/form-data
{
  "file": File,
  "courseId": "string",
  "type": "syllabus | notes | paper"
}

Response:
{
  "documentId": "string",
  "concepts": ["string"],
  "chunkCount": "number"
}
```

### Session Management
```
GET /api/sessions/:sessionId
POST /api/sessions
PUT /api/sessions/:sessionId/snapshot

Response:
{
  "sessionId": "string",
  "messages": [...],
  "learningState": {...},
  "createdAt": "date"
}
```

### Generate Study Materials
```
POST /api/generate/summary
POST /api/generate/flashcards
POST /api/generate/exam
{
  "courseId": "string",
  "topics": ["string"]
}
```

## ✅ MVP Features

### Core Learning & Trust Layer
- [x] Curriculum-Aware Answering
- [x] Concept Graph Engine
- [x] Source Reliability Scoring
- [x] Misconception Detector
- [x] Research Paper Navigator
- [x] Automatic Knowledge Summarizer
- [x] Auto Bibliography Manager
- [x] Session Snapshotting
- [x] Offline-Ready Architecture

### Learning Effectiveness Layer
- [x] Timeline Study Planner
- [x] Flashcard Generator
- [x] Exam Simulation Mode
- [ ] Learning Profile Personalization (extensible)

## 🧠 AI Architecture

### Multi-Agent System

1. **Retrieval Agent**: Semantic search, relevance ranking, context filtering
2. **Pedagogy Agent**: Structured explanations, examples, difficulty adaptation
3. **Verification Agent**: Source citation, fact-checking, misconception detection

### RAG Pipeline

1. **Document Ingestion**: PDF parsing with PyMuPDF
2. **Chunking**: Semantic chunking with overlap
3. **Embedding**: OpenAI text-embedding-3-small
4. **Storage**: ChromaDB with metadata
5. **Retrieval**: Hybrid semantic + keyword search

## 🔧 Configuration

### Environment Variables

```env
# OpenAI
OPENAI_API_KEY=your_api_key

# MongoDB
MONGODB_URI=mongodb://mongo:27017/reuler_ai

# Services
AI_SERVICE_URL=http://ai-service:8000
FRONTEND_URL=http://localhost:3000

# ChromaDB
CHROMA_PERSIST_DIRECTORY=/app/data/chroma
```

## 📈 Extending the MVP

### Adding New Agents
```python
# ai-service/agents/custom_agent.py
class CustomAgent(BaseAgent):
    async def process(self, context: AgentContext) -> AgentResult:
        # Your logic here
        pass
```

### Adding New Document Types
```python
# ai-service/services/parsers/custom_parser.py
class CustomParser(BaseParser):
    def parse(self, file_path: str) -> List[Chunk]:
        # Your parsing logic
        pass
```

## 📄 License

MIT License - See LICENSE file for details.
