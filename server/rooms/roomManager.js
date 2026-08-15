// ---------------------------------------------------------------------------
// roomManager
//
// Lightweight relay: the server pairs two sockets under a short room code
// and forwards messages between them. It does NOT run the fight simulation
// itself — the room's HOST browser is authoritative (runs physics/combat
// for both fighters and broadcasts state snapshots); the GUEST browser
// renders from those snapshots and sends its own input back to the host.
// This keeps the server simple while still giving the host a single source
// of truth instead of two independently-simulated clients drifting apart.
//
// Events (client -> server):
//   createRoom()                    -> ack({ code })
//   joinRoom({ code })               -> ack({ success, reason? })
//   characterSelect({ code, id })    -> relayed to the other peer
//   startMatch({ code })             -> relayed to the other peer
//   input({ code, input })           -> relayed to the other peer (guest -> host)
//   state({ code, snapshot })        -> relayed to the other peer (host -> guest)
//   event({ code, event })           -> relayed to the other peer (fx sync)
//
// Events (server -> client):
//   opponentJoined, opponentLeft, opponentCharacterSelect, matchStart,
//   input, state, event
// ---------------------------------------------------------------------------

const CODE_CHARS = '0123456789'; // digits only, so the client can use a simple numeric keypad

function generateCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

module.exports = function attachRoomManager(io) {
  const rooms = new Map(); // code -> { host: socketId, guest: socketId|null }
  const socketRoom = new Map(); // socketId -> code

  function otherSocketId(code, socketId) {
    const room = rooms.get(code);
    if (!room) return null;
    return room.host === socketId ? room.guest : room.host;
  }

  io.on('connection', (socket) => {
    socket.on('createRoom', (ack) => {
      const code = generateCode(rooms);
      rooms.set(code, { host: socket.id, guest: null });
      socketRoom.set(socket.id, code);
      socket.join(code);
      if (typeof ack === 'function') ack({ code });
    });

    socket.on('joinRoom', ({ code }, ack) => {
      const room = rooms.get(code);
      if (!room) {
        if (typeof ack === 'function') ack({ success: false, reason: 'Room not found' });
        return;
      }
      if (room.guest) {
        if (typeof ack === 'function') ack({ success: false, reason: 'Room is full' });
        return;
      }
      room.guest = socket.id;
      socketRoom.set(socket.id, code);
      socket.join(code);
      if (typeof ack === 'function') ack({ success: true });
      io.to(room.host).emit('opponentJoined');
    });

    const relay = (event) => {
      socket.on(event, (payload) => {
        const code = socketRoom.get(socket.id);
        if (!code) return;
        const targetId = otherSocketId(code, socket.id);
        if (targetId) io.to(targetId).emit(event, payload);
      });
    };
    relay('input');
    relay('state');
    relay('matchEvent');

    socket.on('characterSelect', ({ id } = {}) => {
      const code = socketRoom.get(socket.id);
      const targetId = code && otherSocketId(code, socket.id);
      if (targetId) io.to(targetId).emit('opponentCharacterSelect', id);
    });

    socket.on('startMatch', () => {
      const code = socketRoom.get(socket.id);
      if (code) socket.to(code).emit('matchStart'); // exclude sender — they transition themselves directly
    });

    socket.on('disconnect', () => {
      const code = socketRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      socketRoom.delete(socket.id);
      if (!room) return;

      const targetId = otherSocketId(code, socket.id);
      if (targetId) io.to(targetId).emit('opponentLeft');

      if (room.host === socket.id) {
        rooms.delete(code); // host leaving ends the room
      } else if (room.guest === socket.id) {
        room.guest = null;
      }
    });
  });
};
