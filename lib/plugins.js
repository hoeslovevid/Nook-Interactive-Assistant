function pluginSource(hookPath) {
  const hook = JSON.stringify(hookPath);
  return `const { spawn } = require("child_process");

function ask(agent, payload, wait) {
  return new Promise((resolve) => {
    const args = ["--agent", agent];
    if (wait) {
      args.push("--wait");
    }
    const child = spawn(${hook}, args, { windowsHide: true });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk.toString("utf8");
    });
    child.on("error", () => resolve(null));
    child.stdin.end(JSON.stringify(payload || {}));
    child.on("close", () => {
      try {
        resolve(JSON.parse(out));
      } catch (_error) {
        resolve(null);
      }
    });
  });
}

async function nookPlugin() {
  return {
    "permission.ask": async (input, output) => {
      const result = await ask("opencode", {
        hook_event_name: "PermissionRequest",
        tool_name: input && (input.permission || input.tool),
        tool_input: input || {},
      }, true);
      const behavior = result && (result.behavior || (result.hookSpecificOutput && result.hookSpecificOutput.decision && result.hookSpecificOutput.decision.behavior));
      if (behavior === "allow") {
        output.reply = "once";
      } else if (behavior === "deny") {
        output.reply = "reject";
      }
    },
    "tool.execute.after": async (input) => {
      await ask("opencode", {
        hook_event_name: "PostToolUse",
        tool_name: input && input.tool,
        tool_input: (input && input.args) || {},
      }, false);
    },
    "session.idle": async () => {
      await ask("opencode", { hook_event_name: "Stop" }, false);
    },
  };
}

module.exports = nookPlugin;
module.exports.default = nookPlugin;
`;
}

function ampSource(hookPath) {
  return pluginSource(hookPath).replaceAll('"opencode"', '"amp"');
}

function hermesManifest(hookPath) {
  const command = hookPath;
  return `${JSON.stringify(
    {
      name: "nook",
      capabilities: [
        { event: "SessionStart", command: [command, "--agent", "hermes"] },
        { event: "PostToolUse", command: [command, "--agent", "hermes"] },
        { event: "Stop", command: [command, "--agent", "hermes"] },
        { event: "PermissionRequest", command: [command, "--agent", "hermes", "--wait"] },
      ],
    },
    null,
    2,
  )}\n`;
}

module.exports = { pluginSource, ampSource, hermesManifest };
