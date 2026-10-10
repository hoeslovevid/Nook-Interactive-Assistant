const { pairDiff } = require("./diff");

const AGENT_LABELS = {
  claude: "Claude",
  cursor: "Cursor",
  codex: "Codex",
  copilot: "Copilot",
  muse: "Muse",
};

function eventName(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  if (typeof payload.hook_event_name === "string") {
    return payload.hook_event_name;
  }
  if (typeof payload.hookEventName === "string") {
    return payload.hookEventName;
  }
  return "";
}

function clip(value, max = 180) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

function toolInput(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  if (payload.tool_input && typeof payload.tool_input === "object") {
    return payload.tool_input;
  }
  if (payload.toolArgs && typeof payload.toolArgs === "object") {
    return payload.toolArgs;
  }
  return {};
}

function toolName(payload) {
  const name = payload && (payload.tool_name || payload.toolName);
  return typeof name === "string" ? name : "";
}

function toolDetail(input) {
  if (!input || typeof input !== "object") {
    return "";
  }
  if (typeof input.command === "string") {
    return input.command;
  }
  if (typeof input.file_path === "string") {
    return input.file_path;
  }
  if (typeof input.filePath === "string") {
    return input.filePath;
  }
  if (typeof input.path === "string") {
    return input.path;
  }
  if (typeof input.description === "string") {
    return input.description;
  }
  return "";
}

function agentLabel(agent, payload) {
  const custom = payload && (payload.nook_agent || payload.coucou_agent);
  if (typeof custom === "string" && custom.trim()) {
    return clip(custom.trim(), 24);
  }
  return AGENT_LABELS[agent] || "Agent";
}

function isQuestion(payload) {
  const name = toolName(payload);
  return name === "AskUserQuestion" || name === "ask_user";
}

function questionsOf(payload) {
  const input = toolInput(payload);
  const list = Array.isArray(input.questions) ? input.questions : [];
  return list.slice(0, 4).map((item) => {
    const options = Array.isArray(item && item.options) ? item.options : [];
    return {
      question: clip(item && item.question, 240),
      header: clip(item && item.header, 40),
      multi: Boolean(item && item.multiSelect),
      options: options.slice(0, 6).map((option) => ({
        label: clip(option && option.label, 80),
        description: clip(option && option.description, 120),
      })),
    };
  });
}

function activityDetail(payload, event) {
  const input = toolInput(payload);
  const folded = event.toLowerCase();
  if (folded === "userpromptsubmit" || folded === "userpromptsubmitted") {
    return payload.prompt || "Prompt submitted";
  }
  if (folded === "posttooluse" || folded === "aftershellexecution") {
    return toolDetail(input) || payload.command || event;
  }
  if (folded === "afterfileedit") {
    return payload.file_path || input.file_path || "Edited a file";
  }
  if (folded === "stop" || folded === "agentstop") {
    return "Finished";
  }
  if (folded === "sessionstart") {
    return "Session started";
  }
  if (toolName(payload)) {
    return toolName(payload);
  }
  return event || "Checked in";
}

function fileOf(payload) {
  const input = toolInput(payload);
  return (
    input.file_path ||
    input.filePath ||
    input.path ||
    payload.file_path ||
    ""
  );
}

function changeOf(payload) {
  const input = toolInput(payload);
  const before = typeof input.old_string === "string" ? input.old_string : "";
  const after = typeof input.new_string === "string" ? input.new_string : "";
  if (!before && !after) {
    return { added: 0, removed: 0, diff: "" };
  }
  return {
    added: after ? after.split("\n").length : 0,
    removed: before ? before.split("\n").length : 0,
    diff: pairDiff(before, after).slice(0, 4000),
  };
}

