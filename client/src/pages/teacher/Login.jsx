import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.token, data.teacher);
      navigate('/teacher/quizzes');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Back link */}
        <Link to="/" className="text-primary-light hover:text-white text-sm mb-6 inline-block">
          ← Back to home
        </Link>

        <div className="card">
          <h1 className="text-2xl font-black mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">Teacher portal</p>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden bg-bg-base mb-6 border border-bg-border">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold transition-colors
                  ${mode === m ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="teacher@school.edu"
                className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-3
                           text-white placeholder-gray-600 focus:outline-none focus:border-primary
                           transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-3
                           text-white placeholder-gray-600 focus:outline-none focus:border-primary
                           transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover
                         font-bold text-white transition-all active:scale-95 disabled:opacity-50
                         disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
