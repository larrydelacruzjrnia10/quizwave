const prisma = require('../config/db');

async function markGameStarted(gameCode) {
  await prisma.gameSession.update({
    where: { joinCode: gameCode },
    data: { status: 'ACTIVE', startedAt: new Date() },
  });
}

async function saveResults({ gameCode, leaderboard, players }) {
  const session = await prisma.gameSession.findUnique({
    where: { joinCode: gameCode },
  });
  if (!session) return;

  await prisma.gameSession.update({
    where: { joinCode: gameCode },
    data: { status: 'FINISHED', endedAt: new Date() },
  });

  if (leaderboard.length === 0) return;

  await prisma.playerResult.createMany({
    data: leaderboard.map((p) => {
      const player = players.get(p.email);
      return {
        gameSessionId: session.id,
        email: p.email,
        displayName: p.displayName,
        score: p.score,
        rank: p.rank,
        answers: player?.answers || [],
      };
    }),
  });
}

module.exports = { markGameStarted, saveResults };
