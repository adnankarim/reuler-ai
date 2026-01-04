/**
 * Flashcard Model - Stores generated flashcards and study progress
 */

const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  cardId: {
    type: String,
    required: true,
    unique: true
  },
  courseId: {
    type: String,
    required: true,
    index: true
  },
  deckId: {
    type: String,
    required: true,
    index: true
  },
  front: {
    type: String,
    required: true
  },
  back: {
    type: String,
    required: true
  },
  topic: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  hint: String,
  sourceRef: String,
  // Study progress tracking
  studyProgress: {
    timesStudied: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },
    timesIncorrect: { type: Number, default: 0 },
    lastStudied: Date,
    masteryLevel: { type: Number, default: 0, min: 0, max: 100 }, // 0-100 mastery score
    nextReview: Date // Spaced repetition
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const flashcardDeckSchema = new mongoose.Schema({
  deckId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  courseId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  topics: [String],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'mixed'],
    default: 'mixed'
  },
  cardCount: {
    type: Number,
    default: 0
  },
  // Generation metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generationParams: {
    count: Number,
    topics: [String],
    difficulty: String
  },
  // Study statistics
  stats: {
    totalStudied: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    totalIncorrect: { type: Number, default: 0 },
    averageMastery: { type: Number, default: 0 },
    lastStudied: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
flashcardSchema.index({ courseId: 1, deckId: 1 });
flashcardSchema.index({ deckId: 1, 'studyProgress.masteryLevel': 1 });
flashcardDeckSchema.index({ courseId: 1, createdAt: -1 });

module.exports = {
  Flashcard: mongoose.model('Flashcard', flashcardSchema),
  FlashcardDeck: mongoose.model('FlashcardDeck', flashcardDeckSchema)
};

