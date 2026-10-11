const vscode = require('vscode'), net = require('node:net'), crypto = require('node:crypto');
function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('nook.createLinkedTerminal', () => {
    const id = crypto.randomUUID(), token = crypto.randomBytes(32).toString('hex');
    const terminal = vscode.window.createTerminal({ name: 'Nook', env: { NOOK_TERMINAL_ID: id, NOOK_TERMINAL_TOKEN: token, NOOK_TERMINAL_PID: String(process.env.VSCODE_PID || '') } });
    const server = net.createServer(socket => {
      let text = ''; socket.setTimeout(1500, () => socket.destroy()); socket.on('error', () => {});
      socket.on('data', chunk => {
        text += chunk.toString('utf8'); if (text.length > 2000) return socket.destroy();
        if (!text.includes('\n')) return;
        try {
          const value = JSON.parse(text.split('\n')[0]);
          if (typeof value.token !== 'string' || value.token.length !== token.length || !crypto.timingSafeEqual(Buffer.from(value.token), Buffer.from(token))) return socket.end('{"ok":false}\n');
          terminal.show(false); socket.end('{"ok":true}\n');
        } catch { socket.destroy(); }
      });
    });
    server.on('error', () => vscode.window.showErrorMessage('Nook could not link this terminal. Create another linked terminal.'));
    server.listen('\\\\.\\pipe\\nook-terminal-' + id);
    let disposed = false;
    const dispose = () => { if (disposed) return; disposed = true; server.close(); close.dispose(); };
    const close = vscode.window.onDidCloseTerminal(closed => { if (closed === terminal) dispose(); });
    context.subscriptions.push({ dispose }); terminal.show(false);
  }));
}
module.exports = { activate };
