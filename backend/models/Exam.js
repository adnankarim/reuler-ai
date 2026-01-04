/**
 * Exam Model - Stores generated exams, attempts, and results
 */

const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'short_answer', 'essay', 'true_false'],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: [String], // For multiple choice
  points: {
    type: Number,
    default: 5
  },
  topic: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  // Hidden from student
  correctAnswer: mongoose.Schema.Types.Mixed, // Can be string, number, or array
  explanation: String,
  sourceRef: String
}, { _id: false });

const examAttemptSchema = new mongoose.Schema({
  attemptId: {
    type: String,
    required: true,
    unique: true
  },
  examId: {
    type: String,
    required: true,
    index: true
  },
  courseId: {
    type: String,
    required: true,
    index: true
  },
  // Student answers
  answers: [{
    questionId: String,
    answer: mongoose.Schema.Types.Mixed, // Student's answer
    isCorrect: Boolean,
    pointsEarned: Number,
    timeSpent: Number // seconds
  }],
  // Results
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    default: 'F'
  },
  // Timing
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  timeSpent: Number, // Total seconds
  // Analysis
  topics: [String],
  strengths: [String], // Topics student did well on
  weaknesses: [String], // Topics student struggled with
  recommendations: [String]
}, {
  timestamps: true
});

const examSchema = new mongoose.Schema({
  examId: {
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
  questions: [examQuestionSchema],
  // Generation metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generationParams: {
    question_count: Number,
    question_types: [String],
    difficulty: String,
    topics: [String]
  },
  // Exam settings
  settings: {
    timeLimit: Number, // minutes
    passingScore: { type: Number, default: 70 },
    showAnswers: { type: Boolean, default: true },
    allowRetake: { type: Boolean, default: true }
  },
  // Statistics
  stats: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    worstScore: { type: Number, default: 100 },
    lastAttempt: Date
  }
}, {
  timestamps: true
});

// Indexes
examSchema.index({ courseId: 1, createdAt: -1 });
examAttemptSchema.index({ examId: 1, completedAt: -1 });
examAttemptSchema.index({ courseId: 1, completedAt: -1 });

module.exports = {
  Exam: mongoose.model('Exam', examSchema),
  ExamAttempt: mongoose.model('ExamAttempt', examAttemptSchema)
};

