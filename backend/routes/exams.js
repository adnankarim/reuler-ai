/**
 * Exams Routes - Manage exams, attempts, and results
 */

const express = require('express');
const router = express.Router();
const { Exam, ExamAttempt } = require('../models/Exam');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * GET /api/exams/course/:courseId
 * Get all exams for a course
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
    
    const exams = await Exam.find({ courseId: actualCourseId })
      .sort({ createdAt: -1 })
      .select('examId title description questions settings stats createdAt')
      .lean();
    
    // Get attempt counts for each exam
    for (const exam of exams) {
      const attemptCount = await ExamAttempt.countDocuments({ examId: exam.examId });
      exam.attemptCount = attemptCount;
      exam.questionCount = exam.questions.length;
      // Remove correct answers from response
      exam.questions = exam.questions.map(q => ({
        questionId: q.questionId,
        type: q.type,
        question: q.question,
        options: q.options,
        points: q.points,
        topic: q.topic,
        difficulty: q.difficulty
      }));
    }
    
    res.json({ exams });
  } catch (error) {
    console.error('Error fetching exams:', error);
    next(error);
  }
});

/**
 * GET /api/exams/:examId
 * Get exam details (without answers)
 */
router.get('/:examId', async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findOne({ examId }).lean();
    
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Remove correct answers and explanations
    exam.questions = exam.questions.map(q => ({
      questionId: q.questionId,
      type: q.type,
      question: q.question,
      options: q.options,
      points: q.points,
      topic: q.topic,
      difficulty: q.difficulty
    }));
    
    res.json({ exam });
  } catch (error) {
    console.error('Error fetching exam:', error);
    next(error);
  }
});

/**
 * POST /api/exams/generate
 * Generate new exam and save to database
 */
