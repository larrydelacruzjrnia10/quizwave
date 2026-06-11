require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initSocket } = require('./socket');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/games', require('./routes/games'));

app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

initSocket(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
});