function describeTurn(agent, payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const event = eventName(source);
  const change = changeOf(source);
  const folded = event.toLowerCase();
  return {
    sessionId: String(source.session_id || source.sessionId || agent),
    label: agentLabel(agent, source),
    task: toolName(source) || event,
    cwd: typeof source.cwd === "string" ? source.cwd : "",
    finished: folded === "stop" || folded === "agentstop",
    file: typeof fileOf(source) === "string" ? fileOf(source) : "",
    added: change.added,
    removed: change.removed,
    detail: clip(activityDetail(source, event)),
    diff: change.diff,
  };
}

function summarize(agent, payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const event = eventName(source);
  const name = agentLabel(agent, source);
  const folded = event.toLowerCase();
  if (isQuestion(source)) {
    return {
      kind: "question",
      title: `${name} has a question`,
      detail: questionsOf(source)[0] ? questionsOf(source)[0].question : "Choose an answer",
      questions: questionsOf(source),
    };
  }
  if ((agent === "claude" || agent === "codex" || agent === "muse") && folded === "permissionrequest") {
    const tool = toolName(source) || "a tool";
    return {
      kind: "approval",
      title: `${name} wants ${tool}`,
      detail: clip(toolDetail(toolInput(source)) || "Permission requested"),
    };
  }
  if (agent === "copilot" && folded === "permissionrequest") {
    const tool = toolName(source) || "a tool";
    return {
      kind: "approval",
      title: `Copilot wants ${tool}`,
      detail: clip(toolDetail(toolInput(source)) || "Permission requested"),
    };
  }
  if (agent === "cursor" && event === "beforeShellExecution") {
    return {
      kind: "approval",
      title: "Cursor wants the shell",
      detail: clip(source.command || "A shell command"),
    };
  }
  if (agent === "cursor" && event === "beforeMCPExecution") {
    const tool = toolName(source) || "an MCP tool";
    return {
      kind: "approval",
      title: `Cursor wants ${tool}`,
      detail: clip(toolDetail(toolInput(source)) || source.mcp_server_name || "MCP tool"),
    };
  }
  return {
    kind: "activity",
    title: name,
    detail: clip(activityDetail(source, event)),
  };
}

function present(agent, payload, wait) {
  const summary = summarize(agent, payload);
  if (wait && summary.kind === "activity") {
    const name = agentLabel(agent, payload);
    return {
      kind: "approval",
      title: `${name} needs a decision`,
      detail: summary.detail,
    };
  }
  return summary;
}

function alwaysRules(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const suggestions = source.permission_suggestions || source.suggestions;
  if (Array.isArray(suggestions) && suggestions.length) {
    return suggestions.slice(0, 3);
  }
  const tool = toolName(source) || "Bash";
  const command = toolInput(source).command;
  const rule = { toolName: tool };
  if (typeof command === "string" && command) {
    rule.ruleContent = command;
  }
  return [
    {
      type: "addRules",
      rules: [rule],
      behavior: "allow",
      destination: "session",
    },
  ];
}

function decisionOutput(agent, allow, extra) {
  const options = extra && typeof extra === "object" ? extra : {};
  const payload = options.payload && typeof options.payload === "object" ? options.payload : {};
  if (agent === "cursor") {
    if (allow) {
      return { permission: "allow" };
    }
    return {
      permission: "deny",
      user_message: "Denied in Nook",
      agent_message: "The user denied this action in Nook.",
    };
  }
  if (agent === "copilot") {
    if (allow) {
      return { behavior: "allow" };
    }
    return { behavior: "deny", message: "Denied in Nook" };
  }
  if (options.answers && isQuestion(payload)) {
    return {
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "allow",
          updatedInput: {
            questions: toolInput(payload).questions || [],
            answers: options.answers,
          },
        },
      },
    };
  }
  const decision = allow
    ? { behavior: "allow" }
    : { behavior: "deny", message: "Denied in Nook" };
  if (allow && options.always && agent === "claude") {
    decision.updatedPermissions = alwaysRules(payload);
  }
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision,
    },
  };
}

module.exports = {
  summarize,
  present,
  decisionOutput,
  describeTurn,
  clip,
  agentLabel,
};
