const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { createRelay } = require("../lib/relay");
const net = require('node:net');
const { decisionOutput } = require("../lib/decisions");

const hookPath = path.join(__dirname, "..", "hooks", "nook-hook.js");

test('disconnected approval requests are removed without answering for the agent', async () => {
  const pipe = `\\\\.\\pipe\\nook-cancel-test-${process.pid}`; let approved, cancelled;
  const arrival = new Promise(resolve => { approved = resolve; }), gone = new Promise(resolve => { cancelled = resolve; });
  const relay = createRelay(pipe, { onActivity() {}, onApproval: approved, onCancel: cancelled }); await relay.listen();
  const socket = net.connect(pipe);
  try { await new Promise(resolve => socket.once('connect', resolve)); socket.write(JSON.stringify({ id: 'abandoned', wait: true, agent: 'claude', payload: {} }) + '\n'); await arrival; socket.destroy(); assert.equal(await gone, 'abandoned'); assert.equal(relay.respond('abandoned', {}), false); }
  finally { socket.destroy(); await relay.close(); }
});

function runHook(pipe, args, payload) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [hookPath, ...args], {
      env: { ...process.env, NOOK_PIPE: pipe },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stdin.end(JSON.stringify(payload));
    child.on("close", (code) => resolve({ code, stdout: stdout.trim() }));
  });
}

test("the hook reports activity and waits for an approval", async () => {
  const pipe = `\\\\.\\pipe\\nook-test-${process.pid}`;
  const seen = [];
  const relay = createRelay(pipe, {
    onActivity(msg) {
      seen.push(msg.payload.hook_event_name);
    },
    onApproval(msg) {
      relay.respond(msg.id, decisionOutput(msg.agent, true));
    },
  });
  await relay.listen();
  try {
    const watch = await runHook(pipe, ["--agent", "claude"], {
      hook_event_name: "Stop",
    });
    const approval = await runHook(pipe, ["--agent", "claude", "--wait"], {
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
      tool_input: { command: "echo hi" },
    });
    const closed = await runHook("\\\\.\\pipe\\nook-missing-pipe", ["--agent", "cursor", "--wait"], {
      hook_event_name: "beforeShellExecution",
      command: "echo hi",
    });
    assert.equal(watch.code, 0);
    assert.deepEqual(seen, ["Stop"]);
    assert.equal(approval.code, 0);
    assert.equal(JSON.parse(approval.stdout).hookSpecificOutput.decision.behavior, "allow");
    assert.equal(closed.code, 1);
  } finally {
    await relay.close();
  }
});

test('relay preserves split UTF-8 and rejects duplicate approvals and malformed payloads', async () => {
  const pipe = `\\\\.\\pipe\\nook-input-test-${process.pid}`;
  const seen = [], sockets = [];
  const relay = createRelay(pipe, { onActivity(msg) { seen.push(msg.payload.text); }, onApproval(msg) { seen.push(msg.id); } }); await relay.listen();
  const connect = async () => { const socket = net.connect(pipe); sockets.push(socket); socket.on('error', () => {}); await new Promise(resolve => socket.once('connect', resolve)); return socket; };
  const wait = () => new Promise(resolve => setTimeout(resolve, 25));
  try {
    const unicode = await connect(), bytes = Buffer.from(JSON.stringify({ id: 'unicode', agent: 'claude', payload: { text: '🌟' } }) + '\n'), offset = bytes.indexOf(Buffer.from('🌟')) + 1;
    unicode.write(bytes.subarray(0, offset)); await wait(); unicode.write(bytes.subarray(offset)); await wait(); assert.equal(seen[0], '🌟');
    const original = await connect(); const approval = JSON.stringify({ id: 'same-id', agent: 'claude', wait: true, payload: {} }) + '\n'; original.write(approval); await wait();
    const duplicate = await connect(); duplicate.write(approval); await wait(); assert.equal(seen.filter(item => item === 'same-id').length, 1); assert.equal(relay.respond('same-id', { allowed: false }), true);
    const malformed = await connect(); malformed.write(JSON.stringify({ id: 'invalid', agent: 'claude', payload: 'wrong type' }) + '\n'); await wait(); assert.equal(seen.length, 2);
  } finally { for (const socket of sockets) socket.destroy(); await relay.close(); }
});
