const router = require('express').Router();
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// List all quizzes for the authenticated teacher
router.get('/', requireAuth, async (req, res) => {
  const quizzes = await prisma.quiz.findMany({
    where: { teacherId: req.teacherId },
    include: { _count: { select: { questions: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(quizzes);
});

// Get a single quiz with all questions
router.get('/:id', requireAuth, async (req, res) => {
  const quiz = await prisma.quiz.findFirst({
    where: { id: Number(req.params.id), teacherId: req.teacherId },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

// Create a new quiz with questions
router.post('/', requireAuth, async (req, res) => {
  const { title, description, questions } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' });
  }

  const quiz = await prisma.quiz.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      teacherId: req.teacherId,
      questions: {
        create: questions.map((q, i) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || null,
          timeLimit: q.timeLimit || 30,
          orderIndex: i,
        })),
      },
    },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });

  res.status(201).json(quiz);
});

// Update a quiz (replaces questions entirely)
router.put('/:id', requireAuth, async (req, res) => {
  const quizId = Number(req.params.id);
  const { title, description, questions } = req.body;

  const existing = await prisma.quiz.findFirst({
    where: { id: quizId, teacherId: req.teacherId },
  });
  if (!existing) return res.status(404).json({ error: 'Quiz not found' });

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' });
  }

  // Delete old questions then recreate — simplest approach for a quiz editor
  await prisma.question.deleteMany({ where: { quizId } });

  const quiz = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      questions: {
        create: questions.map((q, i) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || null,
          timeLimit: q.timeLimit || 30,
          orderIndex: i,
        })),
      },
    },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });

  res.json(quiz);
});

// Delete a quiz
router.delete('/:id', requireAuth, async (req, res) => {
  const quizId = Number(req.params.id);
  const existing = await prisma.quiz.findFirst({
    where: { id: quizId, teacherId: req.teacherId },
  });
  if (!existing) return res.status(404).json({ error: 'Quiz not found' });

  await prisma.quiz.delete({ where: { id: quizId } });
  res.json({ success: true });
});

module.exports = router;
