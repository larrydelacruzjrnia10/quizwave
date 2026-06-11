/**
 * Socket.IO entry point.
 * Attaches host and player event handlers to every new connection.
 */

const { registerHostHandlers } = require('./handlers/hostHandlers');
const { registerPlayerHandlers } = require('./handlers/playerHandlers');

function initSocket(io) {
  io.on('connection', (socket) => {
    registerHostHandlers(io, socket);
    registerPlayerHandlers(io, socket);
  });
}

module.exports = { initSocket };
