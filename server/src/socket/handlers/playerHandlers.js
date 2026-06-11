/**
 * playerHandlers.js — all socket events emitted by student clients.
 *
 * Socket events handled here:
 *   player:join     — new student joins the lobby
 *   player:rejoin   — reconnecting student restores their seat
 *   player:answer   — student submits an answer (server timestamps it)
 *   disconnect      — mark player as disconnected (they can rejoin)
 */

const { getSession, findEmailBySocket, games } = require('../gameState');
const { calculatePoints } = require('../scoring');

function registerPlayerHandlers(io, socket) {
  socket.on('player:join', ({ gameCode, email }) => {
    const code = (gameCode || '').toUpperCase();
    const session = getSession(code);

    if (!session) {
      return socket.emit('game:error', {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found. Check the code and try again.',
      });
    }
    if (session.status !== 'lobby') {
      return socket.emit('game:error', {
        code: 'GAME_STARTED',
        message: 'This game has already started. Late joiners are not allowed.',
      });
    }
    if (!email || !email.includes('@')) {
      return socket.emit('game:error', {
        code: 'INVALID_EMAIL',
        message: 'Please enter a valid email address.',
      });
    }

    const displayName = email.split('@')[0];

    if (session.players.has(email)) {
      // Same email reconnects before game starts — update socket ID
      const player = session.players.get(email);
      player.socketId = socket.id;
      player.disconnected = false;
    } else {
      // Block duplicate display names (different emails, same prefix)
      const nameTaken = Array.from(session.players.values()).some(
        (p) => p.displayName.toLowerCase() === displayName.toLowerCase()
      );
      if (nameTaken) {
        return socket.emit('game:error', {
          code: 'NAME_TAKEN',
          message: `The name "${displayName}" is already taken. Try a different email.`,
        });
      }

      session.players.set(email, {
        socketId: socket.id,
        email,
        displayName,
        score: 0,
        answers: [],
        disconnected: false,
      });
    }

    socket.join(code);

    socket.emit('game:joined', {
      displayName,
      email,
      gameCode: code,
      playerCount: session.players.size,
      quizTitle: session.quiz.title,
    });

    // Notify host of updated player list
    io.to(`${code}-host`).emit('host:player_list', {
      players: Array.from(session.players.values()).map((p) => ({
        displayName: p.displayName,
        email: p.email,
        score: p.score,
      })),
    });
  });

  // Student rejoins after a disconnect
  socket.on('player:rejoin', ({ gameCode, email }) => {
    const code = (gameCode || '').toUpperCase();
    const session = getSession(code);

    if (!session) {
      return socket.emit('game:error', { code: 'GAME_NOT_FOUND', message: 'Game not found.' });
    }

    const player = session.players.get(email);
    if (!player) {
      return socket.emit('game:error', {
        code: 'NOT_IN_GAME',
        message: 'You were not in this game.',
      });
    }

    player.socketId = socket.id;
    player.disconnected = false;
    socket.join(code);

    // Tell the student where in the game they are
    const rejoinPayload = {
      status: session.status,
      currentQ: session.currentQ,
      score: player.score,
      totalQuestions: session.quiz.questions.length,
      displayName: player.displayName,
    };

    // If a question is currently active, send it (without correct answer)
    if (session.status === 'question') {
      const q = session.quiz.questions[session.currentQ];
      const elapsed = Date.now() - session.questionStartedAt;
      const secondsLeft = Math.max(0, q.timeLimit - Math.floor(elapsed / 1000));
      rejoinPayload.question = {
        index: session.currentQ,
        total: session.quiz.questions.length,
        text: q.text,
        options: q.options,
        timeLimit: q.timeLimit,
        secondsLeft,
        alreadyAnswered: session.currentAnswers.has(email),
      };
    }

    socket.emit('game:rejoined', rejoinPayload);
  });

  // Student submits an answer
  socket.on('player:answer', ({ gameCode, answerIndex }) => {
    const code = (gameCode || '').toUpperCase();
    const session = getSession(code);
    if (!session || session.status !== 'question') return;

    const email = findEmailBySocket(session, socket.id);
    if (!email) return;

    // Ignore duplicate submissions
    if (session.currentAnswers.has(email)) return;

    const q = session.quiz.questions[session.currentQ];
    const responseMs = Date.now() - session.questionStartedAt;
    const correct = answerIndex === q.correctIndex;
    const points = calculatePoints(correct, responseMs, q.timeLimit);

    session.currentAnswers.set(email, { answerIndex, responseMs, points });

    const player = session.players.get(email);
    player.score += points;
    player.answers.push({
      questionIndex: session.currentQ,
      chosenIndex: answerIndex,
      correct,
      points,
      responseMs,
    });

    // Acknowledge the answer lock-in (no correctness revealed yet)
    socket.emit('game:answer_ack', { received: true });

    // Report answer progress to host
    const answered = session.currentAnswers.size;
    const total = Array.from(session.players.values()).filter((p) => !p.disconnected).length;

    io.to(`${code}-host`).emit('host:answer_progress', { answered, total });

    // When every active player has answered, notify host they can advance early
    if (answered >= total) {
      io.to(`${code}-host`).emit('host:all_answered', {});
    }
  });

  // Player disconnects — keep their data so they can rejoin
  socket.on('disconnect', () => {
    for (const [, session] of games.entries()) {
      const email = findEmailBySocket(session, socket.id);
      if (email) {
        const player = session.players.get(email);
        if (player) player.disconnected = true;
        break;
      }
    }
  });
}

module.exports = { registerPlayerHandlers };
