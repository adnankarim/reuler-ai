/**
 * Generate Routes - Study material generation endpoints
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Course = require('../models/Course');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * Generate summary
 */
router.post('/summary', async (req, res, next) => {
  try {
    let { courseId, topics, format } = req.body;
    
    // Convert MongoDB _id to courseId if needed
    let actualCourseId = courseId;
    try {
      const Course = require('../models/Course');
      const course = await Course.findById(courseId);
      if (course) {
        actualCourseId = course.courseId;
      } else {
        const courseByCode = await Course.findOne({ courseId });
        if (courseByCode) {
          actualCourseId = courseByCode.courseId;
        }
      }
    } catch (err) {
      // Not a valid ObjectId, use as-is
    }
    
    console.log('[GENERATE] Summary request:', { courseId, actualCourseId });
    
    const response = await axios.post(`${AI_SERVICE_URL}/generate/summary`, {
      course_id: actualCourseId,
      topics: topics || [],
      format: format || 'structured'
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Summary generation error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.detail || error.response.data.error || 'Failed to generate summary',
        details: error.response.data
      });
    }
    next(error);
  }
});

/**
 * Generate flashcards
 */
router.post('/flashcards', async (req, res, next) => {
  try {
    let { courseId, topics, count, difficulty } = req.body;
    
    // Convert MongoDB _id to courseId if needed
    let actualCourseId = courseId;
    try {
      const course = await Course.findById(courseId);
      if (course) {
        actualCourseId = course.courseId;
      } else {
        const courseByCode = await Course.findOne({ courseId });
        if (courseByCode) {
          actualCourseId = courseByCode.courseId;
        }
      }
    } catch (err) {
      // Not a valid ObjectId, use as-is
    }
    
    console.log('[GENERATE] Flashcards request:', { courseId, actualCourseId });
    
    const response = await axios.post(`${AI_SERVICE_URL}/generate/flashcards`, {
      course_id: actualCourseId,
      topics: topics || [],
      count: count || 20,
      difficulty: difficulty || 'mixed'
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Flashcard generation error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.detail || error.response.data.error || 'Failed to generate flashcards',
        details: error.response.data
      });
    }
    next(error);
  }
});

/**
 * Generate exam
 */
router.post('/exam', async (req, res, next) => {
  try {
    let { courseId, topics, question_count, questionCount, question_types, questionTypes, difficulty } = req.body;
    
    // Convert MongoDB _id to courseId if needed
    let actualCourseId = courseId;
    try {
      const course = await Course.findById(courseId);
      if (course) {
        actualCourseId = course.courseId;
      } else {
        const courseByCode = await Course.findOne({ courseId });
        if (courseByCode) {
          actualCourseId = courseByCode.courseId;
        }
      }
    } catch (err) {
      // Not a valid ObjectId, use as-is
    }
    
    console.log('[GENERATE] Exam request:', { courseId, actualCourseId });
    
    const response = await axios.post(`${AI_SERVICE_URL}/generate/exam`, {
      course_id: actualCourseId,
      topics: topics || [],
      question_count: question_count || questionCount || 10,
      question_types: question_types || questionTypes || ['multiple_choice', 'short_answer'],
      difficulty: difficulty || 'mixed'
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Exam generation error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.detail || error.response.data.error || 'Failed to generate exam',
        details: error.response.data
      });
    }
    next(error);
  }
});

/**
 * Generate bibliography
 */
router.post('/bibliography', async (req, res) => {
  try {
    const { courseId, format } = req.body;
    
    const response = await axios.post(`${AI_SERVICE_URL}/generate/bibliography`, {
      course_id: courseId,
      format: format || 'apa'
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Bibliography generation error:', error);
    res.status(500).json({
      error: 'Failed to generate bibliography',
      details: error.message
    });
  }
});

module.exports = router;

