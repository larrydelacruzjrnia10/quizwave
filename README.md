# QuizWave

Live, multi-device classroom quiz app — self-hosted, Kahoot-style.  
Teacher hosts from a laptop/projector; students join on their phones.

---

## Quick Start (local dev)

```bash
# 1. Install all dependencies
npm run install:all

# 2. Copy env files and fill in your values
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Create DB, run migrations, seed sample quiz
cd server
npx prisma migrate dev --name init
node prisma/seed.js
cd ..

# 4. Start both processes
npm run dev
```

- Client → http://localhost:5173  
- Server → http://localhost:4000  
- Demo login → `demo@quizwave.app` / `demo1234`

---

## Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL or MySQL connection string |
| `PORT` | Express port (default: 4000) |
| `CLIENT_ORIGIN` | Client URL for CORS (e.g. `http://localhost:5173`) |
| `JWT_SECRET` | Long random secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`) |

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (e.g. `http://localhost:4000` or your domain) |

---

## Data Model

```
Teacher ──< Quiz ──< Question
              └──< GameSession ──< PlayerResult
```

| Table | Purpose |
|---|---|
| `Teacher` | Teacher accounts with hashed passwords |
| `Quiz` | A named collection of questions owned by a teacher |
| `Question` | Question text, 2–4 options (JSON), correct index, time limit |
| `GameSession` | One live game run: join code, status, FK to Quiz |
| `PlayerResult` | Final score + full answer history per student per game |

**Live game state** (current question, who has answered, live scores) lives in server memory only — keyed by join code in `server/src/socket/gameState.js`. It is never written to the DB until the game ends.

### MySQL switch

In `server/prisma/schema.prisma`, change:
```prisma
datasource db {
  provider = "mysql"   // was "postgresql"
  url      = env("DATABASE_URL")
}
```
Then update `DATABASE_URL` to a MySQL connection string. No other code changes are needed.

---

## Socket.IO Event Reference

All events are scoped to a **socket room = join code**.  
Host additionally joins `${gameCode}-host` to receive host-only events.

### Client → Server

| Event | Who | Payload | Description |
|---|---|---|---|
| `host:connect` | Teacher | `{ gameCode, token }` | Attach socket to session, send JWT for auth |
| `host:start` | Teacher | `{ gameCode }` | Start game, advance to Q0 |
| `host:next` | Teacher | `{ gameCode }` | Next question or end game |
| `host:reveal_now` | Teacher | `{ gameCode }` | Force-reveal before timer expires |
| `host:kick` | Teacher | `{ gameCode, email }` | Remove a player |
| `player:join` | Student | `{ gameCode, email }` | Join lobby |
| `player:rejoin` | Student | `{ gameCode, email }` | Reconnect mid-game |
| `player:answer` | Student | `{ gameCode, answerIndex }` | Submit answer (server timestamps it) |

### Server → Client

| Event | To | Payload | Description |
|---|---|---|---|
| `host:connected` | Host only | `{ status, players, totalQuestions, quizTitle }` | Session state on connect |
| `host:player_list` | Host only | `{ players }` | Updated roster |
| `host:answer_progress` | Host only | `{ answered, total }` | Running count |
| `host:all_answered` | Host only | `{}` | All active players have answered |
| `game:joined` | Student only | `{ displayName, playerCount, quizTitle }` | Confirmed in lobby |
| `game:rejoined` | Student only | `{ status, score, question? }` | State on reconnect |
| `game:started` | Room | `{ totalQuestions }` | Game starting |
| `game:question` | Room | `{ index, total, text, options, timeLimit }` | New question — **no correct answer** |
| `game:time_tick` | Room | `{ secondsLeft }` | Server clock tick every second |
| `game:answer_ack` | Student only | `{ received: true }` | Lock-in confirmed |
| `game:answer_result` | Student only | `{ correct, points, totalScore, rank, answered }` | Personal result after reveal |
| `game:question_end` | Room | `{ correctIndex, explanation, optionCounts, leaderboard }` | Reveal phase |
| `game:ended` | Room | `{ leaderboard }` | Game over |
| `game:student_final` | Student only | `{ rank, score, totalPlayers }` | Personal final standing |
| `game:error` | Requester | `{ code, message }` | Error codes: `GAME_NOT_FOUND`, `GAME_STARTED`, `NAME_TAKEN`, etc. |
| `game:kicked` | Student only | `{ message }` | Host removed this player |
| `game:host_disconnect` | Room | `{ message }` | Host socket dropped (30s grace period) |

### Scoring (server-authoritative)

```
correctAnswer:  1000 pts base + up to 500 speed bonus
speedBonus   :  floor(500 × (1 - responseMs / (timeLimit × 1000)))
wrongAnswer  :  0 pts
```

The client **never** reports points. It only sends the answer index; the server computes everything.

---

## Project Structure

```
quiz-app/
├── client/          React + Vite frontend
│   └── src/
│       ├── pages/teacher/   Host lobby, game, quiz CRUD
│       ├── pages/student/   Join, play, results
│       ├── components/      CountdownRing, Leaderboard, AnswerTile, OptionBreakdown
│       ├── context/         AuthContext (JWT), SocketContext (Socket.IO)
│       └── hooks/           useCountdown
└── server/          Node + Express + Socket.IO
    ├── prisma/      Schema, migrations, seed
    └── src/
        ├── routes/  auth, quizzes, games
        ├── socket/  gameState, scoring, gameFlow, handlers
        └── services/ quizService, gameService
```
