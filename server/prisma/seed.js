/**
 * Seed script — creates a demo teacher account and a sample quiz.
 * Run with: npm --prefix server run db:seed
 *
 * Demo credentials:
 *   Email   : demo@quizwave.app
 *   Password: demo1234
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@quizwave.app';
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });

  console.log(`[seed] Teacher ready: ${teacher.email}`);

  // Remove existing seed quiz so re-running is idempotent
  await prisma.quiz.deleteMany({ where: { title: 'Science Starter Pack', teacherId: teacher.id } });

  const quiz = await prisma.quiz.create({
    data: {
      title: 'Science Starter Pack',
      description: 'A five-question warm-up on basic science concepts.',
      teacherId: teacher.id,
      questions: {
        create: [
          {
            orderIndex: 0,
            text: 'What is the chemical formula for water?',
            options: ['H2O', 'CO2', 'NaCl', 'O2'],
            correctIndex: 0,
            explanation: 'Water is made of two hydrogen atoms and one oxygen atom.',
            timeLimit: 20,
          },
          {
            orderIndex: 1,
            text: 'Which planet is closest to the Sun?',
            options: ['Venus', 'Earth', 'Mars', 'Mercury'],
            correctIndex: 3,
            explanation: 'Mercury is the innermost planet in our solar system.',
            timeLimit: 25,
          },
          {
            orderIndex: 2,
            text: 'What force keeps planets in orbit around the Sun?',
            options: ['Magnetism', 'Gravity', 'Friction', 'Nuclear force'],
            correctIndex: 1,
            explanation: 'Gravity is the attractive force between masses.',
            timeLimit: 30,
          },
          {
            orderIndex: 3,
            text: 'How many bones are in the adult human body?',
            options: ['196', '206', '216', '226'],
            correctIndex: 1,
            explanation: 'The adult skeleton has 206 bones.',
            timeLimit: 25,
          },
          {
            orderIndex: 4,
            text: 'What gas do plants absorb during photosynthesis?',
            options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
            correctIndex: 2,
            explanation: 'Plants take in CO₂ and release O₂ during photosynthesis.',
            timeLimit: 20,
          },
        ],
      },
    },
  });

  console.log(`[seed] Quiz created: "${quiz.title}" (id ${quiz.id})`);
  console.log('[seed] Done. Login with demo@quizwave.app / demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
