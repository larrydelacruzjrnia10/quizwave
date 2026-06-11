const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * Leaderboard — ranked list of players.
 * `highlightEmail` marks the current student's row (student view).
 */
export default function Leaderboard({ entries = [], highlightEmail }) {
  if (entries.length === 0) {
    return (
      <div className="card text-center text-gray-500 text-sm py-6">
        No scores yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry) => {
        const isMe = entry.email === highlightEmail;
        return (
          <div
            key={entry.email}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
              ${isMe
                ? 'bg-primary/20 border border-primary'
                : 'bg-bg-card border border-bg-border'
              }`}
          >
            {/* Rank / medal */}
            <span className="w-8 text-center font-black text-sm flex-shrink-0">
              {MEDAL[entry.rank] ?? `#${entry.rank}`}
            </span>

            {/* Avatar + name */}
            <div
              className="w-7 h-7 rounded-full bg-primary flex items-center justify-center
                          text-white font-bold text-xs flex-shrink-0"
            >
              {entry.displayName[0].toUpperCase()}
            </div>

            <span className={`flex-1 font-semibold truncate text-sm ${isMe ? 'text-primary-light' : 'text-white'}`}>
              {entry.displayName}
              {isMe && <span className="text-xs text-gray-400 ml-1">(you)</span>}
            </span>

            <span className="font-black text-white text-sm tabular-nums">
              {entry.score.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
