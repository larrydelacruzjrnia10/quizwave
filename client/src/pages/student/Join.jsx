import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

export default function Join() {
  const [email, setEmail] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleJoin(e) {
    e.preventDefault();
    setError('');

    const code = gameCode.trim().toUpperCase();
    const emailTrimmed = email.trim().toLowerCase();

    if (!emailTrimmed.includes('@')) {
      return setError('Please enter a valid email address.');
    }
    if (code.length !== 6) {
      return setError('Game code must be 6 characters.');
    }

    setLoading(true);
    try {
      // Validate game exists and is in lobby
      await apiFetch(`/api/games/${code}/status`);

      // Store identity for the game session
      sessionStorage.setItem('quiz_email', emailTrimmed);
      sessionStorage.setItem('quiz_gamecode', code);

      navigate(`/play/${code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="w-full max-w-sm animate-slide-up">
        <Link to="/" className="text-primary-light hover:text-white text-sm mb-6 inline-block">
          ← Back
        </Link>

        <div className="card">
          <h1 className="text-2xl font-black mb-1">Join Game</h1>
          <p className="text-gray-400 text-sm mb-6">Enter the code shown on the projector</p>

          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="student@school.edu"
                className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-4
                           text-white placeholder-gray-600 focus:outline-none focus:border-primary
                           text-lg transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Game Code</label>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                required
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full bg-bg-base border border-bg-border rounded-xl px-4 py-4
                           text-white placeholder-gray-600 focus:outline-none focus:border-primary
                           text-3xl font-black text-center tracking-[0.25em] uppercase
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
              className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover font-black
                         text-xl text-white transition-all active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Checking…' : 'Join →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
