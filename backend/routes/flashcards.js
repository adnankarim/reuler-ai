/**
 * Flashcards Routes - Manage flashcards, decks, and study progress
 */

const express = require('express');
const router = express.Router();
const { Flashcard, FlashcardDeck } = require('../models/Flashcard');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * GET /api/flashcards/course/:courseId
 * Get all flashcard decks for a course
 */
router.get('/course/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
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
    
    const decks = await FlashcardDeck.find({ courseId: actualCourseId })
      .sort({ createdAt: -1 })
      .lean();
    
    // Get card counts for each deck
    for (const deck of decks) {
      const cardCount = await Flashcard.countDocuments({ deckId: deck.deckId });
      deck.cardCount = cardCount;
    }
    
    res.json({ decks });
  } catch (error) {
    console.error('Error fetching flashcard decks:', error);
    next(error);
  }
});

/**
 * GET /api/flashcards/deck/:deckId
 * Get all flashcards in a deck
 */
router.get('/deck/:deckId', async (req, res, next) => {
  try {
    const { deckId } = req.params;
    const flashcards = await Flashcard.find({ deckId }).sort({ createdAt: 1 });
    res.json({ flashcards });
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    next(error);
  }
});

/**
 * POST /api/flashcards/generate
 * Generate new flashcards and save to database
 */
