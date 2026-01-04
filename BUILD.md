# Reuler AI - Build Commands

## Quick Build Commands

### Frontend (React Client) Build

#### Development Build (with hot reload)
```bash
cd frontend
npm install
npm start
```
This will start the development server at `http://localhost:3000` with hot reload enabled.

#### Production Build
```bash
cd frontend
npm install
npm run build
```
This creates an optimized production build in the `frontend/build/` directory.

#### Clean Build (fresh install)
```bash
cd frontend
rm -rf node_modules package-lock.json build
npm install
npm run build
```

### Backend Build

#### Development
```bash
cd backend
npm install
npm run dev
```

#### Production
```bash
cd backend
npm install
npm start
```

### AI Service Build

#### Development
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Production
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Docker Build Commands

### Build All Services
```bash
docker compose build
```

### Build Specific Service
```bash
docker compose build frontend
docker compose build backend
docker compose build ai-service
```

### Rebuild and Restart
```bash
docker compose up --build -d
```

### Clean Build (remove old images)
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Frontend Production Build (Client)

### Option 1: Using Docker
```bash
# Build frontend container
docker compose build frontend

# Or rebuild everything
docker compose up --build -d
```

### Option 2: Local Build
```bash
cd frontend
npm ci                    # Clean install
npm run build            # Production build
```

### Option 3: Clean Rebuild
```bash
cd frontend
rm -rf node_modules build .cache
npm install
npm run build
```

## Environment Setup

### Create .env file (if not exists)
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

## Full Clean Rebuild

### Complete Clean Build (All Services)
```bash
# Stop all containers
docker compose down

# Remove volumes (WARNING: This deletes all data)
docker compose down -v

# Remove old images
docker image prune -a

# Rebuild everything
docker compose build --no-cache

# Start services
docker compose up -d
```

### Frontend Only - Clean Rebuild
```bash
cd frontend
rm -rf node_modules package-lock.json build .cache .parcel-cache
npm cache clean --force
npm install
npm run build
```

## Troubleshooting

### Frontend build fails
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

### Backend build fails
```bash
cd backend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### AI Service build fails
```bash
cd ai-service
rm -rf venv __pycache__ *.pyc
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Production Deployment

### Build for Production
```bash
# 1. Build frontend
cd frontend
npm ci
npm run build

# 2. Build backend (if needed)
cd ../backend
npm ci

# 3. Build AI service (if needed)
cd ../ai-service
pip install -r requirements.txt

# 4. Use Docker Compose for production
docker compose -f docker-compose.prod.yml up --build -d
```

## Quick Commands Reference

| Task | Command |
|------|---------|
| **Frontend Dev** | `cd frontend && npm start` |
| **Frontend Build** | `cd frontend && npm run build` |
| **Frontend Clean Build** | `cd frontend && rm -rf node_modules build && npm install && npm run build` |
| **Backend Dev** | `cd backend && npm run dev` |
| **AI Service Dev** | `cd ai-service && uvicorn main:app --reload` |
| **Docker Build All** | `docker compose build` |
| **Docker Rebuild** | `docker compose up --build -d` |
| **Docker Clean Rebuild** | `docker compose down && docker compose build --no-cache && docker compose up -d` |

