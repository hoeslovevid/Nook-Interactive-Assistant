// Activity-only adapter. The agent keeps its own permission prompts.
const fs = require('node:fs'), net = require('node:net'), crypto = require('node:crypto');
const { adapt } = require('../lib/custom-agents');
const at = process.argv.indexOf('--config');
let raw = '', oversized = false;
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { if (Buffer.byteLength(raw) + Buffer.byteLength(chunk) > 1000000) { oversized = true; raw = ''; } else if (!oversized) raw += chunk; });
process.stdin.on('end', () => {
  try {
    if (oversized || at < 0 || !process.argv[at + 1]) return;
    const file = process.argv[at + 1]; if (fs.statSync(file).size > 20000) return;
    const profile = JSON.parse(fs.readFileSync(file, 'utf8')), payload = adapt(profile, JSON.parse(raw)); if (!payload) return;
    const socket = net.connect(process.env.NOOK_PIPE || '\\\\.\\pipe\\nook-companion');
    socket.setTimeout(300); const finish = () => socket.destroy();
    socket.on('connect', () => socket.write(JSON.stringify({ id: crypto.randomUUID(), agent: profile.id, wait: false, pid: process.pid, payload }) + '\n'));
    socket.on('timeout', finish); socket.on('error', finish); socket.on('data', finish);
  } catch { /* Missing config, unknown events, and an offline Nook never block tools. */ }
});
