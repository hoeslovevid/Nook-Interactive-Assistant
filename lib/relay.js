const net = require("net");

function createRelay(pipePath, handlers) {
  const pending = new Map();
  const server = net.createServer((socket) => {
    let buf = "";
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let nl = buf.indexOf("\n");
      while (nl !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        accept(socket, line);
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
    if (!msg || typeof msg.id !== "string") {
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
