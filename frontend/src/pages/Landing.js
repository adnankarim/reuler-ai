import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  MessageSquare, 
  FileText, 
  Network, 
  Sparkles, 
  GraduationCap,
  Brain,
  Zap,
  Shield,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Play,
  Star,
  Users,
  Award,
  Target,
  Lightbulb,
  BarChart3
} from 'lucide-react';

function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: 'AI Study Chat',
      description: 'Get structured, curriculum-aware answers with verifiable sources. Our AI understands your course materials and provides pedagogical explanations.',
      color: 'var(--accent-primary)',
      gradient: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)'
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Upload PDFs, notes, and research papers. Our system automatically extracts and indexes content for intelligent retrieval.',
      color: 'var(--info)',
      gradient: 'linear-gradient(135deg, var(--info) 0%, #4493ff 100%)'
    },
    {
      icon: Network,
      title: 'Concept Graph',
      description: 'Visualize relationships between concepts. Understand prerequisites and discover optimal learning paths through your course materials.',
      color: 'var(--success)',
      gradient: 'linear-gradient(135deg, var(--success) 0%, #2ea043 100%)'
    },
    {
      icon: BookOpen,
      title: 'Smart Flashcards',
      description: 'Generate flashcards with spaced repetition. Track your mastery level and get personalized review schedules based on your performance.',
      color: 'var(--warning)',
      gradient: 'linear-gradient(135deg, var(--warning) 0%, #d29922 100%)'
    },
    {
      icon: GraduationCap,
      title: 'Practice Exams',
      description: 'Create custom practice exams with multiple choice, short answer, and essay questions. Get detailed feedback and track your progress over time.',
      color: 'var(--accent-secondary)',
      gradient: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)'
    },
    {
      icon: Sparkles,
      title: 'Study Materials',
      description: 'Generate summaries, flashcards, and practice exams automatically from your course documents. Save time and focus on learning.',
      color: 'var(--info)',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
    }
  ];

  const benefits = [
    {
      icon: Brain,
      title: 'Curriculum-Aware',
      description: 'AI understands your specific course materials and provides contextually relevant answers'
    },
    {
      icon: Shield,
      title: 'Source Verification',
      description: 'Every answer includes verifiable sources from your uploaded documents'
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking',
      description: 'Monitor your learning progress with detailed analytics and mastery scores'
    },
    {
      icon: Zap,
      title: 'Spaced Repetition',
      description: 'Smart algorithms optimize your study schedule for maximum retention'
    }
  ];

  const stats = [
    { value: '100%', label: 'Curriculum-Aware', icon: Target },
    { value: '24/7', label: 'AI Assistant', icon: Brain },
    { value: '∞', label: 'Study Materials', icon: Sparkles },
    { value: '100%', label: 'Source Verified', icon: Shield }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero Section */}
      <section style={{
        padding: 'var(--space-3xl) var(--space-lg)',
        background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-sm) var(--space-lg)',
              background: 'var(--accent-muted)',
              border: '1px solid var(--accent-primary)',
              borderRadius: 'var(--radius-xl)',
              marginBottom: 'var(--space-lg)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--accent-primary)'
            }}>
              <Sparkles size={16} />
              AI-Powered Learning Platform
            </div>
            
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-lg)',
              lineHeight: 1.2
            }}>
              Master Your Courses with
              <span style={{
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'block',
                marginTop: 'var(--space-sm)'
              }}>
                Reuler AI
              </span>
            </h1>
            
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2xl)',
              lineHeight: 1.6,
              maxWidth: '600px',
              margin: '0 auto var(--space-2xl)'
            }}>
              Your intelligent study companion that understands your curriculum, 
              generates personalized study materials, and tracks your progress.
            </p>
            
            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
                style={{
                  padding: 'var(--space-md) var(--space-2xl)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                Get Started
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  padding: 'var(--space-md) var(--space-2xl)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  transition: 'all var(--transition-base)'
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
                <Play size={20} />
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        padding: 'var(--space-2xl) var(--space-lg)',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--bg-tertiary)',
        borderBottom: '1px solid var(--bg-tertiary)'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-xl)'
          }}>
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--accent-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-md)',
                    border: '1px solid var(--accent-primary)'
                  }}>
                    <Icon size={28} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}>
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: 'var(--space-3xl) var(--space-lg)',
        background: 'var(--bg-primary)'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Everything You Need to Excel
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Powerful features designed to transform how you study and learn
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: 'var(--space-xl)'
          }}>
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="card card-elevated"
                  style={{
                    padding: 'var(--space-xl)',
                    transition: 'all var(--transition-base)',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-lg)',
                    background: feature.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-lg)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                  }}>
                    <Icon size={32} style={{ color: 'var(--text-primary)' }} />
                  </div>
                  
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-md)'
                  }}>
                    {feature.title}
                  </h3>
                  
                  <p style={{
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                    fontSize: '1rem'
                  }}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{
        padding: 'var(--space-3xl) var(--space-lg)',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--bg-tertiary)',
        borderBottom: '1px solid var(--bg-tertiary)'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Why Choose Reuler AI?
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Built for students who want to learn smarter, not harder
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-xl)'
          }}>
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <div key={i} style={{
                  display: 'flex',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-lg)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--bg-elevated)',
                  transition: 'all var(--transition-base)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.borderColor = 'var(--bg-elevated)';
                }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid var(--accent-primary)'
                  }}>
                    <Icon size={24} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-xs)'
                    }}>
                      {benefit.title}
                    </h3>
                    <p style={{
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      fontSize: '0.95rem'
                    }}>
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        padding: 'var(--space-3xl) var(--space-lg)',
        background: 'var(--bg-primary)'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              How It Works
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Get started in minutes and transform your study routine
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-xl)',
            position: 'relative'
          }}>
            {[
              {
                step: '1',
                icon: FileText,
                title: 'Upload Documents',
                description: 'Add your course materials - PDFs, notes, research papers. Our AI extracts and indexes everything automatically.'
              },
              {
                step: '2',
                icon: Brain,
                title: 'AI Understands',
                description: 'Our curriculum-aware AI analyzes your materials and builds a knowledge graph of concepts and relationships.'
              },
              {
                step: '3',
                icon: MessageSquare,
                title: 'Ask Questions',
                description: 'Chat with your AI tutor. Get structured answers with definitions, examples, and verifiable sources.'
              },
              {
                step: '4',
                icon: Sparkles,
                title: 'Generate Materials',
                description: 'Create flashcards, practice exams, and summaries automatically. Track your progress and master concepts.'
              }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <div className="card card-elevated" style={{
                    padding: 'var(--space-xl)',
                    textAlign: 'center',
                    height: '100%'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto var(--space-lg)',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}>
                      {item.step}
                    </div>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--accent-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto var(--space-lg)',
                      border: '1px solid var(--accent-primary)'
                    }}>
                      <Icon size={32} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-md)'
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7
                    }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: 'var(--space-3xl) var(--space-lg)',
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        borderTop: '1px solid var(--bg-elevated)'
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            padding: 'var(--space-3xl)',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--bg-tertiary)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-lg)',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <Sparkles size={40} style={{ color: 'var(--text-primary)' }} />
            </div>
            
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Ready to Transform Your Learning?
            </h2>
            
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2xl)',
              lineHeight: 1.6
            }}>
              Join students who are already mastering their courses with AI-powered study tools.
            </p>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
              style={{
                padding: 'var(--space-md) var(--space-2xl)',
                fontSize: '1.25rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              Get Started Free
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-2xl) var(--space-lg)',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--bg-tertiary)'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-lg)'
          }}>
            <div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                fontFamily: 'var(--font-display)',
                marginBottom: 'var(--space-xs)'
              }}>
                Reuler AI
              </h3>
              <p style={{
                color: 'var(--text-tertiary)',
                fontSize: '0.875rem'
              }}>
                Your AI-powered study companion
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              gap: 'var(--space-lg)',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Features
              </button>
            </div>
          </div>
          
          <div style={{
            marginTop: 'var(--space-xl)',
            paddingTop: 'var(--space-xl)',
            borderTop: '1px solid var(--bg-tertiary)',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: '0.875rem'
          }}>
            © 2024 Reuler AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;

