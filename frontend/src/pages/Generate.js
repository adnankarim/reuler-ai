import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { generateApi } from '../services/api';
import { FileText, BookOpen, GraduationCap, Loader2, Sparkles, CheckCircle2, Download, Copy, X, AlertCircle, Settings } from 'lucide-react';

function Generate() {
  const { activeCourse } = useCourse();
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Options for each generation type
  const [options] = useState({
    summary: { format: 'structured', topics: [] },
    flashcards: { count: 20, difficulty: 'mixed', topics: [] },
    exam: { question_count: 10, question_types: ['multiple_choice', 'short_answer'], difficulty: 'mixed', topics: [] }
  });

  const handleGenerate = async (type) => {
    if (!activeCourse) {
      setError('Please select a course first');
      return;
    }

    setLoading(type);
    setResult(null);
    setError(null);

    try {
      const courseId = activeCourse.courseId || activeCourse._id;
      let data;
      
      switch (type) {
        case 'summary':
          data = await generateApi.summary(courseId, options.summary);
          break;
        case 'flashcards':
          data = await generateApi.flashcards(courseId, options.flashcards);
          break;
        case 'exam':
          data = await generateApi.exam(courseId, options.exam);
          break;
        default:
          return;
      }
      
      setResult({ type, data });
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to generate. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const renderSummary = (data) => {
    if (!data) return null;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {data.summary && (
          <div className="card card-elevated">
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
              Summary
            </h3>
            <div style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap'
            }}>
              {typeof data.summary === 'string' ? data.summary : JSON.stringify(data.summary, null, 2)}
            </div>
          </div>
        )}
        
        {data.key_concepts && data.key_concepts.length > 0 && (
          <div className="card card-elevated">
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-md)'
            }}>
              Key Concepts
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)'
            }}>
              {data.key_concepts.map((concept, i) => (
                <span
                  key={i}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-muted)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    border: '1px solid var(--accent-primary)'
                  }}
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFlashcards = (data) => {
    if (!data || !data.cards) return null;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-sm)'
        }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {data.cards.length} flashcards generated
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: 'var(--space-md)'
        }}>
          {data.cards.map((card, i) => (
            <div
              key={i}
              className="card card-elevated"
              style={{
                transition: 'all var(--transition-base)',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--bg-elevated)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--bg-tertiary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              <div style={{
                paddingBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--bg-tertiary)',
                marginBottom: 'var(--space-md)'
              }}>
                <h4 style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  marginBottom: 'var(--space-sm)'
                }}>
                  {card.front || card.question || `Card ${i + 1}`}
                </h4>
              </div>
              <div style={{
                color: 'var(--text-secondary)',
                lineHeight: 1.7
              }}>
                {card.back || card.answer || card.definition || 'No answer provided'}
              </div>
              {card.topic && (
                <div style={{
                  marginTop: 'var(--space-sm)',
                  paddingTop: 'var(--space-sm)',
                  borderTop: '1px solid var(--bg-tertiary)'
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    padding: '3px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {card.topic}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderExam = (data) => {
    if (!data || !data.questions) return null;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-sm)'
        }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {data.questions.length} questions generated
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {data.questions.map((question, i) => (
            <div key={i} className="card card-elevated">
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-md)'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--accent-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  fontSize: '0.875rem'
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    marginBottom: 'var(--space-sm)'
                  }}>
                    {question.question || question.text || `Question ${i + 1}`}
                  </h4>
                  
                  {question.type === 'multiple_choice' && question.options && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-xs)',
                      marginTop: 'var(--space-sm)'
                    }}>
                      {question.options.map((option, optIdx) => (
                        <div
                          key={optIdx}
                          style={{
                            padding: 'var(--space-sm)',
                            background: option === question.correct_answer ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            border: option === question.correct_answer ? '1px solid var(--accent-primary)' : '1px solid var(--bg-elevated)',
                            color: option === question.correct_answer ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: option === question.correct_answer ? 500 : 400
                          }}
                        >
                          {String.fromCharCode(65 + optIdx)}. {option}
                          {option === question.correct_answer && (
                            <CheckCircle2 size={16} style={{ 
                              marginLeft: 'var(--space-xs)',
                              display: 'inline',
                              verticalAlign: 'middle'
                            }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.answer && (
                    <div style={{
                      marginTop: 'var(--space-md)',
                      padding: 'var(--space-md)',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--success)'
                    }}>
                      <p style={{
                        color: 'var(--text-secondary)',
                        margin: 0,
                        fontSize: '0.9rem'
                      }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Answer:</strong> {question.answer}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!activeCourse) {
    return (
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center', 
        padding: 'var(--space-3xl)',
        minHeight: '400px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--accent-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-lg)'
        }}>
          <Sparkles size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h3 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 600, 
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-sm)'
        }}>
          No Course Selected
        </h3>
        <p style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: 'var(--space-md)',
          lineHeight: 1.6
        }}>
          Please select a course from the Dashboard to generate study materials.
        </p>
      </div>
    );
  }

  const generationOptions = [
    {
      id: 'summary',
      label: 'Summary',
      icon: FileText,
      description: 'Generate a structured summary of course materials',
      color: 'var(--info)',
      gradient: 'linear-gradient(135deg, var(--info) 0%, #4493ff 100%)'
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: BookOpen,
      description: 'Create flashcards for key concepts',
      color: 'var(--accent-primary)',
      gradient: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)'
    },
    {
      id: 'exam',
      label: 'Practice Exam',
      icon: GraduationCap,
      description: 'Generate a practice exam with questions',
      color: 'var(--success)',
      gradient: 'linear-gradient(135deg, var(--success) 0%, #2ea043 100%)'
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 'var(--space-2xl)' 
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-sm)'
          }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              margin: 0
            }}>
              Generate Study Materials
            </h1>
            <div style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-muted)',
              border: '1px solid var(--accent-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--accent-primary)'
            }}>
              {activeCourse.name || activeCourse.code || 'Course'}
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Create study materials for <strong style={{ color: 'var(--text-primary)' }}>{activeCourse.name}</strong>
          </p>
          <p style={{ 
            color: 'var(--text-tertiary)', 
            fontSize: '0.875rem',
            marginTop: 'var(--space-xs)'
          }}>
            Generate summaries, flashcards, and practice exams from your course documents
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'rgba(248, 81, 73, 0.1)',
          border: '1px solid var(--error)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)'
        }}>
          <AlertCircle size={18} style={{ color: 'var(--error)' }} />
          <span style={{ color: 'var(--error)', fontSize: '0.9rem' }}>{error}</span>
        </div>
      )}

      {/* Generation Options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 'var(--space-lg)',
        marginBottom: result ? 'var(--space-2xl)' : 0
      }}>
        {generationOptions.map((option) => {
          const Icon = option.icon;
          const isLoading = loading === option.id;
          const hasResult = result && result.type === option.id;
          
          return (
            <div
              key={option.id}
              className="card card-elevated"
              style={{
                transition: 'all var(--transition-base)',
                cursor: 'default',
                border: hasResult ? '2px solid var(--accent-primary)' : '1px solid var(--bg-tertiary)'
              }}
              onMouseEnter={(e) => {
                if (!hasResult) {
                  e.currentTarget.style.borderColor = 'var(--bg-elevated)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!hasResult) {
                  e.currentTarget.style.borderColor = 'var(--bg-tertiary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                background: option.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-md)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}>
                <Icon size={28} style={{ color: 'var(--text-primary)' }} />
              </div>
              
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-xs)'
              }}>
                {option.label}
              </h3>
              
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                marginBottom: 'var(--space-lg)',
                lineHeight: 1.6
              }}>
                {option.description}
              </p>
              
              <div style={{
                display: 'flex',
                gap: 'var(--space-sm)'
              }}>
                <button
                  onClick={() => handleGenerate(option.id)}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: 'var(--space-sm) var(--space-md)',
                    background: option.gradient,
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-xs)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    opacity: isLoading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </>
                  ) : hasResult ? (
                    <>
                      <CheckCircle2 size={18} />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate
                    </>
                  )}
                </button>
                
                {hasResult && (
                  <button
                    onClick={() => setResult(null)}
                    style={{
                      padding: 'var(--space-sm)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-tertiary)';
                    }}
                    title="Clear result"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Results */}
      {result && (
        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-lg)'
          }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
              Generated {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
            </h2>
            <button
              onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-elevated)';
                e.currentTarget.style.borderColor = 'var(--text-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--bg-elevated)';
              }}
            >
              <Copy size={16} />
              Copy JSON
            </button>
          </div>
          
          {result.type === 'summary' && renderSummary(result.data)}
          {result.type === 'flashcards' && renderFlashcards(result.data)}
          {result.type === 'exam' && renderExam(result.data)}
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

export default Generate;
