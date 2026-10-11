const net = require('node:net');
function focusLinkedTerminal(link) {
  link = require('./terminal').terminalLink(link);
  if (link?.host !== 'editor') return Promise.resolve(false);
  return new Promise(resolve => {
    const socket = net.connect('\\\\.\\pipe\\nook-terminal-' + link.id);
    let text = '', settled = false;
    const done = ok => { if (settled) return; settled = true; socket.destroy(); resolve(ok); };
    socket.setTimeout(1800);
    socket.on('connect', () => socket.write(JSON.stringify({ token: link.token }) + '\n'));
    socket.on('data', chunk => { text += chunk.toString('utf8'); if (text.length > 2000) return done(false); if (text.includes('\n')) { try { done(JSON.parse(text.split('\n')[0]).ok === true); } catch { done(false); } } });
    socket.on('error', () => done(false)); socket.on('timeout', () => done(false)); socket.on('end', () => done(false));
  });
}
module.exports = { focusLinkedTerminal };
