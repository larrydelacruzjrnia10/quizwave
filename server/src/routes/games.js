const router = require('express').Router();
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { createSession, generateCode, getSession } = require('../socket/gameState');

// Create a new game session (teacher only)
router.post('/', requireAuth, async (req, res) => {
  const { quizId } = req.body;
  if (!quizId) return res.status(400).json({ error: 'quizId is required' });

  const quiz = await prisma.quiz.findFirst({
    where: { id: Number(quizId), teacherId: req.teacherId },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  if (quiz.questions.length === 0) {
    return res.status(400).json({ error: 'Quiz has no questions' });
  }

  const gameCode = generateCode();

  // Persist to DB so results can be saved later
  await prisma.gameSession.create({
    data: { joinCode: gameCode, quizId: quiz.id, status: 'LOBBY' },
  });

  // Create in-memory session (hostSocketId attached when teacher connects via socket)
  createSession({ gameCode, quizId: quiz.id, quiz, hostSocketId: null });

  res.json({ gameCode });
});

// Get the live status of a game (used by student join page to validate before socket connect)
router.get('/:gameCode/status', async (req, res) => {
  const session = getSession(req.params.gameCode.toUpperCase());
  if (!session) {
    return res.status(404).json({ error: 'Game not found. Check the code and try again.' });
  }
  if (session.status === 'finished') {
    return res.status(410).json({ error: 'This game has already ended.' });
  }
  res.json({
    status: session.status,
    playerCount: session.players.size,
    quizTitle: session.quiz.title,
  });
});

// Get persisted results for a finished game
router.get('/:gameCode/results', async (req, res) => {
  const session = await prisma.gameSession.findUnique({
    where: { joinCode: req.params.gameCode.toUpperCase() },
    include: {
      playerResults: { orderBy: { rank: 'asc' } },
      quiz: { select: { title: true } },
    },
  });
  if (!session) return res.status(404).json({ error: 'Game not found' });
  res.json(session);
});

module.exports = router;
