/**
 * Reuler AI Backend - Main Application
 * Express.js server with MongoDB integration
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const chatRoutes = require('./routes/chat');
const documentRoutes = require('./routes/documents');
const sessionRoutes = require('./routes/sessions');
const courseRoutes = require('./routes/courses');
const generateRoutes = require('./routes/generate');

const app = express();

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reuler_ai';

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/flashcards', require('./routes/flashcards'));
app.use('/api/exams', require('./routes/exams'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid or missing authentication token'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// MongoDB connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Reuler AI Backend API ready`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
