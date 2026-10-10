const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sessionDetail,
  instructionDraft,
  timelineEntry,
} = require("../lib/session-detail");
const { demoState } = require("../lib/demo");
test("phone details keep bounded code context without serializing credentials or attachments", () => {
  const session = {
    id: "claude:123",
    agent: "claude",
    key: "secret",
    cwd: "C:\\private",
    payload: { apiKey: "secret" },
    attachment: { image: "private-image" },
    final: "answer",
    steps: Array.from({ length: 50 }, () =>
      timelineEntry({
        file: "C:\\work\\app.js",
        detail: "Edit greeting",
        diff: "x".repeat(50000),
      }),
    ),
  };
  const detail = sessionDetail(session);
  assert.equal(detail.steps.length, 30);
  assert.equal(detail.steps[0].file, "app.js");
  assert.equal(detail.steps[0].diff.length, 16000);
  assert.equal(detail.final, "answer");
  assert.ok(!JSON.stringify(detail).includes("secret"));
  assert.ok(!JSON.stringify(detail).includes("private-image"));
});
test("phone drafts require an existing session and a bounded, nonblank instruction", () => {
  assert.equal(instructionDraft(null, "hello"), null);
  assert.equal(instructionDraft({ id: "1" }, " "), null);
  assert.equal(instructionDraft({ id: "1" }, "a".repeat(4001)), null);
  const draft = instructionDraft(
    { id: "1", agent: "codex", label: "Codex" },
    "  Run the next check  ",
    10,
  );
  assert.equal(draft.text, "Run the next check");
  assert.equal(draft.sessionId, "1");
  assert.equal(draft.time, 10);
});
test("walkthrough snapshots never mutate the real sessions, approvals, or chat", () => {
  const real = {
    sessions: [{ id: "real" }],
    pending: { id: "real-approval" },
    messages: [{ content: "private" }],
    features: { companion: { outfit: "scarf" } },
  };
  const before = JSON.stringify(real);
  for (let i = 0; i < 7; i++) {
    const sample = demoState(real, i);
    assert.ok(
      sample.sessions.every((session) => session.id.startsWith("demo-")),
    );
    assert.ok(!JSON.stringify(sample.messages).includes("private"));
    assert.equal(sample.features.companion.outfit, "scarf");
  }
  assert.equal(JSON.stringify(real), before);
  assert.equal(demoState(real, 2, true).pending, null);
});
test("companion colors follow the selected agent, with approvals taking priority", () => {
  const { agentColor } = require("../lib/companion");
  const canvas = { dataset: {} };
  const state = {
    prefs: { colors: { claude: "#ccaa88", codex: "#88aacc" } },
    sessions: [
      { id: "a", agent: "claude" },
      { id: "b", agent: "codex" },
    ],
  };
  agentColor(canvas, state, "b");
  assert.equal(canvas.dataset.body, "#88aacc");
  agentColor(canvas, { ...state, pending: { agent: "claude" } }, "b");
  assert.equal(canvas.dataset.body, "#ccaa88");
  agentColor(canvas, {});
  assert.equal(canvas.dataset.body, undefined);
});
