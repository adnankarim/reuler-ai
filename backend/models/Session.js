/**
 * Session Model - Stores learning session data
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    sources: [{
      title: String,
      page: Number,
      confidence: Number
    }],
    curriculumAlignment: Number,
    misconceptionWarning: String,
    relatedConcepts: [String]
  }
});

const learningStateSchema = new mongoose.Schema({
  masteredConcepts: [String],
  currentTopic: String,
  questionsAsked: Number,
  lastActivity: Date,
  studyStreak: Number
});

const sessionSchema = new mongoose.Schema({
  sessionId: {
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
  userId: {
    type: String,
    index: true
  },
  messages: [messageSchema],
  learningState: {
    type: learningStateSchema,
    default: () => ({
      masteredConcepts: [],
      questionsAsked: 0,
      studyStreak: 0
    })
  },
  snapshots: [{
    timestamp: Date,
    state: learningStateSchema,
    messageCount: Number
  }],
  metadata: {
    title: String,
    tags: [String],
    isArchived: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Index for efficient querying
sessionSchema.index({ courseId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, createdAt: -1 });

// Method to add a message
sessionSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  
  this.learningState.questionsAsked += role === 'user' ? 1 : 0;
  this.learningState.lastActivity = new Date();
  
  return this.save();
};

// Method to create a snapshot
sessionSchema.methods.createSnapshot = function() {
  this.snapshots.push({
    timestamp: new Date(),
    state: { ...this.learningState.toObject() },
    messageCount: this.messages.length
  });
  
  return this.save();
};

// Static method to find or create session
sessionSchema.statics.findOrCreate = async function(sessionId, courseId, userId) {
  let session = await this.findOne({ sessionId });
  
  if (!session) {
    session = new this({
      sessionId,
      courseId,
      userId
    });
    await session.save();
  }
  
  return session;
};

module.exports = mongoose.model('Session', sessionSchema);
