import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { BookOpen, MessageSquare, FileText, Network, Sparkles, GraduationCap } from 'lucide-react';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCourse } = useCourse();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BookOpen },
    { path: '/study', label: 'Study', icon: MessageSquare },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/concepts', label: 'Concepts', icon: Network },
    { path: '/generate', label: 'Generate', icon: Sparkles },
    { path: '/flashcards', label: 'Flashcards', icon: BookOpen },
    { path: '/exams', label: 'Exams', icon: GraduationCap },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--bg-tertiary)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="container" style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <h1 
                onClick={() => navigate('/')}
                style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 600, 
                  color: 'var(--accent-primary)',
                  fontFamily: 'var(--font-display)',
                  margin: 0,
                  cursor: 'pointer',
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
              >
                Reuler AI
              </h1>
              {activeCourse && (
                <span style={{
                  padding: 'var(--space-xs) var(--space-md)',
                  background: 'var(--accent-muted)',
                  color: 'var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  {activeCourse.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--bg-tertiary)'
      }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-lg)',
                    borderBottom: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.95rem',
                    transition: 'all var(--transition-fast)',
                    marginBottom: '-1px',
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                    background: isActive ? 'var(--accent-muted)' : 'transparent',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.borderBottomColor = 'var(--bg-elevated)';
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                    } else {
                      e.currentTarget.style.background = 'var(--accent-muted)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderBottomColor = 'transparent';
                      e.currentTarget.style.background = 'transparent';
                    } else {
                      e.currentTarget.style.background = 'var(--accent-muted)';
                    }
                  }}
                >
                  <Icon size={18} style={{ marginRight: 'var(--space-sm)' }} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
        {children}
      </main>
    </div>
  );
}

export default Layout;