router.post('/generate', async (req, res, next) => {
  try {
    let { courseId, count = 20, difficulty = 'mixed', topics = [] } = req.body;
    
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
    
    // Check for existing flashcards to avoid duplicates
    const existingDecks = await FlashcardDeck.find({ 
      courseId: actualCourseId,
      'generationParams.topics': { $in: topics.length > 0 ? topics : ['.*'] }
    }).sort({ createdAt: -1 }).limit(5);
    
    // Get existing card fronts to avoid duplicates
    const existingCards = await Flashcard.find({ courseId: actualCourseId })
      .select('front topic')
      .limit(100);
    
    const existingFronts = new Set(existingCards.map(c => c.front.toLowerCase().trim()));
    
    console.log('[FLASHCARDS] Generating with memory:', {
      courseId: actualCourseId,
      existingDecks: existingDecks.length,
      existingCards: existingCards.length
    });
    
    // Generate flashcards from AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/generate/flashcards`, {
      course_id: actualCourseId,
      count: count + 10, // Generate extra to account for duplicates
      difficulty,
      topics,
      avoid_duplicates: existingFronts.size > 0 ? Array.from(existingFronts).slice(0, 50) : []
    });
    
    const generatedCards = aiResponse.data.flashcards || [];
    
    // Filter out duplicates
    const uniqueCards = generatedCards.filter(card => {
      const normalizedFront = card.front?.toLowerCase().trim();
      if (!normalizedFront || existingFronts.has(normalizedFront)) {
        return false;
      }
      existingFronts.add(normalizedFront);
      return true;
    }).slice(0, count);
    
    if (uniqueCards.length === 0) {
      return res.status(400).json({
        error: 'No new flashcards generated. All cards may already exist.',
        suggestion: 'Try different topics or increase the count.'
      });
    }
    
    // Create deck
    const deckId = `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deck = new FlashcardDeck({
      deckId,
      courseId: actualCourseId,
      title: topics.length > 0 
        ? `${topics.slice(0, 2).join(', ')} Flashcards`
        : 'Course Flashcards',
      topics,
      difficulty,
      cardCount: uniqueCards.length,
      generationParams: {
        count,
        topics,
        difficulty
      }
    });
    await deck.save();
    
    // Save flashcards
    const flashcardsToSave = uniqueCards.map((card, index) => {
      const cardId = `card_${deckId}_${index}`;
      return new Flashcard({
        cardId,
        courseId: actualCourseId,
        deckId,
        front: card.front || card.question,
        back: card.back || card.answer || card.definition,
        topic: card.topic || 'General',
        difficulty: card.difficulty || difficulty,
        hint: card.hint,
        sourceRef: card.sourceRef || card.source
      });
    });
    
    await Flashcard.insertMany(flashcardsToSave);
    
    res.json({
      success: true,
      deck: {
        deckId,
        title: deck.title,
        cardCount: uniqueCards.length,
        createdAt: deck.createdAt
      },
      flashcards: flashcardsToSave.map(f => ({
        cardId: f.cardId,
        front: f.front,
        back: f.back,
        topic: f.topic,
        difficulty: f.difficulty
      }))
    });
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
 * POST /api/flashcards/study
 * Update study progress for a flashcard
 */
router.post('/study', async (req, res, next) => {
  try {
    const { cardId, isCorrect } = req.body;
    
    const flashcard = await Flashcard.findOne({ cardId });
    if (!flashcard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    
    // Update study progress
    flashcard.studyProgress.timesStudied += 1;
    flashcard.studyProgress.lastStudied = new Date();
    
    if (isCorrect) {
      flashcard.studyProgress.timesCorrect += 1;
      // Increase mastery (spaced repetition algorithm)
      flashcard.studyProgress.masteryLevel = Math.min(100, 
        flashcard.studyProgress.masteryLevel + (100 - flashcard.studyProgress.masteryLevel) * 0.3
      );
    } else {
      flashcard.studyProgress.timesIncorrect += 1;
      // Decrease mastery
      flashcard.studyProgress.masteryLevel = Math.max(0,
        flashcard.studyProgress.masteryLevel * 0.7
      );
    }
    
    // Calculate next review (spaced repetition)
    const daysUntilReview = Math.ceil(flashcard.studyProgress.masteryLevel / 20);
    flashcard.studyProgress.nextReview = new Date();
    flashcard.studyProgress.nextReview.setDate(
      flashcard.studyProgress.nextReview.getDate() + daysUntilReview
    );
    
    await flashcard.save();
    
    // Update deck stats
    const deck = await FlashcardDeck.findOne({ deckId: flashcard.deckId });
    if (deck) {
      deck.stats.totalStudied += 1;
      if (isCorrect) {
        deck.stats.totalCorrect += 1;
      } else {
        deck.stats.totalIncorrect += 1;
      }
      deck.stats.lastStudied = new Date();
      
      // Recalculate average mastery
      const allCards = await Flashcard.find({ deckId: deck.deckId });
      const avgMastery = allCards.reduce((sum, c) => sum + c.studyProgress.masteryLevel, 0) / allCards.length;
      deck.stats.averageMastery = avgMastery;
      
      await deck.save();
    }
    
    res.json({
      success: true,
      masteryLevel: flashcard.studyProgress.masteryLevel,
      nextReview: flashcard.studyProgress.nextReview
    });
  } catch (error) {
    console.error('Error updating study progress:', error);
    next(error);
  }
});

/**
 * GET /api/flashcards/progress/:courseId
 * Get study progress statistics for a course
 */
router.get('/progress/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
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
    
    const decks = await FlashcardDeck.find({ courseId: actualCourseId });
    const allCards = await Flashcard.find({ courseId: actualCourseId });
    
    const totalCards = allCards.length;
    const totalStudied = allCards.reduce((sum, c) => sum + c.studyProgress.timesStudied, 0);
    const totalCorrect = allCards.reduce((sum, c) => sum + c.studyProgress.timesCorrect, 0);
    const avgMastery = totalCards > 0 
      ? allCards.reduce((sum, c) => sum + c.studyProgress.masteryLevel, 0) / totalCards 
      : 0;
    
    const cardsByMastery = {
      mastered: allCards.filter(c => c.studyProgress.masteryLevel >= 80).length,
      learning: allCards.filter(c => c.studyProgress.masteryLevel >= 40 && c.studyProgress.masteryLevel < 80).length,
      new: allCards.filter(c => c.studyProgress.masteryLevel < 40).length
    };
    
    res.json({
      totalDecks: decks.length,
      totalCards,
      totalStudied,
      totalCorrect,
      accuracy: totalStudied > 0 ? (totalCorrect / totalStudied * 100).toFixed(1) : 0,
      averageMastery: avgMastery.toFixed(1),
      cardsByMastery
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    next(error);
  }
});

module.exports = router;

