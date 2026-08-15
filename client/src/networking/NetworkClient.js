// ---------------------------------------------------------------------------
// NetworkClient — thin wrapper around the vendored socket.io-client (loaded
// globally as `io` via client/vendor/socket.io.min.js).
//
// The room's HOST is authoritative: it runs the real match simulation for
// both fighters and periodically broadcasts state snapshots. The GUEST
// sends its own input to the host every frame and renders from whatever
// snapshot last arrived. See server/rooms/roomManager.js for the relay.
// ---------------------------------------------------------------------------

export class NetworkClient {
  constructor() {
    this.socket = null;
    this.code = null;
    this.listeners = {};
  }

  connect() {
    if (this.socket) return;
    this.socket = window.io(); // same-origin connection to server/server.js
    const events = ['opponentJoined', 'opponentLeft', 'opponentCharacterSelect', 'matchStart', 'input', 'state', 'matchEvent', 'connect_error'];
    events.forEach((evt) => {
      this.socket.on(evt, (payload) => this._emitLocal(evt, payload));
    });
  }

  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  _emitLocal(event, payload) {
    (this.listeners[event] || []).forEach((h) => h(payload));
  }

  createRoom() {
    return new Promise((resolve) => {
      this.connect();
      this.socket.emit('createRoom', ({ code }) => {
        this.code = code;
        resolve(code);
      });
    });
  }

  joinRoom(code) {
    return new Promise((resolve) => {
      this.connect();
      this.socket.emit('joinRoom', { code }, (res) => {
        if (res.success) this.code = code;
        resolve(res);
      });
    });
  }

  sendCharacterSelect(id) {
    this.socket?.emit('characterSelect', { id });
  }

  sendStartMatch() {
    this.socket?.emit('startMatch');
  }

  sendInput(input) {
    this.socket?.emit('input', input);
  }

  sendState(snapshot) {
    this.socket?.emit('state', snapshot);
  }

  sendEvent(evt) {
    this.socket?.emit('matchEvent', evt);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.code = null;
    this.listeners = {};
  }
}
