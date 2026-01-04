import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { Plus, BookOpen, FileText, MessageSquare, Trash2, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { courses, activeCourse, createCourse, selectCourse, deleteCourse } = useCourse();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const handleDeleteCourse = async (course) => {
    try {
      const courseId = course._id || course.courseId;
      await deleteCourse(courseId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    
    if (!courseName.trim()) {
      alert('Please enter a course name');
      return;
    }
    
    try {
      const newCourse = await createCourse({
        name: courseName.trim(),
        code: courseCode.trim() || undefined,
        description: description.trim() || undefined,
      });
      setShowCreateModal(false);
      setCourseName('');
      setCourseCode('');
      setDescription('');
    } catch (error) {
      console.error('Failed to create course:', error);
      const errorMessage = error.message || 'Failed to create course. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 'var(--space-2xl)' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            marginBottom: 'var(--space-sm)'
          }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Manage your courses and learning materials
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
          }}
        >
          <Plus size={20} />
          New Course
        </button>
      </div>

      {/* Courses Grid */}
      {courses.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-lg)'
        }}>
          {courses.map((course) => (
          <div
            key={course._id}
            className="card card-elevated"
            style={{
              cursor: 'pointer',
              border: (activeCourse?._id === course._id || activeCourse?.courseId === course.courseId)
                ? '2px solid var(--accent-primary)' 
                : '1px solid var(--bg-tertiary)',
              boxShadow: (activeCourse?._id === course._id || activeCourse?.courseId === course.courseId)
                ? 'var(--shadow-glow)' 
                : 'var(--shadow-md)'
            }}
            onClick={() => {
              console.log('[DASHBOARD] Course clicked:', {
                _id: course._id,
                courseId: course.courseId,
                name: course.name
              });
              selectCourse(course);
              // Navigate to Documents page to show course-specific documents
              navigate('/documents');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--bg-elevated)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              const isActive = activeCourse?._id === course._id || activeCourse?.courseId === course.courseId;
              e.currentTarget.style.borderColor = isActive
                ? 'var(--accent-primary)' 
                : 'var(--bg-tertiary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 600, 
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-xs)'
                }}>
                  {course.name}
                </h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  {course.code}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <BookOpen size={32} style={{ color: 'var(--accent-primary)' }} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(course);
                  }}
                  style={{
                    padding: 'var(--space-xs)',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(248, 81, 73, 0.15)';
                    e.currentTarget.style.color = 'var(--error)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                  title="Delete course"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            {course.description && (
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '0.9rem',
                marginBottom: 'var(--space-md)',
                lineHeight: 1.6
              }}>
                {course.description}
              </p>
            )}
            <div style={{ 
              display: 'flex', 
              gap: 'var(--space-sm)',
              paddingTop: 'var(--space-md)',
              borderTop: '1px solid var(--bg-tertiary)'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectCourse(course);
                  navigate('/documents');
                }}
                style={{
                  flex: 1,
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-xs)'
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
                <FileText size={16} />
                Documents
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectCourse(course);
                  navigate('/study');
                }}
                style={{
                  flex: 1,
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-xs)',
                  boxShadow: '0 2px 8px rgba(212, 163, 115, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-hover) 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 163, 115, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(212, 163, 115, 0.3)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(212, 163, 115, 0.3)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 163, 115, 0.4)';
                }}
              >
                <MessageSquare size={16} />
                Study
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {courses.length === 0 && (
        <div className="card card-elevated" style={{ 
          textAlign: 'center', 
          padding: 'var(--space-3xl)',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <BookOpen size={64} style={{ color: 'var(--text-tertiary)', margin: '0 auto var(--space-lg)' }} />
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            No courses yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Create your first course to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Course
          </button>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="card card-elevated" 
            style={{
              width: '100%',
              maxWidth: '500px',
              margin: 'var(--space-lg)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--bg-elevated)',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-lg)',
              fontFamily: 'var(--font-display)'
            }}>
              Create New Course
            </h2>
            <form onSubmit={handleCreateCourse}>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Course Name
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Course Code
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)'
                }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows="3"
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
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
                    Delete Course
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
                style={{
                  padding: 'var(--space-xs)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer'
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
                Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.name}</strong>?
              </p>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                margin: 'var(--space-sm) 0 0 0',
                lineHeight: 1.6
              }}>
                This will permanently delete:
              </p>
              <ul style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                margin: 'var(--space-xs) 0 0 0',
                paddingLeft: 'var(--space-lg)',
                lineHeight: 1.8
              }}>
                <li>The course and all its metadata</li>
                <li>All uploaded documents</li>
                <li>All vector embeddings and chunks</li>
                <li>All chat sessions and history</li>
                <li>All concept graphs</li>
              </ul>
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
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.borderColor = 'var(--bg-elevated)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCourse(deleteConfirm)}
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
                  boxShadow: '0 4px 12px rgba(248, 81, 73, 0.4)'
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
              >
                <Trash2 size={18} />
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
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

export default Dashboard;

