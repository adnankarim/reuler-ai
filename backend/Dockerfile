FROM node:20-alpine

WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Run the application
CMD ["npm", "run", "dev"]
