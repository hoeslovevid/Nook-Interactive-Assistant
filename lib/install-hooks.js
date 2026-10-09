const MARKER = "nook-hook.cmd";

const CLAUDE_WATCH = ["SessionStart", "UserPromptSubmit", "PostToolUse", "Stop"];
const CLAUDE_WAIT = ["PermissionRequest"];
const CURSOR_WATCH = [
  "sessionStart",
  "beforeSubmitPrompt",
  "afterFileEdit",
  "afterShellExecution",
  "stop",
];
const CURSOR_WAIT = ["beforeShellExecution", "beforeMCPExecution"];

function isOurs(command) {
  return typeof command === "string" && command.includes(MARKER);
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return structuredClone(value);
}

function stripClaude(list) {
  return list
    .map((entry) => {
      const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
      return {
        ...entry,
        hooks: hooks.filter((hook) => !isOurs(hook.command)),
      };
    })
    .filter((entry) => entry.hooks.length > 0);
}

function claudeEntry(command, timeout) {
  return {
    matcher: "*",
    hooks: [{ type: "command", command, timeout }],
  };
}

function mergeClaudeSettings(existing, watchCommand, waitCommand) {
  const base = asObject(existing);
  if (!base.hooks || typeof base.hooks !== "object" || Array.isArray(base.hooks)) {
    base.hooks = {};
  }
  for (const event of [...CLAUDE_WATCH, ...CLAUDE_WAIT]) {
    const list = Array.isArray(base.hooks[event]) ? base.hooks[event] : [];
    base.hooks[event] = stripClaude(list);
  }
  for (const event of CLAUDE_WATCH) {
    base.hooks[event].push(claudeEntry(watchCommand, 8));
  }
  for (const event of CLAUDE_WAIT) {
    base.hooks[event].push(claudeEntry(waitCommand, 120));
  }
  return base;
}

function mergeCursorHooks(existing, watchCommand, waitCommand) {
  const base = asObject(existing);
  base.version = 1;
  if (!base.hooks || typeof base.hooks !== "object" || Array.isArray(base.hooks)) {
    base.hooks = {};
  }
  for (const event of [...CURSOR_WATCH, ...CURSOR_WAIT]) {
    const list = Array.isArray(base.hooks[event]) ? base.hooks[event] : [];
    base.hooks[event] = list.filter((entry) => !isOurs(entry && entry.command));
  }
  for (const event of CURSOR_WATCH) {
    base.hooks[event].push({ command: watchCommand, timeout: 8 });
  }
  for (const event of CURSOR_WAIT) {
    base.hooks[event].push({ command: waitCommand, timeout: 120 });
  }
  return base;
}

function codexEntry(command, timeout) {
  return {
    matcher: "*",
    hooks: [{ type: "command", command, commandWindows: command, timeout }],
  };
}

function mergeCodexSettings(existing, watchCommand, waitCommand) {
  const base = asObject(existing);
  if (!base.hooks || typeof base.hooks !== "object" || Array.isArray(base.hooks)) {
    base.hooks = {};
  }
  for (const event of [...CLAUDE_WATCH, ...CLAUDE_WAIT]) {
    const list = Array.isArray(base.hooks[event]) ? base.hooks[event] : [];
    base.hooks[event] = stripClaude(list);
  }
  for (const event of CLAUDE_WATCH) {
    base.hooks[event].push(codexEntry(watchCommand, 8));
  }
  for (const event of CLAUDE_WAIT) {
    base.hooks[event].push(codexEntry(waitCommand, 120));
  }
  return base;
}

const COPILOT_WATCH = ["sessionStart", "userPromptSubmitted", "postToolUse", "agentStop"];
const COPILOT_WAIT = ["permissionRequest"];

function mergeCopilotHooks(existing, watchCommand, waitCommand) {
  const base = asObject(existing);
  base.version = 1;
  if (!base.hooks || typeof base.hooks !== "object" || Array.isArray(base.hooks)) {
    base.hooks = {};
  }
  for (const event of [...COPILOT_WATCH, ...COPILOT_WAIT]) {
    const list = Array.isArray(base.hooks[event]) ? base.hooks[event] : [];
    base.hooks[event] = list.filter((entry) => {
      const command = entry && (entry.powershell || entry.command);
      return !isOurs(command);
    });
  }
  for (const event of COPILOT_WATCH) {
    base.hooks[event].push({ type: "command", powershell: watchCommand, timeoutSec: 8 });
  }
  for (const event of COPILOT_WAIT) {
    base.hooks[event].push({ type: "command", powershell: waitCommand, timeoutSec: 110 });
  }
  return base;
}

const GEMINI_WATCH = ["SessionStart", "AfterTool", "Notification", "Stop"];

function mergeGeminiSettings(existing, watchCommand) {
  const base = asObject(existing);
  if (!base.hooks || typeof base.hooks !== "object" || Array.isArray(base.hooks)) {
    base.hooks = {};
  }
  for (const event of GEMINI_WATCH) {
    const list = Array.isArray(base.hooks[event]) ? base.hooks[event] : [];
    base.hooks[event] = stripClaude(list);
    base.hooks[event].push({
      matcher: ".*",
      hooks: [{ type: "command", command: watchCommand, timeout: 8000 }],
    });
  }
  return base;
}

function mergeAntigravityHooks(existing, watchCommand) {
  const base = asObject(existing);
  base.nook = {
    enabled: true,
    PostToolUse: [
      {
        matcher: ".*",
        hooks: [{ type: "command", command: watchCommand, timeout: 8 }],
      },
    ],
    Stop: [
      {
        matcher: ".*",
        hooks: [{ type: "command", command: watchCommand, timeout: 8 }],
      },
    ],
  };
  return base;
}

function mergeStatusLine(existing, command, enabled, savedPrevious) {
  const base = asObject(existing);
  const current = typeof base.statusLine === "string" ? base.statusLine : "";
  let previous = typeof savedPrevious === "string" ? savedPrevious : "";
  if (enabled) {
    if (current && !isOurs(current)) {
      previous = current;
    }
    base.statusLine = command;
  } else if (isOurs(current)) {
    if (previous) {
      base.statusLine = previous;
    } else {
      delete base.statusLine;
    }
  }
  return { settings: base, previous };
}

function stripNook(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripNook(item))
      .filter((item) => {
        if (item == null) {
          return false;
        }
        if (item && Array.isArray(item.hooks) && item.hooks.length === 0) {
          return false;
        }
        return true;
      });
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const command = value.command || value.powershell || value.commandWindows || value.statusLine;
  if (typeof command === "string" && command.includes(MARKER) && (value.command || value.powershell || value.commandWindows)) {
    return null;
  }
  const next = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "nook") {
      continue;
    }
    if (key === "statusLine" && typeof child === "string" && child.includes(MARKER)) {
      continue;
    }
    const cleaned = stripNook(child);
    if (cleaned != null) {
      next[key] = cleaned;
    }
  }
  return next;
}

function hooksInstalled(settings) {
  return JSON.stringify(settings ?? {}).includes(MARKER);
}

module.exports = {
  MARKER,
  mergeClaudeSettings,
  mergeCursorHooks,
  mergeCodexSettings,
  mergeCopilotHooks,
  mergeMuseSettings: mergeClaudeSettings,
  mergeGeminiSettings,
  mergeAntigravityHooks,
  mergeStatusLine,
  stripNook,
  hooksInstalled,
};
