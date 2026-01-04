import React, { createContext, useContext, useState, useCallback } from 'react';
import { sessionsApi, chatApi } from '../services/api';
import { useCourse } from './CourseContext';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { activeCourse } = useCourse();
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Load sessions for active course
  const loadSessions = useCallback(async () => {
    if (!activeCourse?._id && !activeCourse?.courseId) return;
    
    try {
      setLoading(true);
      const courseId = activeCourse._id || activeCourse.courseId;
      const data = await sessionsApi.getByCourse(courseId);
      // Handle both array and object with sessions property
      let sessionsList = [];
      if (Array.isArray(data)) {
        sessionsList = data;
      } else if (data && Array.isArray(data.sessions)) {
        sessionsList = data.sessions;
      }
      // Map sessionId to _id for compatibility
      sessionsList = sessionsList.map(s => ({
        ...s,
        _id: s._id || s.sessionId
      }));
      setSessions(sessionsList);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setSessions([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  }, [activeCourse?._id, activeCourse?.courseId]);

  // Create new session
  const createSession = async (title) => {
    if (!activeCourse?._id && !activeCourse?.courseId) return null;
    
    try {
      const courseId = activeCourse._id || activeCourse.courseId;
      const session = await sessionsApi.create(courseId, title);
      // Map sessionId to _id for compatibility
      const sessionWithId = {
        ...session,
        _id: session._id || session.sessionId
      };
      setSessions(prev => Array.isArray(prev) ? [sessionWithId, ...prev] : [sessionWithId]);
      setActiveSession(sessionWithId);
      setMessages([]);
      return sessionWithId;
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  };

  // Select session and load history
  const selectSession = async (session) => {
    if (!session) {
      setActiveSession(null);
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      const sessionWithId = {
        ...session,
        _id: session._id || session.sessionId
      };
      setActiveSession(sessionWithId);
      
      const sessionId = session._id || session.sessionId;
      const history = await chatApi.getHistory(sessionId);
      setMessages(Array.isArray(history.messages) ? history.messages : (history || []));
    } catch (err) {
      console.error('Failed to load session:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Send message and get AI response
  const sendMessage = async (question) => {
    if (!activeCourse) {
      throw new Error('No active course selected. Please select a course first.');
    }

    if (!question.trim()) {
      return null;
    }

    const courseId = activeCourse._id || activeCourse.courseId;
    
    if (!courseId) {
      throw new Error('Invalid course. Please select a valid course.');
    }

    console.log('[SESSION] Sending message for course:', {
      courseId,
      courseName: activeCourse.name,
      hasActiveSession: !!activeSession
    });

    // Create session if none exists
    let sessionId = activeSession?._id;
    if (!sessionId) {
      const newSession = await createSession('New Study Session');
      sessionId = newSession?._id;
    }

    // Add user message immediately
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => Array.isArray(prev) ? [...prev, userMessage] : [userMessage]);
    setSending(true);

    try {
      const response = await chatApi.send(question, courseId, sessionId);
      
      // Parse the answer - it could be an object or a structured answer
      let answerContent = null;
      let answerObj = null;
      
      if (response.answer) {
        if (typeof response.answer === 'object') {
          answerObj = response.answer;
        } else {
          answerContent = response.answer;
        }
      } else if (typeof response === 'object' && response.definition) {
        answerObj = response;
      } else {
        answerContent = typeof response === 'string' ? response : JSON.stringify(response);
      }
      
      // Add AI response
      // Ensure sources is always an array
      let sourcesList = [];
      if (Array.isArray(response.sources)) {
        sourcesList = response.sources;
      } else if (response.sources) {
        sourcesList = [response.sources];
      }
      
      const aiMessage = {
        id: response.messageId || `ai-${Date.now()}`,
        role: 'assistant',
        content: answerContent,
        answer: answerObj,
        sources: sourcesList,
        curriculumAlignment: response.curriculum_alignment,
        misconceptionWarning: response.misconception_warning,
        relatedConcepts: response.related_concepts || [],
        confidence: response.confidence,
        has_course_material: response.has_course_material !== false, // Default to true if not specified
        timestamp: new Date().toISOString(),
      };
      
      // Debug log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('AI Response:', {
          sources: sourcesList,
          answer: answerObj,
          fullResponse: response
        });
      }
      
      setMessages(prev => Array.isArray(prev) ? [...prev, aiMessage] : [aiMessage]);
      return response;
    } catch (err) {
      // Add error message
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: 'Failed to get response. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => Array.isArray(prev) ? [...prev, errorMessage] : [errorMessage]);
      throw err;
    } finally {
      setSending(false);
    }
  };

  // Delete session
  const deleteSession = async (sessionId) => {
    try {
      await sessionsApi.delete(sessionId);
      setSessions(prev => Array.isArray(prev) ? prev.filter(s => 
        (s._id !== sessionId && s.sessionId !== sessionId)
      ) : []);
      if (activeSession && (activeSession._id === sessionId || activeSession.sessionId === sessionId)) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      throw err;
    }
  };

  // Create snapshot
  const createSnapshot = async () => {
    if (!activeSession?._id) return;
    
    try {
      const snapshot = await sessionsApi.createSnapshot(activeSession._id);
      return snapshot;
    } catch (err) {
      console.error('Failed to create snapshot:', err);
      throw err;
    }
  };

  const value = {
    activeSession,
    sessions,
    messages,
    loading,
    sending,
    loadSessions,
    createSession,
    selectSession,
    sendMessage,
    deleteSession,
    createSnapshot,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;
