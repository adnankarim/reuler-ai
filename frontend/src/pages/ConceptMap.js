import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { coursesApi } from '../services/api';
import { Network, Loader2, Sparkles, BookOpen, TrendingUp, AlertCircle, CheckCircle2, Zap, ArrowRight } from 'lucide-react';

function ConceptMap() {
  const { activeCourse } = useCourse();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState(null);

  const loadConcepts = async () => {
    if (!activeCourse) return;
    
    try {
      setLoading(true);
      setError(null);
      const courseId = activeCourse.courseId || activeCourse._id;
      const data = await coursesApi.getConcepts(courseId);
      
      if (data && (data.nodes?.length > 0 || data.learning_paths?.length > 0)) {
        setGraph(data);
      } else {
        setGraph(null);
      }
    } catch (error) {
      console.error('Failed to load concepts:', error);
      setError('Failed to load concept graph');
      setGraph(null);
    } finally {
      setLoading(false);
    }
  };

  const buildGraph = async () => {
    if (!activeCourse) return;
    
    try {
      setBuilding(true);
      setError(null);
      const courseId = activeCourse.courseId || activeCourse._id;
      
      console.log('[CONCEPT MAP] Building graph for course:', courseId);
      
      const response = await coursesApi.buildConceptGraph(courseId);
      
      console.log('[CONCEPT MAP] Build response:', response);
      
      // If response includes graph data, set it directly
      if (response.nodes && response.nodes.length > 0) {
        setGraph({
          nodes: response.nodes,
          edges: response.edges || [],
          learning_paths: response.learning_paths || response.learningPaths || []
        });
        setError(null); // Clear any previous errors
      } else {
        // Wait a bit then reload
        setTimeout(() => {
          loadConcepts();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to build graph:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to build concept graph. Make sure you have documents uploaded.';
      setError(errorMessage);
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    if (activeCourse) {
      loadConcepts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse]);

  const getDifficultyColor = (difficulty) => {
    if (difficulty <= 2) return 'var(--success)';
    if (difficulty <= 3) return 'var(--info)';
    if (difficulty <= 4) return 'var(--warning)';
    return 'var(--error)';
  };

  const getDifficultyLabel = (difficulty) => {
    if (difficulty <= 2) return 'Beginner';
    if (difficulty <= 3) return 'Intermediate';
    if (difficulty <= 4) return 'Advanced';
    return 'Expert';
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
          <Network size={32} style={{ color: 'var(--accent-primary)' }} />
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
          Please select a course from the Dashboard to view its concept map.
        </p>
      </div>
    );
  }

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
              Concept Map
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
            Visualize relationships between concepts in <strong style={{ color: 'var(--text-primary)' }}>{activeCourse.name}</strong>
          </p>
          {graph && graph.nodes && (
            <p style={{ 
              color: 'var(--text-tertiary)', 
              fontSize: '0.875rem',
              marginTop: 'var(--space-xs)'
            }}>
              {graph.nodes.length} concepts • {graph.edges?.length || 0} relationships
            </p>
          )}
        </div>
        {(!graph || !graph.nodes || graph.nodes.length === 0) && (
          <button
            onClick={buildGraph}
            disabled={building}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              opacity: building ? 0.7 : 1
            }}
          >
            {building ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Building...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Build Concept Graph
              </>
            )}
          </button>
        )}
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
          alignItems: 'flex-start',
          gap: 'var(--space-sm)'
        }}>
          <AlertCircle size={18} style={{ color: 'var(--error)', marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ 
              color: 'var(--error)', 
              fontSize: '0.9rem',
              fontWeight: 500,
              margin: 0,
              marginBottom: 'var(--space-xs)'
            }}>
              {error.includes('Validation') ? 'Validation Error' : error.includes('No documents') ? 'No Documents Found' : 'Error'}
            </p>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.875rem',
              margin: 0,
              lineHeight: 1.5
            }}>
              {error.includes('Validation') 
                ? 'There was an issue saving the concept graph. Please try again or contact support if the problem persists.'
                : error.includes('No documents')
                ? 'Please upload documents to this course first. Go to the Documents page to upload PDF files.'
                : error}
            </p>
            {error.includes('No documents') && (
              <button
                onClick={() => navigate('/documents')}
                style={{
                  marginTop: 'var(--space-sm)',
                  padding: 'var(--space-xs) var(--space-md)',
                  background: 'var(--error)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d43f3a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--error)';
                }}
              >
                Go to Documents
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="card card-elevated" style={{ 
          textAlign: 'center', 
          padding: 'var(--space-3xl)'
        }}>
          <Loader2 size={32} style={{ 
            color: 'var(--accent-primary)', 
            margin: '0 auto var(--space-md)',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading concept graph...</p>
        </div>
      ) : !graph || !graph.nodes || graph.nodes.length === 0 ? (
        /* Empty State */
        <div className="card card-elevated" style={{ 
          textAlign: 'center', 
          padding: 'var(--space-3xl)',
          maxWidth: '700px',
          margin: '0 auto'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto var(--space-lg)',
            borderRadius: '50%',
            background: 'var(--accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Network size={48} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            No Concept Graph Yet
          </h3>
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: 'var(--space-lg)',
            lineHeight: 1.6
          }}>
            Build a concept graph to visualize relationships between concepts in your course materials. 
            This helps you understand prerequisites and learning paths.
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            alignItems: 'center'
          }}>
            <button
              onClick={buildGraph}
              disabled={building}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                opacity: building ? 0.7 : 1
              }}
            >
              {building ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Building Graph...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Build Concept Graph
                </>
              )}
            </button>
            <p style={{ 
              color: 'var(--text-tertiary)', 
              fontSize: '0.875rem',
              marginTop: 'var(--space-sm)'
            }}>
              Make sure you have documents uploaded for this course
            </p>
          </div>
        </div>
      ) : (
        /* Concept Graph Visualization */
        <div>
          {/* Learning Paths Section */}
          {(graph.learning_paths || graph.learningPaths) && (graph.learning_paths || graph.learningPaths).length > 0 && (
            <div className="card card-elevated" style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)'
              }}>
                <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Recommended Learning Paths
                </h3>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)'
              }}>
                {(graph.learning_paths || graph.learningPaths || []).slice(0, 3).map((path, idx) => {
                  const pathNodes = path.map(id => 
                    graph.nodes.find(n => n.id === id)
                  ).filter(Boolean);
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 'var(--space-md)',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--bg-tertiary)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          color: 'var(--text-tertiary)',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}>
                          Path {idx + 1}:
                        </span>
                        {pathNodes.map((node, i) => (
                          <React.Fragment key={node.id}>
                            <span style={{
                              padding: '4px 10px',
                              background: 'var(--accent-muted)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--accent-primary)',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              {node.name}
                            </span>
                            {i < pathNodes.length - 1 && (
                              <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Concepts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--space-lg)'
          }}>
            {graph.nodes.map((node) => {
              const difficulty = node.difficulty || 3;
              const difficultyColor = getDifficultyColor(difficulty);
              const difficultyLabel = getDifficultyLabel(difficulty);
              
              // Find prerequisites
              const prerequisites = graph.edges
                ?.filter(e => e.target === node.id || e.to === node.id)
                .map(e => {
                  const prereqId = e.source || e.from;
                  return graph.nodes.find(n => n.id === prereqId);
                })
                .filter(Boolean) || [];
              
              // Find concepts that depend on this one
              const dependents = graph.edges
                ?.filter(e => (e.source === node.id || e.from === node.id) && e.target !== node.id)
                .map(e => {
                  const depId = e.target || e.to;
                  return graph.nodes.find(n => n.id === depId);
                })
                .filter(Boolean) || [];

              return (
                <div
                  key={node.id}
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
                  {/* Concept Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--space-md)'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} />
                        <h4 style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          fontSize: '1.1rem',
                          margin: 0
                        }}>
                          {node.name}
                        </h4>
                      </div>
                      {node.description && (
                        <p style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          margin: 0
                        }}>
                          {node.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--bg-tertiary)'
                  }}>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: `${difficultyColor}20`,
                      border: `1px solid ${difficultyColor}`,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: difficultyColor
                    }}>
                      {difficultyLabel} (Level {difficulty})
                    </div>
                  </div>

                  {/* Prerequisites */}
                  {prerequisites.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <p style={{
                        color: 'var(--text-tertiary)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        marginBottom: 'var(--space-xs)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Prerequisites
                      </p>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-xs)'
                      }}>
                        {prerequisites.map((prereq) => (
                          <span
                            key={prereq.id}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              border: '1px solid var(--bg-elevated)'
                            }}
                          >
                            {prereq.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dependents */}
                  {dependents.length > 0 && (
                    <div>
                      <p style={{
                        color: 'var(--text-tertiary)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        marginBottom: 'var(--space-xs)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Required For
                      </p>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-xs)'
                      }}>
                        {dependents.map((dep) => (
                          <span
                            key={dep.id}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--accent-muted)',
                              color: 'var(--accent-primary)',
                              fontSize: '0.75rem',
                              border: '1px solid var(--accent-primary)'
                            }}
                          >
                            {dep.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

export default ConceptMap;
