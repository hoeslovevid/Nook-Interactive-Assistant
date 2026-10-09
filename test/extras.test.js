const test = require("node:test");
const assert = require("node:assert/strict");
const { githubSummary, cleanServiceUrl, stripeSummary } = require("../lib/services");
const { usageFromText } = require("../lib/usage");
const { summarizeHistory, recapSvg } = require("../lib/history");
const { translate, LANGUAGES } = require("../lib/i18n");
const { takeSseEvents, deltaText } = require("../lib/stream");
const { pluginSource, hermesManifest } = require("../lib/plugins");
const { pickTerminal } = require("../lib/terminal");
const { parseGithub, ciBadge } = require("../lib/github");
const { markdownBlocks, stripReasoning } = require("../lib/markdown");
const { fromCodexAccount } = require("../lib/usage");
const { mondayDue, weekKey } = require("../lib/history");
const { mergeStatusLine, mergeGeminiSettings } = require("../lib/install-hooks");

test("github and stripe summaries stay short", () => {
  const github = githubSummary(
    [{ state: "failure" }, { state: "success" }],
    [{ title: "review" }],
  );
  assert.match(github.detail, /2 open/);
  assert.match(github.detail, /1 review/);
  assert.match(github.detail, /1 failing/);
  assert.equal(stripeSummary({ available: [{ amount: 1250, currency: "usd" }] }).detail, "12.50 usd");
  assert.equal(cleanServiceUrl("http://evil.test"), "");
  assert.match(cleanServiceUrl("https://n8n.example.com/api"), /n8n\.example\.com/);
});

test("usage text finds the latest rate limit", () => {
  const text = [
    "noise",
    JSON.stringify({ payload: { rate_limits: { primary: { used_percent: 10 }, secondary: { used_percent: 40 } } } }),
  ].join("\n");
  const pill = usageFromText(text, "Codex");
  assert.match(pill.detail, /10% 5h/);
  assert.match(pill.detail, /40% week/);
});

test("a week of history counts sessions and renders", () => {
  const now = Date.now();
  const text = [
    JSON.stringify({ t: now - 1000, agent: "claude", sessionId: "a", file: "app.js", added: 3, removed: 1, permission: true }),
    JSON.stringify({ t: now - 2000, agent: "claude", sessionId: "a", command: true }),
    JSON.stringify({ t: now - 8 * 24 * 60 * 60 * 1000, agent: "cursor", sessionId: "old" }),
  ].join("\n");
  const summary = summarizeHistory(text, now);
  assert.equal(summary.sessions, 1);
  assert.equal(summary.files, 1);
  assert.equal(summary.added, 3);
  assert.equal(summary.permissions, 1);
  assert.equal(summary.topAgent, "claude");
  assert.match(recapSvg(summary), /Nook/);
  assert.equal(LANGUAGES.length, 10);
  assert.equal(translate("fr").allow, "Autoriser");
});

test("terminal, github, markdown, and plan usage stay local", () => {
  const picked = pickTerminal([
    { name: "OpenConsole.exe", pid: 4 },
    { name: "WindowsTerminal.exe", pid: 9 },
  ]);
  assert.equal(picked.kind, "window");
  assert.equal(picked.pid, 9);
  assert.equal(pickTerminal([{ name: "Claude.exe", pid: 3 }]).desktop, true);
  const github = parseGithub({
    data: {
      viewer: {
        login: "ada",
        starredRepositories: { totalCount: 2 },
        contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: [{ contributionCount: 1 }] }] } },
        pullRequests: { nodes: [{ title: "Fix", url: "https://github.com/a/b/pull/1", commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] } }] },
        repositories: { nodes: [] },
      },
      reviews: { nodes: [] },
    },
  });
  assert.equal(github.pulls[0].state, "failure");
  assert.equal(ciBadge({}, github), "");
  assert.equal(stripReasoning("Hi <think>secret</think> there"), "Hi  there");
  assert.equal(markdownBlocks("```js\nconst a = 1\n```")[0].type, "code");
  const codex = fromCodexAccount({ rateLimits: { primary: { used_percent: 12 }, secondary: { used_percent: 40 } }, rateLimitResetCredits: { remaining: 2 } });
  assert.match(codex.detail, /2 resets/);
  const monday = new Date("2026-10-05T13:00:00");
  assert.equal(mondayDue(monday.getTime(), ""), true);
  assert.equal(mondayDue(monday.getTime(), weekKey(monday.getTime())), false);
  const status = mergeStatusLine({ statusLine: "old" }, "nook-hook.cmd --statusline", true, "");
  assert.match(status.settings.statusLine, /nook-hook.cmd/);
  assert.equal(status.previous, "old");
  const gemini = mergeGeminiSettings({}, "nook-hook.cmd --agent gemini");
  assert.ok(gemini.hooks.AfterTool);
  assert.equal(gemini.hooks.BeforeTool, undefined);
});

test("stream deltas and plugin files stay local", () => {
  const taken = takeSseEvents('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n');
  assert.equal(deltaText(taken.events[0], "bearer"), "Hi");
  const source = pluginSource("C:\\nook\\hooks\\nook-hook.cmd");
  assert.match(source, /nook-hook\.cmd/);
  assert.match(source, /permission\.ask/);
  const manifest = hermesManifest("C:\\nook\\hooks\\nook-hook.cmd");
  assert.match(manifest, /PermissionRequest/);
});
