import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { coursesApi } from '../services/api';

const CourseContext = createContext(null);

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  // Load saved active course from localStorage
  useEffect(() => {
    const savedCourseId = localStorage.getItem('active_course_id');
    if (savedCourseId && courses.length > 0) {
      const course = courses.find(c => c._id === savedCourseId || c.courseId === savedCourseId);
      if (course) {
        setActiveCourse(course);
      } else if (courses.length > 0) {
        setActiveCourse(courses[0]);
      }
    } else if (courses.length > 0 && !activeCourse) {
      setActiveCourse(courses[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await coursesApi.getAll();
      // Handle both array and object with courses property
      const coursesList = Array.isArray(data) ? data : (data.courses || []);
      setCourses(coursesList);
      setError(null);
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = useCallback((course) => {
    if (!course) {
      console.warn('Attempted to select null/undefined course');
      return;
    }
    
    console.log('[COURSE] Selecting course:', {
      _id: course._id,
      courseId: course.courseId,
      name: course.name
    });
    
    setActiveCourse(course);
    localStorage.setItem('active_course_id', course._id || course.courseId);
    
    // Clear any cached data from previous course
    // This ensures fresh data when switching courses
  }, []);

  const createCourse = async (courseData) => {
    try {
      const newCourse = await coursesApi.create(courseData);
      setCourses(prev => [...prev, newCourse]);
      // Automatically select the newly created course
      if (newCourse) {
        selectCourse(newCourse);
      }
      return newCourse;
    } catch (err) {
      console.error('Course creation error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to create course';
      throw new Error(errorMessage);
    }
  };

  const updateCourse = async (courseId, updates) => {
    try {
      const updated = await coursesApi.update(courseId, updates);
      setCourses(prev => prev.map(c => (c._id === courseId || c.courseId === courseId) ? updated : c));
      if (activeCourse && (activeCourse._id === courseId || activeCourse.courseId === courseId)) {
        setActiveCourse(updated);
      }
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteCourse = async (courseId) => {
    try {
      await coursesApi.delete(courseId);
      setCourses(prev => prev.filter(c => c._id !== courseId && c.courseId !== courseId));
      if (activeCourse && (activeCourse._id === courseId || activeCourse.courseId === courseId)) {
        setActiveCourse(courses[0] || null);
      }
    } catch (err) {
      throw err;
    }
  };

  const refreshCourses = () => loadCourses();

  const value = {
    courses,
    activeCourse,
    loading,
    error,
    selectCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    refreshCourses,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
}

export default CourseContext;
