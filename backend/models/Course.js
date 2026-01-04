/**
 * Course Model - Stores course metadata and documents
 */

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true
  },
  filename: String,
  originalName: String,
  docType: {
    type: String,
    enum: ['syllabus', 'notes', 'paper', 'slides', 'other'],
    default: 'notes'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  chunkCount: Number,
  concepts: [String],
  metadata: {
    author: String,
    pages: Number,
    size: Number
  }
});

const conceptNodeSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  prerequisites: [String],
  difficulty: Number
});

const courseSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  code: String,
  description: String,
  instructor: String,
  semester: String,
  documents: [documentSchema],
  conceptGraph: {
    nodes: [conceptNodeSchema],
    edges: [{
      source: { type: String, default: '' },
      target: { type: String, default: '' },
      from: { type: String, default: '' },
      to: { type: String, default: '' },
      type: { type: String, default: 'prerequisite' },
      relationship: { type: String, default: 'prerequisite' }
    }],
    learningPaths: [[String]],
    learning_paths: [[String]],
    lastUpdated: Date
  },
  settings: {
    allowFlashcards: { type: Boolean, default: true },
    allowExams: { type: Boolean, default: true },
    defaultDifficulty: { type: String, default: 'mixed' }
  },
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    averageConfidence: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Method to add a document
courseSchema.methods.addDocument = function(docInfo) {
  this.documents.push(docInfo);
  return this.save();
};

// Method to update concept graph
courseSchema.methods.updateConceptGraph = function(graph) {
  // Normalize edges to ensure they match schema
  const normalizedEdges = (graph.edges || []).map(edge => ({
    source: edge.source || edge.from || '',
    target: edge.target || edge.to || '',
    from: edge.from || edge.source || '',
    to: edge.to || edge.target || '',
    type: edge.type || edge.relationship || 'prerequisite',
    relationship: edge.relationship || edge.type || 'prerequisite'
  }));
  
  // Normalize learning paths
  const learningPaths = graph.learningPaths || graph.learning_paths || [];
  
  this.conceptGraph = {
    nodes: graph.nodes || [],
    edges: normalizedEdges,
    learningPaths: learningPaths,
    learning_paths: learningPaths,
    lastUpdated: new Date()
  };
  return this.save();
};

// Method to update stats
courseSchema.methods.updateStats = function(sessionData) {
  this.stats.totalSessions += 1;
  this.stats.totalQuestions += sessionData.questionsAsked || 0;
  
  if (sessionData.averageConfidence) {
    const totalConfidence = this.stats.averageConfidence * (this.stats.totalSessions - 1);
    this.stats.averageConfidence = (totalConfidence + sessionData.averageConfidence) / this.stats.totalSessions;
  }
  
  return this.save();
};

// Static method to find or create course
courseSchema.statics.findOrCreate = async function(courseId, name) {
  let course = await this.findOne({ courseId });
  
  if (!course) {
    course = new this({
      courseId,
      name: name || `Course ${courseId}`
    });
    await course.save();
  }
  
  return course;
};

module.exports = mongoose.model('Course', courseSchema);
