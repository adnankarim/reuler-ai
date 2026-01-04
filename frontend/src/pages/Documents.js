import React, { useState, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { documentsApi } from '../services/api';
import { Upload, FileText, Trash2, Loader2, CheckCircle2, Clock, FileCheck, AlertCircle, X } from 'lucide-react';

function Documents() {
  const { activeCourse } = useCourse();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (activeCourse) {
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse]);

  const loadDocuments = async () => {
    if (!activeCourse) return;
    try {
      setLoading(true);
      const courseId = activeCourse._id || activeCourse.courseId;
      const data = await documentsApi.getByCourse(courseId);
      setDocuments(data || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (!activeCourse) {
      alert('Please select a course first before uploading documents.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading to ${activeCourse.name}...`);
    try {
      const courseId = activeCourse._id || activeCourse.courseId;
      const courseName = activeCourse.name || activeCourse.code || 'Course';
      
      console.log('[DOCUMENT UPLOAD] Uploading to course:', {
        courseId,
        courseName,
        filename: file.name
      });
      
      await documentsApi.upload(file, courseId, 'notes', courseName);
      setUploadProgress(`Document added to ${activeCourse.name}!`);
      await loadDocuments();
      setTimeout(() => {
        setUploadProgress(null);
      }, 2000);
      e.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress('Upload failed');
      setTimeout(() => {
        setUploadProgress(null);
      }, 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await documentsApi.delete(docId);
      setDeleteConfirm(null);
      await loadDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
      setDeleteConfirm(null);
      alert('Failed to delete document.');
    }
  };

  const confirmDelete = (doc) => {
    setDeleteConfirm({
      docId: doc._id || doc.id || doc.documentId,
      filename: doc.filename || doc.title || doc.originalName || 'this document'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDocTypeLabel = (docType) => {
    const labels = {
      'syllabus': 'Syllabus',
      'notes': 'Notes',
      'paper': 'Paper',
      'slides': 'Slides',
      'other': 'Other'
    };
    return labels[docType] || docType || 'Document';
  };

  const getDocTypeColor = (docType) => {
    const colors = {
      'syllabus': 'var(--info)',
      'notes': 'var(--accent-primary)',
      'paper': 'var(--success)',
      'slides': 'var(--warning)',
      'other': 'var(--text-tertiary)'
    };
    return colors[docType] || 'var(--text-tertiary)';
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
          <FileText size={32} style={{ color: 'var(--accent-primary)' }} />
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
          Please select a course from the Dashboard to view and manage its documents.
        </p>
        <p style={{ 
          color: 'var(--text-tertiary)', 
          fontSize: '0.875rem'
        }}>
          Each course has its own isolated document collection.
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
              Documents
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
            Manage course materials for <strong style={{ color: 'var(--text-primary)' }}>{activeCourse.name}</strong>
            {activeCourse.code && ` (${activeCourse.code})`}
          </p>
          <p style={{ 
            color: 'var(--text-tertiary)', 
            fontSize: '0.875rem',
            marginTop: 'var(--space-xs)'
          }}>
            Documents uploaded here will only be available for this course
          </p>
          {documents.length > 0 && (
            <p style={{ 
              color: 'var(--text-tertiary)', 
              fontSize: '0.875rem',
              marginTop: 'var(--space-xs)'
            }}>
              {documents.length} document{documents.length !== 1 ? 's' : ''} • {' '}
              {documents.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0)} total chunks
            </p>
          )}
        </div>
        <label 
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Processing...
            </>
          ) : (
            <>
              <Upload size={18} />
              Upload Document
            </>
          )}
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div style={{
          padding: 'var(--space-md)',
          background: uploadProgress.includes('failed') 
            ? 'rgba(248, 81, 73, 0.1)' 
            : 'rgba(63, 185, 80, 0.1)',
          border: `1px solid ${uploadProgress.includes('failed') ? 'var(--error)' : 'var(--success)'}`,
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)'
        }}>
          {uploadProgress.includes('failed') ? (
            <AlertCircle size={18} style={{ color: 'var(--error)' }} />
          ) : (
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
          )}
          <span style={{ 
            color: uploadProgress.includes('failed') ? 'var(--error)' : 'var(--success)',
            fontSize: '0.9rem'
          }}>
            {uploadProgress}
          </span>
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        /* Empty State */
        <div className="card card-elevated" style={{ 
          textAlign: 'center', 
          padding: 'var(--space-3xl)',
          maxWidth: '600px',
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
            <FileText size={48} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            No documents yet
          </h3>
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: 'var(--space-lg)',
            lineHeight: 1.6
          }}>
            Upload PDF documents (syllabus, lecture notes, papers) to enable AI-powered Q&A and study material generation.
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={18} style={{ marginRight: 'var(--space-sm)' }} />
            Upload Your First Document
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      ) : (
        /* Documents Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: 'var(--space-lg)'
        }}>
          {documents.map((doc) => {
            const docType = doc.docType || doc.type || 'notes';
            const docTypeColor = getDocTypeColor(docType);
            
            return (
              <div
                key={doc._id || doc.id || doc.documentId}
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
                {/* Document Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 'var(--space-md)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-md)',
                    flex: 1
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        fontWeight: 600, 
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-xs)',
                        fontSize: '1rem',
                        wordBreak: 'break-word'
                      }}>
                        {doc.filename || doc.title || doc.originalName || 'Document'}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: `${docTypeColor}20`,
                          color: docTypeColor,
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {getDocTypeLabel(docType)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(doc);
                      }}
                      style={{ 
                        color: 'var(--text-tertiary)', 
                        padding: 'var(--space-sm)',
                        flexShrink: 0,
                        transition: 'all var(--transition-fast)',
                        background: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(248, 81, 73, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(248, 81, 73, 0.3)';
                        e.currentTarget.style.color = 'var(--error)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.95)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      title="Delete document"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Document Stats */}
                <div style={{
                  paddingTop: 'var(--space-md)',
                  borderTop: '1px solid var(--bg-tertiary)',
                  display: 'flex',
                  gap: 'var(--space-md)',
                  flexWrap: 'wrap'
                }}>
                  {doc.chunkCount && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem'
                    }}>
                      <FileCheck size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span>{doc.chunkCount} chunks</span>
                    </div>
                  )}
                  {doc.uploadedAt && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      color: 'var(--text-tertiary)',
                      fontSize: '0.875rem'
                    }}>
                      <Clock size={16} />
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </div>
                  )}
                  {doc.concepts && doc.concepts.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem'
                    }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                      <span>{doc.concepts.length} concepts</span>
                    </div>
                  )}
                </div>

                {/* Concepts Preview */}
                {doc.concepts && doc.concepts.length > 0 && (
                  <div style={{
                    marginTop: 'var(--space-md)',
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--bg-tertiary)'
                  }}>
                    <p style={{
                      color: 'var(--text-tertiary)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      marginBottom: 'var(--space-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Key Concepts
                    </p>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-xs)'
                    }}>
                      {doc.concepts.slice(0, 5).map((concept, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            border: '1px solid var(--bg-tertiary)'
                          }}
                        >
                          {concept}
                        </span>
                      ))}
                      {doc.concepts.length > 5 && (
                        <span style={{
                          padding: '4px 8px',
                          color: 'var(--text-tertiary)',
                          fontSize: '0.75rem'
                        }}>
                          +{doc.concepts.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="card card-elevated" 
            style={{
              width: '100%',
              maxWidth: '500px',
              margin: 'var(--space-lg)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--bg-elevated)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideUp 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(248, 81, 73, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertCircle size={24} style={{ color: 'var(--error)' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Delete Document
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-ghost"
                style={{
                  padding: 'var(--space-xs)',
                  color: 'var(--text-tertiary)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: 'var(--space-md)',
              background: 'rgba(248, 81, 73, 0.1)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid var(--error)',
              marginBottom: 'var(--space-lg)'
            }}>
              <p style={{
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.6
              }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.filename}</strong>?
              </p>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                margin: 'var(--space-sm) 0 0 0',
                lineHeight: 1.6
              }}>
                All associated chunks and embeddings will be removed from the vector store. This will affect search results and AI responses.
              </p>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-sm)'
            }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.borderColor = 'var(--text-tertiary)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.borderColor = 'var(--bg-elevated)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.docId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-md) var(--space-lg)',
                  background: 'linear-gradient(135deg, var(--error) 0%, #d43f3a 100%)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  boxShadow: '0 4px 12px rgba(248, 81, 73, 0.4)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #d43f3a 0%, #c0392b 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(248, 81, 73, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--error) 0%, #d43f3a 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(248, 81, 73, 0.4)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(248, 81, 73, 0.3)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(248, 81, 73, 0.5)';
                }}
              >
                <Trash2 size={18} style={{ 
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
                }} />
                <span>Delete Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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

export default Documents;
