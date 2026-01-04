import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useSession } from '../context/SessionContext';
import { Send, Loader2, BookOpen, AlertCircle, CheckCircle2, FileText, ExternalLink } from 'lucide-react';

function Study() {
  const { sessionId: paramSessionId } = useParams();
  const { activeCourse } = useCourse();
  const { activeSession, messages, sending, sendMessage, loadSessions } = useSession();
  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeCourse) {
      loadSessions();
    }
  }, [activeCourse, loadSessions]);

  useEffect(() => {
    if (paramSessionId && activeSession?._id !== paramSessionId) {
      // Find and select the session
      // This would need sessions list from context
    }
  }, [paramSessionId, activeSession]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      return;
    }
    
    if (!activeCourse) {
      alert('Please select a course first before asking questions.');
      return;
    }

    const questionText = question;
    setQuestion('');

    try {
      console.log('[CHAT] Sending message for course:', {
        courseId: activeCourse._id || activeCourse.courseId,
        courseName: activeCourse.name,
        question: questionText.substring(0, 50)
      });
      
      await sendMessage(questionText);
    } catch (error) {
      console.error('Chat error:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const renderStructuredAnswer = (answer) => {
    if (!answer || typeof answer !== 'object') return null;

    return (
      <div style={{ marginTop: 'var(--space-md)' }}>
        {answer.definition && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-xs)'
            }}>
              <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} />
              <h4 style={{ 
                fontWeight: 600, 
                color: 'var(--accent-primary)',
                fontSize: '0.95rem'
              }}>
                Definition
              </h4>
            </div>
            <p style={{ 
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              paddingLeft: 'var(--space-lg)'
            }}>
              {answer.definition}
            </p>
          </div>
        )}

        {answer.explanation && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              marginBottom: 'var(--space-xs)'
            }}>
              Explanation
            </h4>
            <p style={{ 
              color: 'var(--text-secondary)',
              lineHeight: 1.7
            }}>
              {answer.explanation}
            </p>
          </div>
        )}

        {answer.example && (
          <div style={{ 
            marginBottom: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--accent-primary)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-xs)'
            }}>
              <CheckCircle2 size={18} style={{ color: 'var(--accent-primary)' }} />
              <h4 style={{ 
                fontWeight: 600, 
                color: 'var(--accent-primary)',
                fontSize: '0.95rem'
              }}>
                Example
              </h4>
            </div>
            <p style={{ 
              color: 'var(--text-secondary)',
              lineHeight: 1.7
            }}>
              {answer.example}
            </p>
          </div>
        )}

        {answer.pitfalls && answer.pitfalls.length > 0 && (
          <div style={{ 
            marginTop: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'rgba(248, 81, 73, 0.1)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--error)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-sm)'
            }}>
              <AlertCircle size={18} style={{ color: 'var(--error)' }} />
              <h4 style={{ 
                fontWeight: 600, 
                color: 'var(--error)',
                fontSize: '0.95rem'
              }}>
                Common Pitfalls
              </h4>
            </div>
            <ul style={{ 
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {answer.pitfalls.map((pitfall, i) => (
                <li key={i} style={{ 
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)',
                  paddingLeft: 'var(--space-md)',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--error)'
                  }}>•</span>
                  {pitfall}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderSources = (sources, hasCourseMaterial = true) => {
    if (!sources || sources.length === 0) {
      return (
        <div style={{
          marginTop: 'var(--space-lg)',
          paddingTop: 'var(--space-md)',
          borderTop: '1px solid var(--bg-tertiary)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-sm)'
          }}>
            <FileText size={16} style={{ color: 'var(--text-tertiary)' }} />
            <h4 style={{
              fontWeight: 600,
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              References
            </h4>
          </div>
          {hasCourseMaterial ? (
            <p style={{
              color: 'var(--text-tertiary)',
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}>
              No specific sources retrieved from course documents for this answer.
            </p>
          ) : (
            <div style={{
              padding: 'var(--space-md)',
              background: 'rgba(88, 166, 255, 0.1)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid var(--info)'
            }}>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                margin: 0,
                lineHeight: 1.6
              }}>
                <strong style={{ color: 'var(--info)' }}>Note:</strong> This answer is based on general knowledge. 
                No course-specific documents were found for this topic. Upload course materials to get answers 
                based on your specific curriculum.
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{
        marginTop: 'var(--space-lg)',
        paddingTop: 'var(--space-md)',
        borderTop: '1px solid var(--bg-tertiary)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-md)'
        }}>
          <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
          <h4 style={{
            fontWeight: 600,
            color: 'var(--accent-primary)',
            fontSize: '0.95rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Source Documents ({sources.length})
          </h4>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)'
        }}>
          {sources.map((source, i) => {
            const sourceTitle = source.title || source.filename || source.document_title || source.chunk_id || `Source ${i + 1}`;
            const sourcePage = source.page || source.page_number;
            const sourceExcerpt = source.excerpt || source.content;
            const confidence = source.confidence || source.score;
            
            return (
              <div
                key={i}
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--bg-elevated)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--bg-elevated)';
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-sm)',
                  marginBottom: sourceExcerpt ? 'var(--space-sm)' : 0
                }}>
                  <ExternalLink size={16} style={{ 
                    color: 'var(--accent-primary)',
                    marginTop: '2px',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      marginBottom: 'var(--space-xs)',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ 
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                      }}>
                        {sourceTitle}
                      </span>
                      {sourcePage && (
                        <span style={{
                          color: 'var(--text-tertiary)',
                          fontSize: '0.75rem',
                          background: 'var(--bg-tertiary)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          Page {sourcePage}
                        </span>
                      )}
                      {confidence && (
                        <span style={{
                          color: 'var(--accent-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: 'var(--accent-muted)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {Math.round(confidence * 100)}% match
                        </span>
                      )}
                    </div>
                    {sourceExcerpt && (
                      <p style={{
                        color: 'var(--text-tertiary)',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        fontStyle: 'italic',
                        margin: 0,
                        marginTop: 'var(--space-xs)',
                        paddingLeft: 'var(--space-md)',
                        borderLeft: '2px solid var(--bg-elevated)'
                      }}>
                        "{sourceExcerpt.length > 150 ? sourceExcerpt.substring(0, 150) + '...' : sourceExcerpt}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
        <BookOpen size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }} />
        <p style={{ 
          color: 'var(--text-secondary)',
          fontSize: '1.1rem',
          marginBottom: 'var(--space-sm)'
        }}>
          Please select a course to start studying
        </p>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          Go to Dashboard to select or create a course
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 200px)'
    }}>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
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
            Study Chat
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
          Ask questions about <strong style={{ color: 'var(--text-primary)' }}>{activeCourse.name}</strong>
          {activeCourse.code && ` (${activeCourse.code})`}
        </p>
        <p style={{ 
          color: 'var(--text-tertiary)', 
          fontSize: '0.875rem',
          marginTop: 'var(--space-xs)'
        }}>
          Only documents from this course will be used for answers
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--bg-tertiary)',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
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
              <BookOpen size={32} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <p style={{ 
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-sm)'
            }}>
              Start a conversation by asking a question
            </p>
            <p style={{ 
              fontSize: '0.95rem', 
              marginTop: 'var(--space-xs)',
              color: 'var(--text-tertiary)'
            }}>
              Try: "What is machine learning?" or "Explain gradient descent"
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const answer = msg.answer || (typeof msg.content === 'object' ? msg.content : null);
              const content = typeof msg.content === 'string' ? msg.content : null;
              const sources = msg.sources || [];

              return (
                <div
                  key={msg.id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    animation: 'slideUp 0.3s ease'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '75%',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-md)',
                      background: isUser 
                        ? 'var(--accent-primary)' 
                        : 'var(--bg-tertiary)',
                      color: isUser 
                        ? 'var(--bg-primary)' 
                        : 'var(--text-primary)',
                      border: isUser 
                        ? 'none' 
                        : '1px solid var(--bg-elevated)',
                      boxShadow: isUser 
                        ? 'var(--shadow-md)' 
                        : 'var(--shadow-sm)'
                    }}
                  >
                    {isUser ? (
                      <p style={{ 
                        margin: 0,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.content}
                      </p>
                    ) : (
                      <>
                        {content && (
                          <p style={{ 
                            margin: 0,
                            marginBottom: answer ? 'var(--space-md)' : 0,
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {content}
                          </p>
                        )}
                        {answer && renderStructuredAnswer(answer)}
                        {renderSources(sources, msg.has_course_material !== false)}
                        {/* Debug: Show raw sources if available */}
                        {process.env.NODE_ENV === 'development' && (
                          <details style={{ marginTop: 'var(--space-md)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            <summary style={{ cursor: 'pointer' }}>Debug: Response data</summary>
                            <pre style={{ 
                              marginTop: 'var(--space-xs)',
                              padding: 'var(--space-sm)',
                              background: 'var(--bg-primary)',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'auto',
                              fontSize: '0.7rem'
                            }}>
                              {JSON.stringify({
                                sources: msg.sources,
                                has_course_material: msg.has_course_material,
                                confidence: msg.confidence
                              }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start'
              }}>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  border: '1px solid var(--bg-elevated)'
                }}>
                  <Loader2 size={20} style={{ 
                    color: 'var(--accent-primary)',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        display: 'flex',
        gap: 'var(--space-sm)'
      }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the course material..."
          className="input"
          style={{
            flex: 1,
            padding: 'var(--space-md)',
            fontSize: '1rem'
          }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !question.trim()}
          className="btn btn-primary"
          style={{
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            minWidth: '120px',
            justifyContent: 'center'
          }}
        >
          {sending ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Sending...
            </>
          ) : (
            <>
              <Send size={18} />
              Send
            </>
          )}
        </button>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Study;
