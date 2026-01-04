/**
 * Session Routes - Handle learning session management
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');

/**
 * POST /api/sessions
 * Create a new learning session
 */
router.post('/', async (req, res, next) => {
  try {
    const { courseId, userId, title } = req.body;
    
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }
    
    const sessionId = uuidv4();
    
    const session = new Session({
      sessionId,
      courseId,
      userId,
      metadata: {
        title: title || `Session ${new Date().toLocaleDateString()}`
      }
    });
    
    await session.save();
    
    res.status(201).json({
      _id: session._id,
      sessionId,
      courseId,
      createdAt: session.createdAt,
      metadata: session.metadata
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get session details
 */
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      sessionId: session.sessionId,
      courseId: session.courseId,
      messages: session.messages,
      learningState: session.learningState,
      snapshots: session.snapshots,
      metadata: session.metadata,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/sessions/:sessionId/snapshot
 * Create a snapshot of the current session state
 */
router.put('/:sessionId/snapshot', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    await session.createSnapshot();
    
    res.json({
      success: true,
      snapshotCount: session.snapshots.length,
      latestSnapshot: session.snapshots[session.snapshots.length - 1]
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/course/:courseId
 * Get all sessions for a course
 */
router.get('/course/:courseId', async (req, res, next) => {
  try {
    let { courseId } = req.params;
    const { limit = 20, offset = 0, archived = false } = req.query;
    
    // Handle both MongoDB _id and courseId
    const Course = require('../models/Course');
    let actualCourseId = courseId;
    
    try {
      // Try finding by _id first (MongoDB ObjectId)
      const course = await Course.findById(courseId);
      if (course) {
        actualCourseId = course.courseId; // Use the actual courseId
      }
    } catch (err) {
      // Not a valid ObjectId, use as-is
    }
    
    const query = {
      courseId: actualCourseId,
      'metadata.isArchived': archived === 'true'
    };
    
    const sessions = await Session.find(query)
      .sort({ updatedAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('sessionId courseId metadata learningState createdAt updatedAt');
    
    const total = await Session.countDocuments(query);
    
    // Return array directly for frontend compatibility
    res.json(sessions.map(s => ({
      _id: s._id,
      sessionId: s.sessionId,
      courseId: s.courseId,
      title: s.metadata?.title,
      questionsAsked: s.learningState?.questionsAsked || 0,
      lastActivity: s.learningState?.lastActivity,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    })));
    
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sessions/:sessionId
 * Update session metadata
 */
router.patch('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { title, tags, isArchived } = req.body;
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (title !== undefined) session.metadata.title = title;
    if (tags !== undefined) session.metadata.tags = tags;
    if (isArchived !== undefined) session.metadata.isArchived = isArchived;
    
    await session.save();
    
    res.json({
      success: true,
      metadata: session.metadata
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session
 */
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const result = await Session.deleteOne({ sessionId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/sessions/:sessionId/learning-state
 * Update learning state (mastered concepts, etc.)
 */
router.put('/:sessionId/learning-state', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { masteredConcepts, currentTopic } = req.body;
    
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (masteredConcepts) {
      // Add new concepts to mastered list
      const existingConcepts = new Set(session.learningState.masteredConcepts);
      masteredConcepts.forEach(c => existingConcepts.add(c));
      session.learningState.masteredConcepts = Array.from(existingConcepts);
    }
    
    if (currentTopic) {
      session.learningState.currentTopic = currentTopic;
    }
    
    session.learningState.lastActivity = new Date();
    
    await session.save();
    
    res.json({
      success: true,
      learningState: session.learningState
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
