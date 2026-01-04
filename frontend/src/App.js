import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CourseProvider } from './context/CourseContext';
import { SessionProvider } from './context/SessionContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Documents from './pages/Documents';
import ConceptMap from './pages/ConceptMap';
import Generate from './pages/Generate';
import Flashcards from './pages/Flashcards';
import Exams from './pages/Exams';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <CourseProvider>
      <SessionProvider>
        {isLandingPage ? (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/study" element={<Study />} />
              <Route path="/study/:sessionId" element={<Study />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/concepts" element={<ConceptMap />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        )}
      </SessionProvider>
    </CourseProvider>
  );
}

export default App;
