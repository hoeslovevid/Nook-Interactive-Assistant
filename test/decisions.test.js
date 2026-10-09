const test = require("node:test");
const assert = require("node:assert/strict");
const { summarize, decisionOutput } = require("../lib/decisions");

test("claude permission becomes an approval card", () => {
  const summary = summarize("claude", {
    hook_event_name: "PermissionRequest",
    tool_name: "Bash",
    tool_input: { command: "npm test" },
  });
  assert.equal(summary.kind, "approval");
  assert.equal(summary.title, "Claude wants Bash");
  assert.equal(summary.detail, "npm test");
});

test("claude allow and deny match the hook schema", () => {
  assert.deepEqual(decisionOutput("claude", true), {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "allow" },
    },
  });
  assert.equal(decisionOutput("claude", false).hookSpecificOutput.decision.behavior, "deny");
});

test("claude questions keep the choices and always stays off codex", () => {
  const payload = {
    hook_event_name: "PermissionRequest",
    tool_name: "AskUserQuestion",
    tool_input: {
      questions: [
        {
          question: "Which framework?",
          options: [{ label: "React" }, { label: "Vue" }],
          multiSelect: false,
        },
      ],
    },
  };
  const summary = summarize("claude", payload);
  assert.equal(summary.kind, "question");
  assert.equal(summary.questions[0].options[0].label, "React");
  const answer = decisionOutput("claude", true, {
    payload,
    answers: { "Which framework?": "React" },
  });
  assert.equal(answer.hookSpecificOutput.decision.updatedInput.answers["Which framework?"], "React");
  const always = decisionOutput("claude", true, {
    always: true,
    payload: { tool_name: "Bash", tool_input: { command: "npm test" } },
  });
  assert.equal(always.hookSpecificOutput.decision.updatedPermissions[0].destination, "session");
  const codex = decisionOutput("codex", true, { always: true, payload: { tool_name: "Bash" } });
  assert.equal(codex.hookSpecificOutput.decision.updatedPermissions, undefined);
  assert.deepEqual(decisionOutput("copilot", false), { behavior: "deny", message: "Denied in Nook" });
});

test("an edit reports added and removed lines", () => {
  const { describeTurn } = require("../lib/decisions");
  const turn = describeTurn("claude", {
    hook_event_name: "PostToolUse",
    session_id: "s1",
    tool_input: { file_path: "src/app.js", old_string: "a\nb", new_string: "a\nb\nc" },
  });
  assert.equal(turn.file, "src/app.js");
  assert.equal(turn.added, 3);
  assert.equal(turn.removed, 2);
  assert.match(turn.diff, /\+ a/);
});

test("cursor shell approval uses permission allow or deny", () => {
  const summary = summarize("cursor", {
    hook_event_name: "beforeShellExecution",
    command: "git status",
  });
  assert.equal(summary.kind, "approval");
  assert.equal(summary.detail, "git status");
  assert.deepEqual(decisionOutput("cursor", true), { permission: "allow" });
  assert.equal(decisionOutput("cursor", false).permission, "deny");
});
