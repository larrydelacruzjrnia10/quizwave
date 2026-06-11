/**
 * In-memory game sessions.
 * Key  : 6-char join code (uppercase)
 * Value: session object (see shape below)
 *
 * Live game state intentionally never touches the DB — only the final
 * results are persisted once the game ends.
 */
const games = new Map();

/**
 * Session shape:
 * {
 *   gameCode        : string
 *   quizId          : number
 *   quiz            : { id, title, questions: Question[] }  — loaded once at creation
 *   hostSocketId    : string | null
 *   status          : 'lobby' | 'question' | 'revealing' | 'finished'
 *   currentQ        : number   (-1 before start)
 *   questionStartedAt: number  (Date.now() when question was pushed)
 *   players         : Map<email, PlayerEntry>
 *   currentAnswers  : Map<email, AnswerEntry>
 *   timer           : NodeJS.Timeout | null
 *   _hostGraceTimer : NodeJS.Timeout | null
 * }
 *
 * PlayerEntry:
 * { socketId, email, displayName, score, answers: AnswerRecord[], disconnected }
 *
 * AnswerEntry:
 * { answerIndex, responseMs, points }
 */

function createSession({ gameCode, quizId, quiz, hostSocketId }) {
  const session = {
    gameCode,
    quizId,
    quiz,
    hostSocketId,
    status: 'lobby',
    currentQ: -1,
    questionStartedAt: null,
    players: new Map(),
    currentAnswers: new Map(),
    timer: null,
    _hostGraceTimer: null,
  };
  games.set(gameCode, session);
  return session;
}

function getSession(gameCode) {
  return games.get(gameCode) || null;
}

function deleteSession(gameCode) {
  const session = games.get(gameCode);
  if (!session) return;
  if (session.timer) clearTimeout(session.timer);
  if (session._hostGraceTimer) clearTimeout(session._hostGraceTimer);
  games.delete(gameCode);
}

/** Find which email owns a given socket ID. O(n) but sessions are small. */
function findEmailBySocket(session, socketId) {
  for (const [email, player] of session.players.entries()) {
    if (player.socketId === socketId) return email;
  }
  return null;
}

/** Generates a unique, unambiguous 6-character game code. */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return games.has(code) ? generateCode() : code;
}

module.exports = { games, createSession, getSession, deleteSession, findEmailBySocket, generateCode };
