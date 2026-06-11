/**
 * gameFlow.js — question lifecycle functions shared by both host and player handlers.
 *
 * Flow per question:
 *   advanceQuestion → (timer expires or host:next while all answered) → revealQuestion
 *   After last question: revealQuestion triggers endGame automatically on next host:next
 */

const { buildLeaderboard } = require('./scoring');
const { deleteSession } = require('./gameState');
const { markGameStarted, saveResults } = require('../services/gameService');

function advanceQuestion(io, session) {
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }

  session.currentQ++;
  session.status = 'question';
  session.currentAnswers = new Map();
  session.questionStartedAt = Date.now();

  const q = session.quiz.questions[session.currentQ];

  // Broadcast question WITHOUT the correct answer
  io.to(session.gameCode).emit('game:question', {
    index: session.currentQ,
    total: session.quiz.questions.length,
    text: q.text,
    options: q.options,
    timeLimit: q.timeLimit,
  });

  // Tick the countdown every second so all clients stay in sync
  let secondsLeft = q.timeLimit;
  const tick = () => {
    secondsLeft--;
    if (secondsLeft >= 0) {
      io.to(session.gameCode).emit('game:time_tick', { secondsLeft });
    }
  };
  // Start ticking immediately
  const tickInterval = setInterval(tick, 1000);

  // Auto-reveal when time expires
  session.timer = setTimeout(() => {
    clearInterval(tickInterval);
    if (session.status === 'question') revealQuestion(io, session);
  }, q.timeLimit * 1000);

  // Attach the interval so revealQuestion can clear it
  session._tickInterval = tickInterval;
}

function revealQuestion(io, session) {
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }
  if (session._tickInterval) {
    clearInterval(session._tickInterval);
    session._tickInterval = null;
  }

  session.status = 'revealing';

  const q = session.quiz.questions[session.currentQ];
  const leaderboard = buildLeaderboard(session.players);

  // Count how many chose each option
  const optionCounts = q.options.map((_, i) =>
    Array.from(session.currentAnswers.values()).filter((a) => a.answerIndex === i).length
  );

  // Broadcast reveal to the whole room (no correct index leakage before this point)
  io.to(session.gameCode).emit('game:question_end', {
    correctIndex: q.correctIndex,
    explanation: q.explanation || null,
    optionCounts,
    leaderboard,
  });

  // Send personalised result to each player
  for (const [email, player] of session.players.entries()) {
    const answer = session.currentAnswers.get(email);
    const correct = answer !== undefined && answer.answerIndex === q.correctIndex;
    const points = answer?.points ?? 0;
    const rank = leaderboard.find((p) => p.email === email)?.rank ?? leaderboard.length;

    io.to(player.socketId).emit('game:answer_result', {
      correct,
      points,
      totalScore: player.score,
      rank,
      answered: answer !== undefined,
    });
  }

  // Tell the host the updated player list with scores
  io.to(`${session.gameCode}-host`).emit('host:player_list', {
    players: leaderboard,
  });
}

async function endGame(io, session) {
  if (session.timer) clearTimeout(session.timer);
  if (session._tickInterval) clearInterval(session._tickInterval);

  session.status = 'finished';

  const leaderboard = buildLeaderboard(session.players);

  // Broadcast final leaderboard to the whole room
  io.to(session.gameCode).emit('game:ended', { leaderboard });

  // Send personal final standing to each student
  for (const [email, player] of session.players.entries()) {
    const rank = leaderboard.find((p) => p.email === email)?.rank ?? leaderboard.length;
    io.to(player.socketId).emit('game:student_final', {
      rank,
      score: player.score,
      totalPlayers: session.players.size,
      displayName: player.displayName,
    });
  }

  // Persist results to the database
  try {
    await saveResults({ gameCode: session.gameCode, leaderboard, players: session.players });
  } catch (err) {
    console.error('[gameFlow] Failed to persist results:', err.message);
  }

  // Clean up in-memory state after a grace period (students reading results)
  setTimeout(() => deleteSession(session.gameCode), 120_000);
}

module.exports = { advanceQuestion, revealQuestion, endGame };
