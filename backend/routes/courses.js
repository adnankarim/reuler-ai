/**
 * Course Routes - Handle course management
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Course = require('../models/Course');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * POST /api/courses
 * Create a new course
 */
router.post('/', async (req, res, next) => {
  try {
    const { courseId, name, code, description, instructor, semester } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        error: 'name is required' 
      });
    }
    
    // Generate courseId from code or name if not provided
    let finalCourseId = courseId;
    if (!finalCourseId) {
      if (code) {
        finalCourseId = code.toLowerCase().replace(/\s+/g, '-');
      } else {
        finalCourseId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      // Add timestamp to ensure uniqueness
      finalCourseId = `${finalCourseId}-${Date.now()}`;
    }
    
    // Check if course already exists
    const existing = await Course.findOne({ courseId: finalCourseId });
    if (existing) {
      return res.status(409).json({ error: 'Course already exists' });
    }
    
    const course = new Course({
      courseId: finalCourseId,
      name,
      code,
      description,
      instructor,
      semester
    });
    
    await course.save();
    
    res.status(201).json({
      _id: course._id,
      courseId: course.courseId,
      name: course.name,
      code: course.code,
      description: course.description,
      createdAt: course.createdAt
    });
    
  } catch (error) {
    console.error('Course creation error:', error);
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.message 
      });
    }
    
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({ 
        error: 'Course already exists',
        details: 'A course with this ID already exists'
      });
    }
    
    if (error.name === 'MongoServerError') {
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create course', 
      details: error.message 
    });
  }
});

/**
 * GET /api/courses
 * Get all courses
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('_id courseId name code description instructor semester stats createdAt updatedAt');
    
    const total = await Course.countDocuments();
    
    // Return array directly for frontend compatibility
    res.json(courses);
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:courseId
 * Get course details
 */
router.get('/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const course = await Course.findOne({ courseId });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({
      courseId: course.courseId,
      name: course.name,
      code: course.code,
      description: course.description,
      instructor: course.instructor,
      semester: course.semester,
      documents: course.documents,
      settings: course.settings,
      stats: course.stats,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:courseId/concepts
 * Get concept graph for a course
 */
router.get('/:courseId/concepts', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    // First check if we have a cached graph
    const course = await Course.findOne({ courseId });
    
    if (course?.conceptGraph?.nodes?.length > 0) {
      return res.json(course.conceptGraph);
    }
    
    // Otherwise, fetch from AI service
    const aiResponse = await axios.get(
      `${AI_SERVICE_URL}/concepts/${courseId}`
    );
    
    // Cache the result if we have a course
    if (course) {
      await course.updateConceptGraph(aiResponse.data);
    }
    
    res.json(aiResponse.data);
    
  } catch (error) {
    console.error('Concept graph error:', error.message);
    
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
 * POST /api/courses/:courseId/concepts/build
 * Build/rebuild concept graph
 */
router.post('/:courseId/concepts/build', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    // Convert MongoDB _id to courseId if needed
    let actualCourseId = courseId;
    let course = await Course.findOne({ courseId });
    
    if (!course) {
      try {
        course = await Course.findById(courseId);
        if (course) {
          actualCourseId = course.courseId;
        }
      } catch (err) {
        // Invalid ObjectId
      }
    } else {
      actualCourseId = course.courseId;
    }
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    console.log('[CONCEPT BUILD] Building graph for course:', {
      courseId: actualCourseId,
      name: course.name
    });
    
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/concepts/${actualCourseId}/build`
    );
    
    // Update the course with the new graph
    if (aiResponse.data.nodes && aiResponse.data.nodes.length > 0) {
      // Normalize edges to match schema (use source/target)
      const normalizedEdges = (aiResponse.data.edges || []).map(edge => ({
        source: edge.source || edge.from || '',
        target: edge.target || edge.to || '',
        type: edge.type || edge.relationship || 'prerequisite',
        relationship: edge.relationship || edge.type || 'prerequisite'
      }));
      
      // Normalize learning paths
      const learningPaths = aiResponse.data.learning_paths || aiResponse.data.learningPaths || [];
      
      await course.updateConceptGraph({
        nodes: aiResponse.data.nodes,
        edges: normalizedEdges,
        learningPaths: learningPaths,
        learning_paths: learningPaths
      });
    }
    
    res.json(aiResponse.data);
    
  } catch (error) {
    console.error('Build concept graph error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.detail || error.response.data.error || 'AI Service Error',
        details: error.response.data
      });
    }
    
    next(error);
  }
});

/**
 * PATCH /api/courses/:courseId
 * Update course details
 */
router.patch('/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { name, code, description, instructor, semester, settings } = req.body;
    
    const course = await Course.findOne({ courseId });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    if (name) course.name = name;
    if (code) course.code = code;
    if (description) course.description = description;
    if (instructor) course.instructor = instructor;
    if (semester) course.semester = semester;
    if (settings) course.settings = { ...course.settings, ...settings };
    
    await course.save();
    
    res.json({
      success: true,
      course: {
        courseId: course.courseId,
        name: course.name,
        updatedAt: course.updatedAt
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/courses/:courseId
 * Delete a course and all its chunks
 */
router.delete('/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    // Find course to get the actual courseId
    let course = await Course.findOne({ courseId });
    if (!course) {
      // Try finding by _id
      try {
        course = await Course.findById(courseId);
      } catch (err) {
        // Invalid ObjectId
      }
    }
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const actualCourseId = course.courseId;
    
    console.log('[COURSE DELETE] Deleting course:', {
      _id: course._id,
      courseId: actualCourseId,
      name: course.name
    });
    
    // Delete from vector store (all chunks)
    try {
      const aiResponse = await axios.delete(`${AI_SERVICE_URL}/courses/${actualCourseId}`);
      console.log('[COURSE DELETE] Vector store cleanup:', {
        chunks_deleted: aiResponse.data.chunks_deleted
      });
    } catch (error) {
      console.error('[COURSE DELETE] Vector store cleanup error:', error.message);
      // Continue with course deletion even if vector store cleanup fails
    }
    
    // Delete course from MongoDB
    const result = await Course.deleteOne({ courseId: actualCourseId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // TODO: Clean up associated sessions
    
    res.json({ 
      success: true,
      message: 'Course and all associated chunks deleted successfully'
    });
    
  } catch (error) {
    console.error('Course deletion error:', error);
    next(error);
  }
});

module.exports = router;
