const prisma = require('../config/db');

async function getFullQuiz(quizId, teacherId) {
  return prisma.quiz.findFirst({
    where: { id: Number(quizId), teacherId: Number(teacherId) },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });
}

module.exports = { getFullQuiz };
