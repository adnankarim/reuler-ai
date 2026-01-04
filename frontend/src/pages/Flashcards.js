import React, { useState, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { flashcardsApi } from '../services/api';
import { BookOpen, Loader2, CheckCircle2, X, RotateCcw, TrendingUp, BarChart3, ArrowLeft, ArrowRight, FlipHorizontal } from 'lucide-react';

function Flashcards() {
  const { activeCourse } = useCourse();
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [studyMode, setStudyMode] = useState(false); // true = study mode, false = browse mode

  useEffect(() => {
    if (activeCourse) {
      loadDecks();
      loadProgress();
    }
  }, [activeCourse]);

  const loadDecks = async () => {
    if (!activeCourse) return;
    try {
      setLoading(true);
      const courseId = activeCourse.courseId || activeCourse._id;
      const response = await flashcardsApi.getDecks(courseId);
      setDecks(response.decks || []);
    } catch (error) {
      console.error('Error loading decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!activeCourse) return;
    try {
      const courseId = activeCourse.courseId || activeCourse._id;
      const response = await flashcardsApi.getProgress(courseId);
      setProgress(response);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const loadDeck = async (deckId) => {
    try {
      setLoading(true);
      const response = await flashcardsApi.getDeck(deckId);
      setFlashcards(response.flashcards || []);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowAnswer(false);
      setStudyMode(true);
    } catch (error) {
      console.error('Error loading deck:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (isCorrect) => {
    if (!flashcards[currentIndex]) return;
    
    try {
      await flashcardsApi.updateStudy(flashcards[currentIndex].cardId, isCorrect);
      
      // Update local state
      const updatedCards = [...flashcards];
      updatedCards[currentIndex].studyProgress = {
        ...updatedCards[currentIndex].studyProgress,
        timesStudied: (updatedCards[currentIndex].studyProgress?.timesStudied || 0) + 1,
        timesCorrect: isCorrect 
          ? (updatedCards[currentIndex].studyProgress?.timesCorrect || 0) + 1
          : (updatedCards[currentIndex].studyProgress?.timesCorrect || 0),
        timesIncorrect: !isCorrect
          ? (updatedCards[currentIndex].studyProgress?.timesIncorrect || 0) + 1
          : (updatedCards[currentIndex].studyProgress?.timesIncorrect || 0)
      };
      setFlashcards(updatedCards);
      
      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        setShowAnswer(false);
      } else {
        // Finished deck
        alert('You\'ve completed this deck! Great job!');
        loadProgress();
      }
    } catch (error) {
      console.error('Error updating study progress:', error);
    }
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowAnswer(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setShowAnswer(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  if (!activeCourse) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Please select a course first</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
              Flashcards
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: 'var(--space-xs)' }}>
              Study and master key concepts for <strong style={{ color: 'var(--text-primary)' }}>{activeCourse.name}</strong>
            </p>
          </div>
          {!studyMode && (
            <button
              onClick={() => window.location.href = '/generate'}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
            >
              <BookOpen size={18} />
              Generate New Deck
            </button>
          )}
        </div>

        {/* Progress Stats */}
        {progress && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)'
          }}>
            <div className="card card-elevated" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                {progress.totalCards || 0}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Cards</div>
            </div>
            <div className="card card-elevated" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)' }}>
                {progress.averageMastery || 0}%
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Avg Mastery</div>
            </div>
            <div className="card card-elevated" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--info)' }}>
                {progress.accuracy || 0}%
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Accuracy</div>
            </div>
            <div className="card card-elevated" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                {progress.totalDecks || 0}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Decks</div>
            </div>
          </div>
        )}
      </div>

      {!studyMode ? (
        /* Deck Selection */
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
            </div>
          ) : decks.length === 0 ? (
            <div className="card card-elevated" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
              <BookOpen size={64} style={{ color: 'var(--accent-primary)', margin: '0 auto var(--space-lg)' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
                No Flashcard Decks Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                Generate your first flashcard deck from the Generate page
              </p>
              <button
                onClick={() => window.location.href = '/generate'}
                className="btn btn-primary"
              >
                Go to Generate
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
              {decks.map((deck) => (
                <div
                  key={deck.deckId}
                  className="card card-elevated"
                  style={{
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onClick={() => loadDeck(deck.deckId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BookOpen size={24} style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {deck.title}
                      </h3>
                      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', margin: 0 }}>
                        {deck.cardCount || 0} cards
                      </p>
                    </div>
                  </div>
                  {deck.stats && (
                    <div style={{
                      padding: 'var(--space-sm)',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)'
                    }}>
                      Mastery: {deck.stats.averageMastery?.toFixed(0) || 0}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Study Mode */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <button
              onClick={() => {
                setStudyMode(false);
                setSelectedDeck(null);
                setFlashcards([]);
              }}
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
              Back to Decks
            </button>
            <div style={{ color: 'var(--text-secondary)' }}>
              Card {currentIndex + 1} of {flashcards.length}
            </div>
          </div>

          {currentCard && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {/* Flashcard */}
              <div
                className="card card-elevated"
                style={{
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 'var(--space-2xl)',
                  cursor: 'pointer',
                  position: 'relative',
                  perspective: '1000px'
                }}
                onClick={flipCard}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}>
                  {/* Front */}
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <FlipHorizontal size={24} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <h2 style={{
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-md)',
                      lineHeight: 1.4
                    }}>
                      {currentCard.front}
                    </h2>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      Click to flip
                    </p>
                  </div>

                  {/* Back */}
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}>
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      marginBottom: 'var(--space-md)'
                    }}>
                      Answer
                    </h2>
                    <p style={{
                      fontSize: '1.25rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      marginBottom: 'var(--space-lg)'
                    }}>
                      {currentCard.back}
                    </p>
                    {currentCard.hint && (
                      <div style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--accent-muted)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        color: 'var(--accent-primary)',
                        marginTop: 'var(--space-md)'
                      }}>
                        💡 {currentCard.hint}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation and Answer Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'var(--space-lg)',
                gap: 'var(--space-md)'
              }}>
                <button
                  onClick={prevCard}
                  disabled={currentIndex === 0}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === 0 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)'
                  }}
                >
                  <ArrowLeft size={18} />
                  Previous
                </button>

                {showAnswer && (
                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <button
                      onClick={() => handleAnswer(false)}
                      style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        background: 'var(--error)',
                        color: 'var(--text-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                        fontWeight: 600,
                        fontSize: '1rem'
                      }}
                    >
                      <X size={20} />
                      Incorrect
                    </button>
                    <button
                      onClick={() => handleAnswer(true)}
                      style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        background: 'var(--success)',
                        color: 'var(--text-primary)',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)',
                        fontWeight: 600,
                        fontSize: '1rem'
                      }}
                    >
                      <CheckCircle2 size={20} />
                      Correct
                    </button>
                  </div>
                )}

                <button
                  onClick={nextCard}
                  disabled={currentIndex === flashcards.length - 1}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    cursor: currentIndex === flashcards.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === flashcards.length - 1 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)'
                  }}
                >
                  Next
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
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

export default Flashcards;

