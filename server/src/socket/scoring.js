const BASE_POINTS = 1000;
const MAX_SPEED_BONUS = 500;

/**
 * Server-authoritative score calculation.
 * Speed bonus scales linearly: full bonus for instant answers, zero at time limit.
 */
function calculatePoints(correct, responseMs, timeLimitSec) {
  if (!correct) return 0;
  const timeLimitMs = timeLimitSec * 1000;
  const ratio = Math.max(0, 1 - responseMs / timeLimitMs);
  return BASE_POINTS + Math.floor(MAX_SPEED_BONUS * ratio);
}

/**
 * Build a sorted, ranked leaderboard from the players Map.
 * Returns array ordered by score descending, with 1-based rank.
 */
function buildLeaderboard(players) {
  return Array.from(players.entries())
    .map(([email, p]) => ({
      email,
      displayName: p.displayName,
      score: p.score,
    }))
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

module.exports = { calculatePoints, buildLeaderboard };
