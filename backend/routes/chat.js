/**
 * Chat Routes - Handle Q&A interactions
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Course = require('../models/Course');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * POST /api/chat
 * Process a learning question
 */
router.post('/', async (req, res, next) => {
  try {
    const { question, courseId, sessionId: providedSessionId } = req.body;
    
    if (!question || !courseId) {
      return res.status(400).json({ 
        error: 'Missing required fields: question and courseId' 
      });
    }
    
    // Convert MongoDB _id to courseId if needed
    let actualCourseId = courseId;
    let foundCourse = null;
    
    try {
      // Try finding by _id first (MongoDB ObjectId)
      foundCourse = await Course.findById(courseId);
      if (foundCourse) {
        actualCourseId = foundCourse.courseId; // Use the actual courseId for AI service
        console.log('[CHAT] Found course by _id:', { 
          from: courseId, 
          to: actualCourseId, 
          name: foundCourse.name 
        });
      } else {
        // Try finding by courseId
        foundCourse = await Course.findOne({ courseId });
        if (foundCourse) {
          actualCourseId = foundCourse.courseId;
          console.log('[CHAT] Found course by courseId:', { 
            courseId: actualCourseId, 
            name: foundCourse.name 
          });
        }
      }
    } catch (err) {
      // Not a valid ObjectId, try finding by courseId
      foundCourse = await Course.findOne({ courseId });
      if (foundCourse) {
        actualCourseId = foundCourse.courseId;
        console.log('[CHAT] Found course by courseId (after error):', { 
          courseId: actualCourseId, 
          name: foundCourse.name 
        });
      } else {
        console.log('[CHAT] Using courseId as-is (course not found):', courseId);
      }
    }
    
    // Verify course exists
    if (!foundCourse) {
      console.warn('[CHAT] Course not found, but proceeding with courseId:', actualCourseId);
    }
    
    // Get or create session
    const sessionId = providedSessionId || uuidv4();
    const session = await Session.findOrCreate(sessionId, actualCourseId);
    
    // Add user message to session
    await session.addMessage('user', question);
    
    // Call AI service with the actual courseId - this ensures only this course's documents are searched
    console.log('[CHAT] Calling AI service with course_id:', actualCourseId, 
                foundCourse ? `(Course: ${foundCourse.name})` : '(Course not found in DB)');
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/chat`, {
      question,
      course_id: actualCourseId,
      session_id: sessionId,
      include_sources: true,
      detect_misconceptions: true
    });
    
    const answer = aiResponse.data;
    
    // Log sources for debugging
    console.log('AI Service Response:', {
      hasSources: !!answer.sources,
      sourcesCount: answer.sources?.length || 0,
      sources: answer.sources
    });
    
    // Add assistant message to session
    await session.addMessage('assistant', JSON.stringify(answer.answer), {
      sources: answer.sources || [],
      curriculumAlignment: answer.curriculum_alignment,
      misconceptionWarning: answer.misconception_warning,
      relatedConcepts: answer.related_concepts
    });
    
    // Update course stats
    const courseForStats = await Course.findOne({ courseId: actualCourseId });
    if (courseForStats) {
      await courseForStats.updateStats({
        questionsAsked: 1,
        averageConfidence: answer.confidence
      });
    }
    
    // Ensure sources is always an array in response
    const responseData = {
      sessionId,
      ...answer,
      sources: Array.isArray(answer.sources) ? answer.sources : (answer.sources ? [answer.sources] : [])
    };
    
    res.json(responseData);
    
  } catch (error) {
    console.error('Chat error:', error.message);
    
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
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const messages = session.messages.slice(-parseInt(limit));
    
    res.json({
      sessionId,
      courseId: session.courseId,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        metadata: m.metadata
      })),
      learningState: session.learningState
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chat/feedback
 * Submit feedback on an answer
 */
router.post('/feedback', async (req, res, next) => {
  try {
    const { sessionId, messageIndex, rating, comment } = req.body;
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Store feedback (in production, use a separate collection)
    if (session.messages[messageIndex]) {
      session.messages[messageIndex].metadata = {
        ...session.messages[messageIndex].metadata,
        feedback: { rating, comment, timestamp: new Date() }
      };
      await session.save();
    }
    
    res.json({ success: true });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