router.post('/generate', async (req, res, next) => {
  try {
    let { 
      courseId, 
      question_count = 10, 
      question_types = ['multiple_choice', 'short_answer'], 
      difficulty = 'mixed',
      topics = []
    } = req.body;
    
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
    
    // Check for existing exams to avoid duplicates
    const existingExams = await Exam.find({ 
      courseId: actualCourseId,
      'generationParams.topics': { $in: topics.length > 0 ? topics : ['.*'] }
    }).sort({ createdAt: -1 }).limit(3);
    
    // Get existing questions to avoid duplicates
    const existingQuestions = [];
    for (const exam of existingExams) {
      existingQuestions.push(...exam.questions.map(q => q.question.toLowerCase().trim()));
    }
    
    console.log('[EXAMS] Generating with memory:', {
      courseId: actualCourseId,
      existingExams: existingExams.length,
      existingQuestions: existingQuestions.length
    });
    
    // Generate exam from AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/generate/exam`, {
      course_id: actualCourseId,
      question_count: question_count + 5, // Generate extra to account for duplicates
      question_types,
      difficulty,
      topics,
      avoid_duplicates: existingQuestions.slice(0, 50)
    });
    
    const generatedQuestions = aiResponse.data.questions || [];
    
    // Filter out duplicates
    const existingSet = new Set(existingQuestions);
    const uniqueQuestions = generatedQuestions.filter(q => {
      const normalizedQuestion = q.question?.toLowerCase().trim();
      if (!normalizedQuestion || existingSet.has(normalizedQuestion)) {
        return false;
      }
      existingSet.add(normalizedQuestion);
      return true;
    }).slice(0, question_count);
    
    if (uniqueQuestions.length === 0) {
      return res.status(400).json({
        error: 'No new questions generated. All questions may already exist.',
        suggestion: 'Try different topics or increase the question count.'
      });
    }
    
    // Calculate max score
    const maxScore = uniqueQuestions.reduce((sum, q) => sum + (q.points || 5), 0);
    
    // Create exam
    const examId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const exam = new Exam({
      examId,
      courseId: actualCourseId,
      title: topics.length > 0 
        ? `${topics.slice(0, 2).join(', ')} Practice Exam`
        : 'Practice Exam',
      description: `Practice exam with ${uniqueQuestions.length} questions`,
      questions: uniqueQuestions.map(q => ({
        questionId: q.questionId || `q_${examId}_${Math.random().toString(36).substr(2, 6)}`,
        type: q.type || 'multiple_choice',
        question: q.question,
        options: q.options || [],
        points: q.points || 5,
        topic: q.topic || 'General',
        difficulty: q.difficulty || difficulty,
        correctAnswer: q.correct_answer || q.answer,
        explanation: q.explanation,
        sourceRef: q.sourceRef || q.source
      })),
      generationParams: {
        question_count,
        question_types,
        difficulty,
        topics
      },
      settings: {
        timeLimit: question_count * 2, // 2 minutes per question
        passingScore: 70,
        showAnswers: true,
        allowRetake: true
      }
    });
    
    await exam.save();
    
    // Return exam without answers
    const examResponse = exam.toObject();
    examResponse.questions = examResponse.questions.map(q => ({
      questionId: q.questionId,
      type: q.type,
      question: q.question,
      options: q.options,
      points: q.points,
      topic: q.topic,
      difficulty: q.difficulty
    }));
    
    res.json({
      success: true,
      exam: examResponse
    });
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
 * POST /api/exams/:examId/start
 * Start an exam attempt
 */
router.post('/:examId/start', async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { courseId } = req.body;
    
    const exam = await Exam.findOne({ examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attempt = new ExamAttempt({
      attemptId,
      examId,
      courseId: courseId || exam.courseId,
      startedAt: new Date(),
      maxScore: exam.questions.reduce((sum, q) => sum + q.points, 0)
    });
    
    await attempt.save();
    
    res.json({
      success: true,
      attemptId,
      exam: {
        examId: exam.examId,
        title: exam.title,
        questionCount: exam.questions.length,
        timeLimit: exam.settings.timeLimit,
        questions: exam.questions.map(q => ({
          questionId: q.questionId,
          type: q.type,
          question: q.question,
          options: q.options,
          points: q.points,
          topic: q.topic,
          difficulty: q.difficulty
        }))
      }
    });
  } catch (error) {
    console.error('Error starting exam:', error);
    next(error);
  }
});

/**
 * POST /api/exams/:examId/submit
 * Submit exam answers and get results
 */
router.post('/:examId/submit', async (req, res, next) => {
  try {
    const { attemptId, answers } = req.body;
    
    const attempt = await ExamAttempt.findOne({ attemptId });
    if (!attempt) {
      return res.status(404).json({ error: 'Exam attempt not found' });
    }
    
    const exam = await Exam.findOne({ examId: attempt.examId });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Grade answers
    let totalScore = 0;
    const gradedAnswers = [];
    const topics = new Set();
    const strengths = [];
    const weaknesses = [];
    
    for (const studentAnswer of answers) {
      const question = exam.questions.find(q => q.questionId === studentAnswer.questionId);
      if (!question) continue;
      
      topics.add(question.topic);
      
      let isCorrect = false;
      let pointsEarned = 0;
      
      // Grade based on question type
      if (question.type === 'multiple_choice') {
        isCorrect = String(studentAnswer.answer).toLowerCase().trim() === 
                   String(question.correctAnswer).toLowerCase().trim();
      } else if (question.type === 'true_false') {
        isCorrect = studentAnswer.answer === question.correctAnswer;
      } else {
        // For short answer and essay, use partial credit
        const studentAns = String(studentAnswer.answer).toLowerCase().trim();
        const correctAns = String(question.correctAnswer).toLowerCase().trim();
        isCorrect = studentAns.includes(correctAns) || correctAns.includes(studentAns);
      }
      
      if (isCorrect) {
        pointsEarned = question.points;
        totalScore += pointsEarned;
        strengths.push(question.topic);
      } else {
        weaknesses.push(question.topic);
      }
      
      gradedAnswers.push({
        questionId: question.questionId,
        answer: studentAnswer.answer,
        isCorrect,
        pointsEarned,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        timeSpent: studentAnswer.timeSpent || 0
      });
    }
    
    // Calculate percentage and grade
    const percentage = (totalScore / attempt.maxScore) * 100;
    const grade = percentage >= 97 ? 'A+' :
                  percentage >= 93 ? 'A' :
                  percentage >= 90 ? 'A-' :
                  percentage >= 87 ? 'B+' :
                  percentage >= 83 ? 'B' :
                  percentage >= 80 ? 'B-' :
                  percentage >= 77 ? 'C+' :
                  percentage >= 73 ? 'C' :
                  percentage >= 70 ? 'C-' :
                  percentage >= 67 ? 'D' : 'F';
    
    // Calculate time spent
    const timeSpent = Math.floor((new Date() - attempt.startedAt) / 1000);
    
    // Update attempt
    attempt.answers = gradedAnswers;
    attempt.score = totalScore;
    attempt.percentage = percentage;
    attempt.grade = grade;
    attempt.completedAt = new Date();
    attempt.timeSpent = timeSpent;
    attempt.topics = Array.from(topics);
    attempt.strengths = [...new Set(strengths)];
    attempt.weaknesses = [...new Set(weaknesses)];
    attempt.recommendations = generateRecommendations(percentage, attempt.weaknesses);
    
    await attempt.save();
    
    // Update exam stats
    exam.stats.totalAttempts += 1;
    exam.stats.averageScore = ((exam.stats.averageScore * (exam.stats.totalAttempts - 1)) + percentage) / exam.stats.totalAttempts;
    exam.stats.bestScore = Math.max(exam.stats.bestScore, percentage);
    exam.stats.worstScore = Math.min(exam.stats.worstScore, percentage);
    exam.stats.lastAttempt = new Date();
    await exam.save();
    
    res.json({
      success: true,
      result: {
        score: totalScore,
        maxScore: attempt.maxScore,
        percentage: percentage.toFixed(1),
        grade,
        timeSpent,
        answers: gradedAnswers,
        strengths: attempt.strengths,
        weaknesses: attempt.weaknesses,
        recommendations: attempt.recommendations
      }
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    next(error);
  }
});

/**
 * GET /api/exams/attempts/:courseId
 * Get exam attempt history for a course
 */
router.get('/attempts/:courseId', async (req, res, next) => {
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
    
    const attempts = await ExamAttempt.find({ courseId: actualCourseId })
      .sort({ completedAt: -1 })
      .limit(50)
      .populate('examId', 'title')
      .lean();
    
    res.json({ attempts });
  } catch (error) {
    console.error('Error fetching attempts:', error);
    next(error);
  }
});

/**
 * GET /api/exams/attempt/:attemptId
 * Get detailed results for a specific attempt
 */
router.get('/attempt/:attemptId', async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await ExamAttempt.findOne({ attemptId }).lean();
    
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    const exam = await Exam.findOne({ examId: attempt.examId }).lean();
    
    res.json({
      attempt,
      exam: {
        title: exam.title,
        questions: exam.questions
      }
    });
  } catch (error) {
    console.error('Error fetching attempt:', error);
    next(error);
  }
});

// Helper function to generate recommendations
function generateRecommendations(percentage, weaknesses) {
  const recommendations = [];
  
  if (percentage < 70) {
    recommendations.push('Review the course materials more thoroughly before retaking the exam.');
    recommendations.push('Focus on understanding concepts rather than memorization.');
  }
  
  if (weaknesses.length > 0) {
    recommendations.push(`Pay special attention to: ${weaknesses.slice(0, 3).join(', ')}`);
  }
  
  if (percentage >= 70 && percentage < 85) {
    recommendations.push('Good progress! Review incorrect answers to improve further.');
  }
  
  if (percentage >= 85) {
    recommendations.push('Excellent work! Consider challenging yourself with harder questions.');
  }
  
  return recommendations;
}

module.exports = router;

