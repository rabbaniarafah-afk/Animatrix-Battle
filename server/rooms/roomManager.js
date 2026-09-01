// ---------------------------------------------------------------------------
// roomManager
//
// Lightweight relay: the server pairs sockets under a short room code and
// forwards messages between them. It does NOT run the fight simulation
// itself — the room's HOST browser is authoritative (runs physics/combat
// for every fighter and broadcasts state snapshots); every other browser
// in the room renders from those snapshots and sends its own input back to
// the host. This keeps the server simple while still giving the host a
// single source of truth instead of clients independently simulating and
// drifting apart.
//
// Two room modes:
//   '1v1' — exactly the original behavior: host + one guest, 2 fighters.
//   '2v2' — up to 4 sockets, 2 per team (A/B). The room CREATOR is always
//           the host and simulates all 4 fighters. Team-lobby only for now
//           (see ArenaScene.js) — 2v2 combat itself is a follow-up piece.
//
// Events (client -> server):
//   createRoom({ mode })             -> ack({ code, mode })
//   joinRoom({ code })                -> ack({ success, reason?, mode, team?, slot? })
//   setReady({ ready })                -> broadcast lobbyUpdate to the room
//   characterSelect({ id })           -> broadcast to the rest of the room
//   startMatch()                      -> broadcast to the rest of the room
//   input(payload)                    -> forwarded to the host only
//   state(payload)                    -> forwarded from host to everyone else
//   event(payload) / matchEvent       -> forwarded from host to everyone else
//
// Events (server -> client):
//   opponentJoined, opponentLeft, opponentCharacterSelect, matchStart,
//   lobbyUpdate, input, state, matchEvent
// ---------------------------------------------------------------------------

const CODE_CHARS = '0123456789'; // digits only, so the client can use a simple numeric keypad

// Fill order for 2v2 team slots — alternates teams so the lobby stays as
// balanced as possible while people are still joining.
const TEAM_SLOT_ORDER = ['A0', 'B0', 'A1', 'B1'];

function generateCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

module.exports = function attachRoomManager(io) {
  // 1v1 room: { mode: '1v1', host: socketId, guest: socketId|null }
  // 2v2 room: { mode: '2v2', host: socketId, slots: { A0, A1, B0, B1 }, ready: Set<socketId> }
  const rooms = new Map();
  const socketRoom = new Map(); // socketId -> code

  function otherSocketId(code, socketId) {
    const room = rooms.get(code);
    if (!room || room.mode !== '1v1') return null;
    return room.host === socketId ? room.guest : room.host;
  }

  function lobbySnapshot(room) {
    return {
      mode: room.mode,
      slots: { ...room.slots },
      readyCount: room.ready.size,
    };
  }

  function broadcastLobby(code) {
    const room = rooms.get(code);
    if (!room || room.mode !== '2v2') return;
    io.to(code).emit('lobbyUpdate', lobbySnapshot(room));
  }

  function slotFor(room, socketId) {
    return Object.entries(room.slots).find(([, id]) => id === socketId)?.[0] || null;
  }

  io.on('connection', (socket) => {
    socket.on('createRoom', ({ mode } = {}, ack) => {
      const roomMode = mode === '2v2' ? '2v2' : '1v1';
      const code = generateCode(rooms);

      if (roomMode === '2v2') {
        rooms.set(code, {
          mode: '2v2',
          host: socket.id,
          slots: { A0: socket.id, A1: null, B0: null, B1: null },
          ready: new Set(),
        });
      } else {
        rooms.set(code, { mode: '1v1', host: socket.id, guest: null });
      }

      socketRoom.set(socket.id, code);
      socket.join(code);
      if (typeof ack === 'function') ack({ code, mode: roomMode });
    });

    socket.on('joinRoom', ({ code }, ack) => {
      const room = rooms.get(code);
      if (!room) {
        if (typeof ack === 'function') ack({ success: false, reason: 'Room not found' });
        return;
      }

      if (room.mode === '2v2') {
        const openSlot = TEAM_SLOT_ORDER.find((s) => !room.slots[s]);
        if (!openSlot) {
          if (typeof ack === 'function') ack({ success: false, reason: 'Room is full' });
          return;
        }
        room.slots[openSlot] = socket.id;
        socketRoom.set(socket.id, code);
        socket.join(code);
        const team = openSlot[0]; // 'A' | 'B'
        const slotIndex = Number(openSlot[1]);
        if (typeof ack === 'function') ack({ success: true, mode: '2v2', team, slot: slotIndex });
        broadcastLobby(code);
        return;
      }

      // 1v1
      if (room.guest) {
        if (typeof ack === 'function') ack({ success: false, reason: 'Room is full' });
        return;
      }
      room.guest = socket.id;
      socketRoom.set(socket.id, code);
      socket.join(code);
      if (typeof ack === 'function') ack({ success: true, mode: '1v1' });
      io.to(room.host).emit('opponentJoined');
    });

    socket.on('setReady', ({ ready } = {}) => {
      const code = socketRoom.get(socket.id);
      const room = rooms.get(code);
      if (!room || room.mode !== '2v2') return;
      if (ready) room.ready.add(socket.id);
      else room.ready.delete(socket.id);
      broadcastLobby(code);
    });

    // input: only the host should ever receive it (everyone else's local
    // input flows to the host, which is authoritative for the whole match).
    socket.on('input', (payload) => {
      const code = socketRoom.get(socket.id);
      const room = rooms.get(code);
      if (!room) return;
      if (room.host && room.host !== socket.id) io.to(room.host).emit('input', payload);
    });

    // state: only the host is allowed to broadcast it, to everyone else in the room.
    socket.on('state', (payload) => {
      const code = socketRoom.get(socket.id);
      const room = rooms.get(code);
      if (!room || room.host !== socket.id) return;
      socket.to(code).emit('state', payload);
    });

    // matchEvent (fx sync): host-only, broadcast to the rest of the room.
    socket.on('matchEvent', (payload) => {
      const code = socketRoom.get(socket.id);
      const room = rooms.get(code);
      if (!room || room.host !== socket.id) return;
      socket.to(code).emit('matchEvent', payload);
    });

    socket.on('characterSelect', ({ id } = {}) => {
      const code = socketRoom.get(socket.id);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      if (room.mode === '2v2') {
        socket.to(code).emit('opponentCharacterSelect', { id, from: slotFor(room, socket.id) });
      } else {
        const targetId = otherSocketId(code, socket.id);
        if (targetId) io.to(targetId).emit('opponentCharacterSelect', id); // unchanged 1v1 shape — client expects the raw id
      }
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

      if (room.mode === '2v2') {
        const slot = slotFor(room, socket.id);
        if (slot) room.slots[slot] = null;
        room.ready.delete(socket.id);

        if (room.host === socket.id) {
          rooms.delete(code); // host leaving ends the room, same rule as 1v1
          io.to(code).emit('opponentLeft');
        } else {
          broadcastLobby(code);
          io.to(code).emit('opponentLeft');
        }
        return;
      }

      // 1v1
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
