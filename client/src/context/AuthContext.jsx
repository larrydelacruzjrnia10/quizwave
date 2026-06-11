import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [teacher, setTeacher] = useState(() => {
    try {
      const stored = localStorage.getItem('quiz_teacher');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('quiz_token') || null);

  function login(newToken, teacherData) {
    localStorage.setItem('quiz_token', newToken);
    localStorage.setItem('quiz_teacher', JSON.stringify(teacherData));
    setToken(newToken);
    setTeacher(teacherData);
  }

  function logout() {
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_teacher');
    setToken(null);
    setTeacher(null);
  }

  return (
    <AuthContext.Provider
      value={{ teacher, token, login, logout, isAuthenticated: !!token && !!teacher }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
