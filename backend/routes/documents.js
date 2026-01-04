/**
 * Document Routes - Handle file uploads and document management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const Course = require('../models/Course');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/app/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * POST /api/documents/upload
 * Upload a PDF document for a course
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    let { courseId, docType = 'notes', courseName } = req.body;
    
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }
    
    // Handle both MongoDB _id and courseId
    let course;
    let actualCourseId = courseId;
    
    try {
      // Try finding by _id first (MongoDB ObjectId)
      course = await Course.findById(courseId);
      if (course) {
        actualCourseId = course.courseId; // Use the actual courseId for AI service
        console.log('[DOCUMENT UPLOAD] Found course by _id:', { 
          _id: courseId, 
          courseId: actualCourseId, 
          name: course.name 
        });
      }
    } catch (err) {
      // Not a valid ObjectId, try finding by courseId
      course = await Course.findOne({ courseId });
      if (course) {
        actualCourseId = course.courseId;
        console.log('[DOCUMENT UPLOAD] Found course by courseId:', { 
          courseId: actualCourseId, 
          name: course.name 
        });
      }
    }
    
    // If still not found, create it
    if (!course) {
      console.log('[DOCUMENT UPLOAD] Course not found, creating new course:', { 
        courseId: actualCourseId, 
        courseName 
      });
      course = await Course.findOrCreate(actualCourseId, courseName || `Course ${actualCourseId}`);
      actualCourseId = course.courseId;
      console.log('[DOCUMENT UPLOAD] Created course:', { 
        _id: course._id, 
        courseId: actualCourseId, 
        name: course.name 
      });
    }
    
    // Ensure we use the actual courseId for vector store
    courseId = actualCourseId;
    console.log('[DOCUMENT UPLOAD] Using courseId for vector store:', courseId);
    
    // Create form data for AI service
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: 'application/pdf'
    });
    formData.append('course_id', courseId);
    formData.append('doc_type', docType);
    
    // Send to AI service for processing
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/documents/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    const result = aiResponse.data;
    
    // Add document to course
    console.log('Adding document to course:', {
      courseId: course.courseId,
      courseName: course.name,
      documentId: result.document_id,
      filename: req.file.originalname,
      chunkCount: result.chunk_count
    });
    
    const documentData = {
      documentId: result.document_id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      docType,
      chunkCount: result.chunk_count || 0,
      concepts: result.concepts || [],
      metadata: {
        size: req.file.size
      }
    };
    
    // Add document to course
    course.documents.push(documentData);
    await course.save();
    
    // Reload course to verify
    const updatedCourse = await Course.findById(course._id);
    console.log('Document added successfully. Course now has', updatedCourse.documents.length, 'documents');
    
    // Clean up temp file
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      documentId: result.document_id,
      filename: req.file.originalname,
      concepts: result.concepts,
      chunkCount: result.chunk_count,
      status: 'processed'
    });
    
  } catch (error) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Upload error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'AI Service Error',
        details: error.response.data
      });
    }
    
    next(error);
  }
});

/**
 * GET /api/documents/course/:courseId
 * Get all documents for a course by courseId
 */
router.get('/course/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    // Try to find by courseId first, then by _id (MongoDB ObjectId)
    let course = await Course.findOne({ courseId });
    
    if (!course) {
      // Try finding by _id if courseId doesn't match
      try {
        course = await Course.findById(courseId);
      } catch (err) {
        // Invalid ObjectId format
      }
    }
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(course.documents.map(doc => ({
      _id: doc._id,
      id: doc._id,
      documentId: doc.documentId,
      filename: doc.originalName || doc.filename,
      title: doc.originalName || doc.filename,
      docType: doc.docType,
      type: doc.docType,
      uploadedAt: doc.uploadedAt,
      chunkCount: doc.chunkCount,
      concepts: doc.concepts || []
    })));
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:documentId
 * Get a specific document by documentId
 */
router.get('/:documentId', async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Find course that contains this document
    const course = await Course.findOne({ 
      'documents.documentId': documentId 
    });
    
    if (!course) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const doc = course.documents.find(d => d.documentId === documentId);
    
    res.json({
      _id: doc._id,
      documentId: doc.documentId,
      filename: doc.originalName || doc.filename,
      docType: doc.docType,
      uploadedAt: doc.uploadedAt,
      chunkCount: doc.chunkCount,
      concepts: doc.concepts || []
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/documents/:documentId
 * Delete a document from a course
 */
router.delete('/:documentId', async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    // Find course that contains this document
    const course = await Course.findOne({ 
      'documents.documentId': documentId 
    });
    
    if (!course) {
      // Try finding by _id if documentId is MongoDB ObjectId
      try {
        const allCourses = await Course.find({});
        for (const c of allCourses) {
          const doc = c.documents.find(d => 
            d._id?.toString() === documentId || d.documentId === documentId
          );
          if (doc) {
            c.documents = c.documents.filter(
              d => d._id?.toString() !== documentId && d.documentId !== documentId
            );
            await c.save();
            return res.json({ success: true });
          }
        }
      } catch (err) {
        // Invalid format
      }
      
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Remove document from course
    course.documents = course.documents.filter(
      doc => doc.documentId !== documentId && doc._id?.toString() !== documentId
    );
    await course.save();
    
    // TODO: Call AI service to remove from vector store
    
    res.json({ success: true });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/documents/search
 * Semantic search across documents
 */
router.post('/search', async (req, res, next) => {
  try {
    const { query, courseId, limit = 10 } = req.body;
    
    if (!query || !courseId) {
      return res.status(400).json({ 
        error: 'query and courseId are required' 
      });
    }
    
    // Create form data for search
    const formData = new FormData();
    formData.append('query', query);
    formData.append('course_id', courseId);
    formData.append('limit', limit.toString());
    
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/search`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );
    
    res.json(aiResponse.data);
    
  } catch (error) {
    console.error('Search error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'AI Service Error',
        details: error.response.data
      });
    }
    
    next(error);
  }
});

module.exports = router;
