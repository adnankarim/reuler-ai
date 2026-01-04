import React, { useState, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { examsApi } from '../services/api';
import { GraduationCap, Loader2, CheckCircle2, X, Clock, BarChart3, ArrowLeft, Play, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Exams() {
  const { activeCourse } = useCourse();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list', 'take', 'results', 'history'
  const [currentExam, setCurrentExam] = useState(null);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (activeCourse) {
      loadExams();
      loadAttempts();
    }
  }, [activeCourse]);

  useEffect(() => {
    if (timeRemaining > 0 && view === 'take') {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, view]);

  const loadExams = async () => {
    if (!activeCourse) return;
    try {
      setLoading(true);
      const courseId = activeCourse.courseId || activeCourse._id;
      const response = await examsApi.getExams(courseId);
      setExams(response.exams || []);
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttempts = async () => {
    if (!activeCourse) return;
    try {
      const courseId = activeCourse.courseId || activeCourse._id;
      const response = await examsApi.getAttempts(courseId);
      setAttempts(response.attempts || []);
    } catch (error) {
      console.error('Error loading attempts:', error);
    }
  };

  const startExam = async (examId) => {
    try {
      setLoading(true);
      const courseId = activeCourse.courseId || activeCourse._id;
      const response = await examsApi.startExam(examId, courseId);
      setCurrentExam(response.exam);
      setCurrentAttempt({ attemptId: response.attemptId });
      setAnswers({});
      setView('take');
      
      // Set timer if time limit exists
      if (response.exam.timeLimit) {
        setTimeRemaining(response.exam.timeLimit * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Error starting exam:', error);
      alert('Failed to start exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answer, timeSpent = 0) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { answer, timeSpent }
    }));
  };

  const handleAutoSubmit = async () => {
    if (!currentExam || !currentAttempt) return;
    await submitExam();
  };

  const submitExam = async () => {
    try {
      setLoading(true);
      const answersArray = Object.entries(answers).map(([questionId, data]) => ({
        questionId,
        answer: data.answer,
        timeSpent: data.timeSpent || 0
      }));
      
      const response = await examsApi.submitExam(
        currentExam.examId,
        currentAttempt.attemptId,
        answersArray
      );
      
      setResults(response.result);
      setView('results');
      loadAttempts();
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Failed to submit exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeCourse) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Please select a course first</p>
      </div>
    );
  }

  if (view === 'take' && currentExam) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentExam.title}
          </h2>
          {timeRemaining !== null && (
            <div style={{
              padding: 'var(--space-sm) var(--space-lg)',
              background: timeRemaining < 300 ? 'var(--error)' : 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              <Clock size={18} />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {currentExam.questions.map((question, index) => (
            <div key={question.questionId} className="card card-elevated" style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--accent-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-md)'
                  }}>
                    {question.question}
                  </h3>
                  
                  {question.type === 'multiple_choice' && question.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                      {question.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          style={{
                            padding: 'var(--space-md)',
                            background: answers[question.questionId]?.answer === option 
                              ? 'var(--accent-muted)' 
                              : 'var(--bg-tertiary)',
                            border: answers[question.questionId]?.answer === option
                              ? '2px solid var(--accent-primary)'
                              : '1px solid var(--bg-elevated)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)'
                          }}
                          onMouseEnter={(e) => {
                            if (answers[question.questionId]?.answer !== option) {
                              e.currentTarget.style.background = 'var(--bg-elevated)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (answers[question.questionId]?.answer !== option) {
                              e.currentTarget.style.background = 'var(--bg-tertiary)';
                            }
                          }}
                        >
                          <input
                            type="radio"
                            name={question.questionId}
                            value={option}
                            checked={answers[question.questionId]?.answer === option}
                            onChange={() => handleAnswer(question.questionId, option)}
                            style={{ margin: 0 }}
                          />
                          <span style={{ color: 'var(--text-primary)', flex: 1 }}>
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'short_answer' && (
                    <textarea
                      value={answers[question.questionId]?.answer || ''}
                      onChange={(e) => handleAnswer(question.questionId, e.target.value)}
                      placeholder="Type your answer here..."
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: 'var(--space-md)',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to leave? Your progress will be saved.')) {
                  setView('list');
                  setCurrentExam(null);
                }
              }}
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={submitExam}
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: '1.1rem',
                fontWeight: 600
              }}
            >
              {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'results' && results) {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            Exam Results
          </h2>
          <div style={{
            fontSize: '4rem',
            fontWeight: 700,
            color: results.percentage >= 70 ? 'var(--success)' : 'var(--error)',
            marginBottom: 'var(--space-sm)'
          }}>
            {results.percentage}%
          </div>
          <div style={{
            fontSize: '1.5rem',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-lg)'
          }}>
            Grade: {results.grade} | Score: {results.score} / {results.maxScore}
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {results.strengths && results.strengths.length > 0 && (
            <div className="card card-elevated" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)', marginBottom: 'var(--space-md)' }}>
                Strengths
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                {results.strengths.map((topic, i) => (
                  <span key={i} style={{
                    padding: 'var(--space-xs) var(--space-md)',
                    background: 'var(--success)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem'
                  }}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.weaknesses && results.weaknesses.length > 0 && (
            <div className="card card-elevated" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--error)', marginBottom: 'var(--space-md)' }}>
                Areas for Improvement
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                {results.weaknesses.map((topic, i) => (
                  <span key={i} style={{
                    padding: 'var(--space-xs) var(--space-md)',
                    background: 'var(--error)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem'
                  }}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.recommendations && results.recommendations.length > 0 && (
            <div className="card card-elevated" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 'var(--space-md)' }}>
                Recommendations
              </h3>
              <ul style={{ paddingLeft: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
                {results.recommendations.map((rec, i) => (
                  <li key={i} style={{ marginBottom: 'var(--space-sm)' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)' }}>
            <button
              onClick={() => {
                setView('list');
                setResults(null);
                setCurrentExam(null);
              }}
              className="btn btn-primary"
            >
              Back to Exams
            </button>
            <button
              onClick={() => setView('history')}
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
            >
              <History size={18} />
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Exam History
          </h2>
          <button
            onClick={() => setView('list')}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)'
            }}
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        {attempts.length === 0 ? (
          <div className="card card-elevated" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
            <History size={64} style={{ color: 'var(--text-tertiary)', margin: '0 auto var(--space-lg)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No exam attempts yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {attempts.map((attempt) => (
              <div key={attempt.attemptId} className="card card-elevated">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                      {attempt.examId?.title || 'Practice Exam'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {new Date(attempt.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: attempt.percentage >= 70 ? 'var(--success)' : 'var(--error)'
                    }}>
                      {attempt.percentage.toFixed(1)}%
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {attempt.score} / {attempt.maxScore} | Grade: {attempt.grade}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
              Practice Exams
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: 'var(--space-xs)' }}>
              Test your knowledge for <strong style={{ color: 'var(--text-primary)' }}>{activeCourse.name}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              onClick={() => setView('history')}
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
            >
              <History size={18} />
              History
            </button>
            <button
              onClick={() => navigate('/generate')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
            >
              <GraduationCap size={18} />
              Generate New Exam
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
        </div>
      ) : exams.length === 0 ? (
        <div className="card card-elevated" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <GraduationCap size={64} style={{ color: 'var(--accent-primary)', margin: '0 auto var(--space-lg)' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
            No Exams Yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Generate your first practice exam from the Generate page
          </p>
          <button
            onClick={() => navigate('/generate')}
            className="btn btn-primary"
          >
            Go to Generate
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-lg)' }}>
          {exams.map((exam) => (
            <div key={exam.examId} className="card card-elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, var(--success) 0%, #2ea043 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GraduationCap size={28} style={{ color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {exam.title}
                  </h3>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', margin: 0 }}>
                    {exam.questionCount || exam.questions?.length || 0} questions
                  </p>
                </div>
              </div>
              
              {exam.stats && (
                <div style={{
                  padding: 'var(--space-sm)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 'var(--space-md)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  Avg Score: {exam.stats.averageScore?.toFixed(0) || 0}% | 
                  Attempts: {exam.stats.totalAttempts || 0}
                </div>
              )}

              <button
                onClick={() => startExam(exam.examId)}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)' }}
              >
                <Play size={18} />
                Start Exam
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Exams;

