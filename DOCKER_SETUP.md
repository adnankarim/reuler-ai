# 🐳 Docker Setup Guide - Reuler AI

Complete guide to build and run Reuler AI using Docker.

## Prerequisites

1. **Docker Desktop** installed and running
   - Download: https://www.docker.com/products/docker-desktop/
   - Verify: `docker --version` and `docker compose version`

2. **OpenAI API Key**
   - Get your key from: https://platform.openai.com/api-keys

## Quick Start

### 1. Clone/Download the Repository

```bash
cd C:\Users\adnan\Desktop\projects\ai-service
```

### 2. Create Environment File

Create a `.env` file in the root directory:

```bash
# Copy example (if exists)
cp .env.example .env

# Or create manually
```

Add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Build and Run

**Option A: Build and Run in One Command**
```bash
docker compose up --build
```

**Option B: Build First, Then Run**
```bash
# Build all services
docker compose build

# Start all services
docker compose up -d
```

**Option C: Build Specific Service**
```bash
# Build only frontend
docker compose build frontend

# Build only backend
docker compose build backend

# Build only AI service
docker compose build ai-service
```

## Detailed Build Commands

### Full Clean Build (Recommended for First Time)

```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v

# Remove old images (optional, saves space)
docker image prune -a

# Build everything from scratch
docker compose build --no-cache

# Start all services
docker compose up -d
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker compose up --build -d

# Or rebuild specific service
docker compose build frontend
docker compose up -d frontend
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f ai-service

# Last 50 lines
docker compose logs --tail=50
```

### Check Service Status

```bash
# See running containers
docker compose ps

# Check health status
docker compose ps
```

## Access the Application

Once all services are running:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **Backend API** | http://localhost:5000 | REST API |
| **AI Service Docs** | http://localhost:8000/docs | FastAPI interactive docs |
| **MongoDB** | localhost:27017 | Database (direct access) |
| **ChromaDB** | localhost:8001 | Vector database |

## Common Commands

### Start Services
```bash
docker compose up -d
```

### Stop Services
```bash
docker compose stop
```

### Stop and Remove Containers
```bash
docker compose down
```

### Stop and Remove Everything (including volumes)
```bash
docker compose down -v
```

### Restart a Specific Service
```bash
docker compose restart frontend
docker compose restart backend
docker compose restart ai-service
```

### View Running Containers
```bash
docker compose ps
```

### Execute Commands in Container
```bash
# Access frontend container
docker compose exec frontend sh

# Access backend container
docker compose exec backend sh

# Access AI service container
docker compose exec ai-service sh
```

## Troubleshooting

### Services Won't Start

1. **Check Docker is Running**
   ```bash
   docker ps
   ```

2. **Check Logs for Errors**
   ```bash
   docker compose logs
   ```

3. **Check Port Availability**
   - Make sure ports 3000, 5000, 8000, 8001, 27017 are not in use

4. **Rebuild from Scratch**
   ```bash
   docker compose down -v
   docker compose build --no-cache
   docker compose up -d
   ```

### Frontend Build Fails

```bash
# Clean and rebuild frontend
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Backend Won't Connect to MongoDB

```bash
# Restart MongoDB
docker compose restart mongo

# Check MongoDB logs
docker compose logs mongo
```

### AI Service Won't Connect to ChromaDB

```bash
# Restart ChromaDB
docker compose restart chromadb

# Wait 30 seconds, then restart AI service
docker compose restart ai-service
```

### Out of Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

## Production Build

For production deployment:

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Or use build args
docker compose build --build-arg NODE_ENV=production
```

## Environment Variables

Create `.env` file with:

```env
# OpenAI
OPENAI_API_KEY=sk-your-key-here

# MongoDB
MONGODB_URI=mongodb://mongo:27017/reuler_ai

# Services
AI_SERVICE_URL=http://ai-service:8000
FRONTEND_URL=http://localhost:3000

# Optional
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

## Step-by-Step First Time Setup

1. **Ensure Docker Desktop is Running**
   ```bash
   docker --version
   ```

2. **Navigate to Project Directory**
   ```bash
   cd C:\Users\adnan\Desktop\projects\ai-service
   ```

3. **Create .env File**
   ```bash
   # Create .env file and add:
   OPENAI_API_KEY=sk-your-key-here
   ```

4. **Build All Services**
   ```bash
   docker compose build
   ```

5. **Start All Services**
   ```bash
   docker compose up -d
   ```

6. **Check Status**
   ```bash
   docker compose ps
   ```

7. **View Logs (if needed)**
   ```bash
   docker compose logs -f
   ```

8. **Access Application**
   - Open browser: http://localhost:3000

## Windows PowerShell Commands

```powershell
# Build and start
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Clean rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

## Verification

After starting, verify all services:

```bash
# Check all containers are running
docker compose ps

# Should show:
# - reuler-ai-mongo (healthy)
# - reuler-ai-chromadb (running)
# - reuler-ai-ai-service (healthy)
# - reuler-ai-backend (healthy)
# - reuler-ai-frontend (running)
```

## Next Steps

1. Open http://localhost:3000 in your browser
2. Create your first course
3. Upload documents
4. Start chatting with the AI!

For more details, see [QUICKSTART.md](./QUICKSTART.md) and [BUILD.md](./BUILD.md).

