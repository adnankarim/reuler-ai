# Environment Variables Setup Guide

## .env File Location

The `.env` file should be placed in the **root directory** of the project:
```
ai-service/
├── .env                    ← HERE (root directory)
├── docker-compose.yml
├── ai-service/
├── backend/
└── frontend/
```

## How Environment Variables Work

### Docker Compose
Docker Compose automatically reads `.env` from the root directory and passes variables to containers using `${VARIABLE_NAME}` syntax.

### AI Service (Python)
- Uses `pydantic-settings` to load from environment variables
- Docker Compose passes `OPENAI_API_KEY=${OPENAI_API_KEY}` directly to the container
- The service reads from environment variables (set by Docker Compose)
- Falls back to `.env` file if needed

### Backend (Node.js)
- Uses `dotenv` package: `require('dotenv').config()`
- By default, looks for `.env` in the current working directory
- In Docker, environment variables are passed directly by Docker Compose

## Required Environment Variables

Create `.env` file in the root directory:

```env
# OpenAI API Key (Required)
OPENAI_API_KEY=sk-your-api-key-here

# Optional - JWT Secret for backend
JWT_SECRET=your-secret-key-here
```

## Docker Compose Environment Variable Mapping

### AI Service
```yaml
environment:
  - OPENAI_API_KEY=${OPENAI_API_KEY}  # From root .env file
  - CHROMA_HOST=chromadb
  - CHROMA_PORT=8000
```

### Backend
```yaml
environment:
  - MONGODB_URI=mongodb://mongo:27017/reuler_ai
  - AI_SERVICE_URL=http://ai-service:8000
  - JWT_SECRET=${JWT_SECRET:-reuler-ai-dev-secret-change-in-prod}
```

### Frontend
```yaml
environment:
  - REACT_APP_API_URL=http://localhost:5000/api
  - REACT_APP_AI_SERVICE_URL=http://localhost:8000
```

## Verification

### Check if .env is being read:
```bash
# Check Docker Compose can read it
docker compose config | grep OPENAI_API_KEY

# Check inside container
docker compose exec ai-service env | grep OPENAI_API_KEY
docker compose exec backend env | grep MONGODB_URI
```

### Test Environment Variables:
```bash
# AI Service
docker compose exec ai-service python -c "import os; print(os.getenv('OPENAI_API_KEY', 'NOT SET'))"

# Backend
docker compose exec backend node -e "console.log(process.env.MONGODB_URI)"
```

## Common Issues

### Issue: Environment variable not found
**Solution:** Ensure `.env` file is in the root directory, not in subdirectories

### Issue: Docker Compose can't read .env
**Solution:** 
1. Check file is named exactly `.env` (not `.env.txt`)
2. Ensure it's in the same directory as `docker-compose.yml`
3. Restart Docker Compose: `docker compose down && docker compose up -d`

### Issue: AI Service can't find API key
**Solution:**
1. Verify `.env` has `OPENAI_API_KEY=sk-...`
2. Check Docker Compose passes it: `docker compose config`
3. Check inside container: `docker compose exec ai-service env | grep OPENAI`

## Best Practices

1. **Never commit `.env` to git** (already in `.gitignore`)
2. **Use `.env.example`** for documentation
3. **Keep `.env` in root directory** for Docker Compose
4. **Use different `.env` files** for different environments (dev, prod)

