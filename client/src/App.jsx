import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Login from './pages/teacher/Login';
import QuizManager from './pages/teacher/QuizManager';
import CreateQuiz from './pages/teacher/CreateQuiz';
import TeacherGame from './pages/teacher/TeacherGame';
import Join from './pages/student/Join';
import StudentGame from './pages/student/StudentGame';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/teacher/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Shared landing */}
      <Route path="/" element={<Home />} />

      {/* Teacher routes */}
      <Route path="/teacher/login" element={<Login />} />
      <Route
        path="/teacher/quizzes"
        element={<PrivateRoute><QuizManager /></PrivateRoute>}
      />
      <Route
        path="/teacher/quizzes/new"
        element={<PrivateRoute><CreateQuiz /></PrivateRoute>}
      />
      <Route
        path="/teacher/quizzes/:id/edit"
        element={<PrivateRoute><CreateQuiz /></PrivateRoute>}
      />
      <Route
        path="/teacher/game/:gameCode"
        element={<PrivateRoute><TeacherGame /></PrivateRoute>}
      />

      {/* Student routes */}
      <Route path="/join" element={<Join />} />
      <Route path="/play/:gameCode" element={<StudentGame />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
