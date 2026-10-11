const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const path = require("path");
const { pickTerminal } = require("../lib/terminal");

const PIPE = process.env.NOOK_PIPE || "\\\\.\\pipe\\nook-companion";
const WAIT_MS = 110000;
const WATCH_MS = 300;

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    return "";
  }
  return process.argv[index + 1];
}

function finish(code, stdout) {
  if (stdout) {
    process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
  }
  process.exit(code);
}

function send(agent, wait, payload, extra) {
  const failOpenCode = agent === "cursor" && wait ? 1 : 0;
  const request = {
    id: crypto.randomUUID(),
    agent,
    wait,
    pid: process.pid,
    payload,
    terminal: process.env.NOOK_TERMINAL_ID ? { host: 'editor', id: process.env.NOOK_TERMINAL_ID, token: process.env.NOOK_TERMINAL_TOKEN, pid: process.env.NOOK_TERMINAL_PID } : process.env.NOOK_TERMINAL_TITLE ? { host: 'wt', title: process.env.NOOK_TERMINAL_TITLE } : null,
    ...(extra || {}),
  };
  const socket = net.connect(PIPE);
  let settled = false;
  let buf = "";

  const done = (code, stdout) => {
    if (settled) {
      return;
    }
    settled = true;
    socket.destroy();
    finish(code, stdout);
  };

  socket.setTimeout(wait ? WAIT_MS : WATCH_MS);
  socket.on("connect", () => {
    socket.write(`${JSON.stringify(request)}\n`);
  });
  socket.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    const nl = buf.indexOf("\n");
    if (nl === -1) {
      return;
    }
    try {
      const message = JSON.parse(buf.slice(0, nl));
      if (message.ok && !wait) {
        done(0, "");
        return;
      }
      if (message.fallback || !message.output) {
        done(failOpenCode, "");
        return;
      }
      done(0, JSON.stringify(message.output));
    } catch (_error) {
      done(failOpenCode, "");
    }
  });
  socket.on("timeout", () => done(failOpenCode, ""));
  socket.on("error", () => done(failOpenCode, ""));
}

function agentName(value) {
  const name = String(value || "").toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,24}$/.test(name)) {
    return "";
  }
  return name;
}

function parentRow(pid) {
  const id = Number(pid);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  try {
    const output = execFileSync(
      "wmic",
      ["process", "where", `ProcessId=${id}`, "get", "Name,ParentProcessId", "/format:csv"],
      { encoding: "utf8", timeout: 1500, windowsHide: true },
    );
    const line = output
      .split(/\r?\n/)
      .map((row) => row.trim())
      .find((row) => row && !row.startsWith("Node") && row.includes(","));
    if (!line) {
      return null;
    }
    const parts = line.split(",");
    return { name: parts[1] || "", pid: id, parent: Number(parts[2]) || 0 };
  } catch (_error) {
    return null;
  }
}

function ancestorChain(pid) {
  const chain = [];
  let current = Number(pid);
  for (let step = 0; step < 8 && current > 0; step += 1) {
    const row = parentRow(current);
    if (!row) {
      break;
    }
    chain.push(row);
    current = row.parent;
  }
  return chain;
}

let statuslineRan = false;

function runPrevious(raw) {
  if (statuslineRan) {
    return;
  }
  statuslineRan = true;
  const previousPath = path.join(process.env.APPDATA || "", "nook", "statusline-previous.txt");
  let previous = "";
  try {
    previous = fs.readFileSync(previousPath, "utf8").trim();
  } catch (_error) {
    previous = "";
  }
  if (!previous || previous.includes("nook-hook.cmd")) {
    finish(0, "");
    return;
  }
  try {
    const output = execFileSync(previous, {
      input: raw,
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
      shell: true,
    });
    finish(0, output);
  } catch (_error) {
    finish(0, "");
  }
}

function main() {
  if (process.argv.includes("--statusline")) {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      const raw = Buffer.concat(chunks);
      let payload = {};
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch (_error) {
        payload = {};
      }
      const socket = net.connect(PIPE);
      const timer = setTimeout(() => {
        socket.destroy();
        runPrevious(raw);
      }, 300);
      socket.on("error", () => {
        clearTimeout(timer);
        runPrevious(raw);
      });
      socket.on("connect", () => {
        socket.write(`${JSON.stringify({ id: crypto.randomUUID(), agent: "claude", statusline: true, payload })}\n`);
      });
      socket.on("data", () => {
        clearTimeout(timer);
        socket.destroy();
        runPrevious(raw);
      });
    });
    return;
  }
  const agent = agentName(readArg("--agent"));
  const wait = process.argv.includes("--wait");
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => {
    if (!agent) {
      finish(0, "");
    }
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    let payload = {};
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (_error) {
        payload = {};
      }
    }
    let nextWait = wait;
    if (wait && agent === "claude") {
      const picked = pickTerminal(ancestorChain(process.ppid));
      if (picked.desktop) {
        nextWait = false;
        payload.nook_agent = payload.nook_agent || "Claude Desktop";
      }
    }
    send(agent, nextWait, payload);
  });
}

main();
