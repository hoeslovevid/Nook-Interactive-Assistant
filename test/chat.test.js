const test = require("node:test");
const assert = require("node:assert/strict");
const { buildChatRequest, readChatReply } = require("../lib/chat");

test("chatgpt and gemini use their own endpoints", () => {
  const chatgpt = buildChatRequest("chatgpt", [{ role: "user", content: "Hello" }]);
  const gemini = buildChatRequest("gemini", [{ role: "user", content: "Hello" }]);
  assert.equal(chatgpt.body.model, "gpt-4.1-mini");
  assert.match(chatgpt.url, /api\.openai\.com/);
  assert.equal(gemini.body.model, "gemini-3.8-flash");
  assert.match(gemini.url, /generativelanguage\.googleapis\.com/);
  assert.equal(chatgpt.body.messages.at(-1).content, "Hello");
});

test("claude and local models use their own requests", () => {
  const claude = buildChatRequest("claude", [{ role: "user", content: "Hello" }], {
    model: "claude-sonnet-4-5",
  });
  assert.match(claude.url, /api\.anthropic\.com/);
  assert.equal(claude.body.max_tokens, 800);
  assert.equal(claude.body.messages[0].content, "Hello");
  const ollama = buildChatRequest("ollama", [{ role: "user", content: "Hello" }], {
    url: "http://127.0.0.1:11434/v1/chat/completions",
    attachment: { name: "note.txt", text: "secret" },
  });
  assert.match(ollama.url, /127\.0\.0\.1:11434/);
  assert.match(ollama.body.messages.at(-1).content, /note\.txt/);
  assert.equal(
    buildChatRequest("ollama", [{ role: "user", content: "Hi" }], { url: "http://evil.test/v1" }).url,
    "http://127.0.0.1:11434/v1/chat/completions",
  );
});

test("a chat reply is the assistant text", () => {
  assert.equal(
    readChatReply({ choices: [{ message: { content: "  Hi there  " } }] }),
    "Hi there",
  );
  assert.equal(
    readChatReply({ content: [{ type: "text", text: "From Claude" }] }),
    "From Claude",
  );
  assert.throws(() => readChatReply({ choices: [] }), /empty reply/);
});

for (const [provider, host] of Object.entries({ deepseek: 'api.deepseek.com', mistral: 'api.mistral.ai', groq: 'api.groq.com', xai: 'api.x.ai', openrouter: 'openrouter.ai' })) {
  test(provider + ' sends streaming requests to its own API', () => {
    const request = buildChatRequest(provider, [{ role: 'user', content: 'Hello' }], { model: 'chosen-model', stream: true });
    assert.equal(new URL(request.url).hostname, host);
    assert.equal(request.auth, 'bearer');
    assert.equal(request.body.model, 'chosen-model');
    assert.equal(request.body.stream, true);
    assert.equal(request.body.messages.at(-1).content, 'Hello');
  });
}
test('custom endpoints support HTTPS and reject insecure remote HTTP', () => {
  assert.equal(buildChatRequest('custom', [], { url: 'https://example.com/v1/chat/completions' }).url, 'https://example.com/v1/chat/completions');
  assert.equal(buildChatRequest('custom', [], { url: 'http://example.com/v1/chat/completions' }).url, 'http://127.0.0.1:8080/v1/chat/completions');
});

test('model discovery uses provider authentication and safe endpoints', () => {
 const { buildModelsRequest } = require('../lib/chat');
 const claude = buildModelsRequest('claude', {}, 'test-key');
 assert.equal(claude.url, 'https://api.anthropic.com/v1/models');
 assert.equal(claude.headers['x-api-key'], 'test-key');
 assert.equal(claude.headers['anthropic-version'], '2023-06-01');
 assert.equal(buildModelsRequest('groq', {}, 'test-key').headers.Authorization, 'Bearer test-key');
 const local = buildModelsRequest('ollama', {url:'https://evil.test/v1/chat/completions'}, 'test-key');
 assert.equal(local.url, 'http://127.0.0.1:11434/v1/models');
 assert.deepEqual(local.headers, {});
});
