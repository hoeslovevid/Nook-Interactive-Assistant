const net = require("net");
const { StringDecoder } = require('node:string_decoder');

function createRelay(pipePath, handlers) {
  const pending = new Map();
  const server = net.createServer((socket) => {
    let buf = "";
    const decoder = new StringDecoder('utf8');
    socket.on("data", (chunk) => {
      buf += decoder.write(chunk);
      if (Buffer.byteLength(buf) > 5000000) { socket.destroy(); return; }
      let nl = buf.indexOf("\n");
      while (nl !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        try { accept(socket, line); } catch { socket.destroy(); return; }
        nl = buf.indexOf("\n");
      }
    });
    socket.on("error", () => {});
  });

  function accept(socket, line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (_error) {
      return;
    }
    if (!msg || typeof msg.id !== "string" || !msg.id || msg.id.length > 200 || typeof msg.agent !== 'string' || !/^[a-z0-9-]{1,30}$/i.test(msg.agent) || !msg.payload || typeof msg.payload !== 'object' || Array.isArray(msg.payload)) {
      socket.destroy();
      return;
    }
    if (msg.statusline) {
      if (handlers.onStatus) {
        handlers.onStatus(msg);
      }
      try {
        socket.write(`${JSON.stringify({ id: msg.id, ok: true })}\n`, () => socket.end());
      } catch (_error) {
        socket.destroy();
      }
      return;
    }
    if (msg.wait) {
      // Keep the original request attached to its original hook process.
      if (pending.has(msg.id)) { socket.destroy(); return; }
      pending.set(msg.id, socket);
      socket.once('close', () => {
        if (pending.get(msg.id) !== socket) return;
        pending.delete(msg.id); handlers.onCancel?.(msg.id);
      });
      handlers.onApproval(msg);
      return;
    }
    handlers.onActivity(msg);
    try {
      socket.write(`${JSON.stringify({ id: msg.id, ok: true })}\n`, () => {
        socket.end();
      });
    } catch (_error) {
      socket.destroy();
    }
  }

  function respond(id, output) {
    const socket = pending.get(id);
    if (!socket) {
      return false;
    }
    pending.delete(id);
    const message = output ? { id, output } : { id, fallback: true };
    try {
      socket.write(`${JSON.stringify(message)}\n`, () => {
        socket.end();
      });
    } catch (_error) {
      socket.destroy();
    }
    return true;
  }

  return {
    listen() {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(pipePath, () => {
          server.removeListener("error", reject);
          resolve();
        });
      });
    },
    respond,
    close() {
      for (const id of pending.keys()) {
        respond(id, null);
      }
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

module.exports = { createRelay };
