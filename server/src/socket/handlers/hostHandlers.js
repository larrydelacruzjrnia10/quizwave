/**
 * hostHandlers.js — all socket events emitted by the teacher/host client.
 *
 * Socket events handled here:
 *   host:connect      — teacher attaches their socket to an existing in-memory session
 *   host:start        — start the game (move from lobby → first question)
 *   host:next         — advance to next question, or end game after the last one
 *   host:kick         — remove a player from the session
 *   disconnect        — mark host as gone; start 30-second grace timer for reconnect
 */

const { getSession, deleteSession, games } = require('../gameState');
const { advanceQuestion, revealQuestion, endGame } = require('../gameFlow');
const { verifySocketToken } = require('../../middleware/auth');
const { markGameStarted } = require('../../services/gameService');

function registerHostHandlers(io, socket) {
  // Teacher connects their socket to the session created via REST POST /api/games
  socket.on('host:connect', ({ gameCode, token }) => {
    const payload = verifySocketToken(token);
    if (!payload) {
      return socket.emit('game:error', { code: 'AUTH_ERROR', message: 'Authentication failed' });
    }

    const code = (gameCode || '').toUpperCase();
    const session = getSession(code);
    if (!session) {
      return socket.emit('game:error', { code: 'GAME_NOT_FOUND', message: 'Game session not found' });
    }

    // Clear any pending host-reconnect grace timer
    if (session._hostGraceTimer) {
      clearTimeout(session._hostGraceTimer);
      session._hostGraceTimer = null;
    }

    session.hostSocketId = socket.id;
    socket.join(code);
    socket.join(`${code}-host`);

    socket.emit('host:connected', {
      status: session.status,
      currentQ: session.currentQ,
      totalQuestions: session.quiz.questions.length,
      quizTitle: session.quiz.title,
      players: Array.from(session.players.values()).map((p) => ({
        displayName: p.displayName,
        email: p.email,
        score: p.score,
      })),
    });
  });

  // Start the game from the lobby
  socket.on('host:start', ({ gameCode }) => {
    const session = getSession((gameCode || '').toUpperCase());
    if (!session || session.hostSocketId !== socket.id) return;
    if (session.status !== 'lobby') return;
    if (session.players.size === 0) {
      return socket.emit('game:error', {
        code: 'NO_PLAYERS',
        message: 'No players have joined yet',
      });
    }

    markGameStarted(session.gameCode).catch((err) =>
      console.error('[host] markGameStarted failed:', err.message)
    );

    io.to(session.gameCode).emit('game:started', {
      totalQuestions: session.quiz.questions.length,
    });

    // Brief pause so clients can react to game:started before the first question arrives
    setTimeout(() => advanceQuestion(io, session), 1500);
  });

  // Advance to the next question (or end game after the last reveal)
  socket.on('host:next', ({ gameCode }) => {
    const session = getSession((gameCode || '').toUpperCase());
    if (!session || session.hostSocketId !== socket.id) return;
    if (session.status !== 'revealing') return;

    const isLastQuestion = session.currentQ + 1 >= session.quiz.questions.length;
    if (isLastQuestion) {
      endGame(io, session);
    } else {
      advanceQuestion(io, session);
    }
  });

  // Force-reveal current question early (host pressed "Reveal Now")
  socket.on('host:reveal_now', ({ gameCode }) => {
    const session = getSession((gameCode || '').toUpperCase());
    if (!session || session.hostSocketId !== socket.id) return;
    if (session.status !== 'question') return;

    revealQuestion(io, session);
  });

  // Kick a player from the lobby or mid-game
  socket.on('host:kick', ({ gameCode, email }) => {
    const session = getSession((gameCode || '').toUpperCase());
    if (!session || session.hostSocketId !== socket.id) return;

    const player = session.players.get(email);
    if (!player) return;

    io.to(player.socketId).emit('game:kicked', { message: 'You were removed by the host' });
    session.players.delete(email);

    io.to(`${session.gameCode}-host`).emit('host:player_list', {
      players: Array.from(session.players.values()).map((p) => ({
        displayName: p.displayName,
        email: p.email,
        score: p.score,
      })),
    });
  });

  // Host disconnects — give 30 seconds to reconnect before cleaning up
  socket.on('disconnect', () => {
    for (const [gameCode, session] of games.entries()) {
      if (session.hostSocketId !== socket.id) continue;

      io.to(gameCode).emit('game:host_disconnect', {
        message: 'Host disconnected. Waiting for reconnection…',
      });

      session._hostGraceTimer = setTimeout(() => {
        // Only clean up if no new host has reconnected
        if (session.hostSocketId === socket.id) {
          io.to(gameCode).emit('game:error', {
            code: 'HOST_LEFT',
            message: 'The host left the game.',
          });
          deleteSession(gameCode);
        }
      }, 30_000);
    }
  });
}

module.exports = { registerHostHandlers };
