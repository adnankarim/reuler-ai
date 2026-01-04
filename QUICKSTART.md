# Reuler AI Quick Start Guide

## Prerequisites
- Docker Desktop for Windows installed ([Download here](https://www.docker.com/products/docker-desktop/))
- OpenAI API key

### Installing Docker Desktop (if not installed)
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop/
2. Run the installer and follow the setup wizard
3. Restart your computer if prompted
4. Launch Docker Desktop and wait for it to start (whale icon in system tray)
5. Verify installation by opening PowerShell and running: `docker --version`

## 1. Setup (One-time)

```bash
cd reuler-ai

# Create environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here
```

## 2. Start the Application

**Note:** On newer Docker versions, use `docker compose` (without hyphen). On older versions, use `docker-compose`.

```bash
# Try this first (newer Docker versions)
docker compose up --build

# If that doesn't work, try this (older Docker versions)
docker-compose up --build
```

Wait for all services to start (takes 2-3 minutes first time). You'll see health checks passing.

## 3. Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main user interface |
| **Backend API** | http://localhost:5000 | REST API |
| **AI Service Docs** | http://localhost:8000/docs | Interactive API docs |

## 4. Using Reuler AI

### Step 1: Create a Course
1. Open http://localhost:3000
2. Click "New Course"
3. Enter course name (e.g., "Machine Learning 101")
4. Add course code and description

### Step 2: Upload Course Materials
1. Select your course
2. Click "Upload Documents"
3. Upload PDFs: syllabus, lecture notes, textbook chapters
4. Wait for processing (documents are chunked and embedded)

### Step 3: Ask Questions
1. Go to Chat interface
2. Select your course
3. Ask questions like:
   - "What is gradient descent?"
   - "Explain backpropagation with an example"
   - "What are common mistakes when implementing neural networks?"

### Step 4: Generate Study Materials
- **Summaries**: Click "Generate Summary" for any topic
- **Flashcards**: Auto-generate flashcards from your notes
- **Practice Exams**: Create mock exams with answer keys

### Step 5: Explore Concept Graph
1. Click "Concept Graph" tab
2. View prerequisite relationships
3. Get personalized learning paths

---

## API Usage (for Developers)

### Upload a Document
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@lecture1.pdf" \
  -F "courseId=YOUR_COURSE_ID" \
  -F "docType=lecture"
```

### Ask a Question
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is machine learning?",
    "courseId": "YOUR_COURSE_ID"
  }'
```

### Generate Flashcards
```bash
curl -X POST http://localhost:8000/generate/flashcards \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "YOUR_COURSE_ID",
    "topic": "neural networks",
    "count": 10
  }'
```

### Search Documents
```bash
curl -X POST http://localhost:5000/api/documents/search \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "YOUR_COURSE_ID",
    "query": "regularization techniques"
  }'
```

---

## Stopping the Application

```bash
# Stop all services (use 'docker compose' on newer versions)
docker compose down
# OR
docker-compose down

# Stop and remove all data (fresh start)
docker compose down -v
# OR
docker-compose down -v
```

---

## Troubleshooting

### "docker-compose is not recognized" error
- Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/
- After installation, restart your terminal/PowerShell
- Try `docker compose` (without hyphen) if `docker-compose` doesn't work

### "Connection refused" errors
- Wait for all containers to be healthy
- Check: `docker compose ps` or `docker-compose ps`

### AI responses are slow
- First request initializes models (slower)
- Subsequent requests use cached embeddings

### Documents not appearing
- Check upload completed: look for success message
- Verify course ID is correct

### Out of memory
- Increase Docker memory limit to 4GB+
- Process smaller PDFs first

---

## File Structure

```
reuler-ai/
├── frontend/          # React UI (port 3000)
├── backend/           # Node.js API (port 5000)
├── ai-service/        # Python AI engine (port 8000)
├── docker-compose.yml # Service orchestration
└── .env               # Your configuration
```
