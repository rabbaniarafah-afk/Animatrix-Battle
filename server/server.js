// ---------------------------------------------------------------------------
// Server — serves the client as static files, and (when socket.io is
// available) hosts Online Battle room relaying. Socket.IO is required
// defensively: if it's ever missing, the server still runs fine for
// Quick/Training/Local Battle — only Online Battle is unavailable.
// ---------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(CLIENT_DIR, reqPath);

  // Prevent path traversal outside the client directory
  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

let onlineEnabled = false;
try {
  const { Server: SocketIOServer } = require('socket.io');
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  require('./rooms/roomManager')(io);
  onlineEnabled = true;
} catch (err) {
  onlineEnabled = false;
}

server.listen(PORT, () => {
  console.log(`ANIMATRIX BATTLE running at http://localhost:${PORT}`);
  console.log(
    onlineEnabled
      ? 'Online Battle: enabled (Socket.IO active).'
      : 'Online Battle: disabled — socket.io not found. Run "npm install" in this folder to enable it.'
  );
});
