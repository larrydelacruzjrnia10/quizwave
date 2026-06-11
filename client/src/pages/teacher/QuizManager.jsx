import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

export default function QuizManager() {
  const { teacher, logout } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostingId, setHostingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/quizzes')
      .then(setQuizzes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function deleteQuiz(id) {
    if (!confirm('Delete this quiz?')) return;
    try {
      await apiFetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function hostGame(quizId) {
    setHostingId(quizId);
    try {
      const { gameCode } = await apiFetch('/api/games', {
        method: 'POST',
        body: JSON.stringify({ quizId }),
      });
      navigate(`/teacher/game/${gameCode}`);
    } catch (e) {
      setError(e.message);
      setHostingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">⚡ QuizWave</span>
          <span className="text-xs text-gray-500 hidden sm:block">Teacher Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">{teacher?.email}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page title + create button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black">My Quizzes</h2>
          <Link
            to="/teacher/quizzes/new"
            className="bg-primary hover:bg-primary-hover text-white font-bold
                       px-5 py-2.5 rounded-xl transition-all active:scale-95 text-sm"
          >
            + New Quiz
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading…</div>
        ) : quizzes.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-xl font-bold mb-2">No quizzes yet</p>
            <p className="text-gray-400 mb-6">Create your first quiz to get started.</p>
            <Link
              to="/teacher/quizzes/new"
              className="bg-primary hover:bg-primary-hover text-white font-bold
                         px-6 py-3 rounded-xl transition-all inline-block"
            >
              Create Quiz
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="card hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{quiz.description}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  {quiz._count?.questions ?? 0} question{quiz._count?.questions !== 1 ? 's' : ''}
                  &nbsp;·&nbsp;
                  Updated {new Date(quiz.updatedAt).toLocaleDateString()}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => hostGame(quiz.id)}
                    disabled={hostingId === quiz.id}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold
                               py-2.5 rounded-xl transition-all active:scale-95 text-sm
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hostingId === quiz.id ? 'Starting…' : '▶ Host Game'}
                  </button>
                  <Link
                    to={`/teacher/quizzes/${quiz.id}/edit`}
                    className="px-4 py-2.5 rounded-xl bg-bg-base border border-bg-border
                               hover:border-primary text-sm text-gray-300 font-medium
                               transition-colors flex items-center"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteQuiz(quiz.id)}
                    className="px-3 py-2.5 rounded-xl bg-bg-base border border-bg-border
                               hover:border-red-500 text-gray-400 hover:text-red-400
                               transition-colors text-sm"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
