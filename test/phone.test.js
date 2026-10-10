const test = require("node:test");
const assert = require("node:assert/strict");
const { createPhoneServer, publicState } = require("../lib/phone");
test("phone status excludes keys, chat messages, attachments and full project paths", () => {
  const state = publicState({
    keys: { secret: "key" },
    messages: ["private"],
    attachment: { text: "secret" },
    sessions: [{ id: "1", file: "C:\\private\\file.js", label: "Agent" }],
  });
  assert.equal(state.keys, undefined);
  assert.equal(state.messages, undefined);
  assert.equal(state.attachment, undefined);
  assert.equal(state.sessions[0].file, "file.js");
});
test("paired phones approve only current requests; revocation invalidates credentials", async () => {
  let state = {
      pending: {
        id: "one",
        title: "Run tests?",
        detail: "npm test",
        always: false,
      },
    },
    decision = null;
  const server = createPhoneServer({
    getState: () => state,
    decide: (value) => {
      decision = value;
      state = {};
      return true;
    },
    host: "127.0.0.1",
  });
  const status = await server.start(),
    base = "http://127.0.0.1:" + status.port;
  try {
    assert.equal((await fetch(base + "/state")).status, 401);
    assert.equal(
      (
        await fetch(base + "/pair", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://evil.example",
          },
          body: JSON.stringify({ code: status.code }),
        })
      ).status,
      403,
    );
    const pair = await fetch(base + "/pair", {
      method: "POST",
      body: JSON.stringify({ code: status.code }),
    });
    const { token } = await pair.json();
    const headers = {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    };
    assert.equal((await fetch(base + "/state", { headers })).status, 200);
    assert.equal(
      (
        await fetch(base + "/decide", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: "stale", action: "allow" }),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await fetch(base + "/decide", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: "one", action: "always" }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(base + "/decide", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: "one", action: "allow" }),
        })
      ).status,
      200,
    );
    assert.equal(decision.action, "allow");
    server.rotate();
    assert.equal((await fetch(base + "/state", { headers })).status, 401);
  } finally {
    await server.stop();
  }
});
test("pairing expires, limits guesses, and question answers are required", async () => {
  let clock = 1000;
  const state = {
    pending: {
      id: "question",
      kind: "question",
      questions: [{ question: "Choose?", options: [] }],
      always: false,
    },
  };
  const server = createPhoneServer({
    getState: () => state,
    decide: () => true,
    host: "127.0.0.1",
    now: () => clock,
  });
  const status = await server.start(),
    base = "http://127.0.0.1:" + status.port;
  try {
    const pair = await fetch(base + "/pair", {
      method: "POST",
      body: JSON.stringify({ code: status.code }),
    });
    const { token } = await pair.json();
    const headers = { Authorization: "Bearer " + token };
    assert.equal(
      (
        await fetch(base + "/decide", {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: "question",
            action: "allow",
            answers: {},
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(base + "/decide", {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: "question",
            action: "allow",
            answers: { "Choose?": "Yes" },
          }),
        })
      ).status,
      200,
    );
    clock += 600001;
    assert.equal(
      (
        await fetch(base + "/pair", {
          method: "POST",
          body: JSON.stringify({ code: status.code }),
        })
      ).status,
      401,
    );
    for (let i = 0; i < 5; i++)
      await fetch(base + "/pair", {
        method: "POST",
        body: '{"code":"000000"}',
      });
    assert.equal(
      (
        await fetch(base + "/pair", {
          method: "POST",
          body: '{"code":"000000"}',
        })
      ).status,
      429,
    );
  } finally {
    await server.stop();
  }
});

test("phone access excludes public internet addresses", () => {
  const { isLocalAddress } = require("../lib/phone");
  for (const value of [
    "127.0.0.1",
    "::1",
    "::ffff:192.168.1.2",
    "10.0.0.2",
    "172.16.0.2",
  ])
    assert.equal(isLocalAddress(value), true);
  for (const value of ["8.8.8.8", "172.32.0.2", "2001:4860::8888", "garbage"])
    assert.equal(isLocalAddress(value), false);
});
test("session detail and draft routes require pairing and respect sharing switches", async () => {
  let enabled = false,
    received = null;
  const server = createPhoneServer({
    host: "127.0.0.1",
    getState: () => ({}),
    decide: () => true,
    getSession: (id) =>
      enabled && id === "one" ? { id, steps: [], final: "done" } : null,
    sendInstruction: (id, text) => {
      if (!enabled) return { ok: false, error: "Disabled" };
      received = { id, text };
      return { ok: true };
    },
  });
  const status = await server.start(),
    base = "http://127.0.0.1:" + status.port;
  try {
    assert.equal((await fetch(base + "/session?id=one")).status, 401);
    assert.equal(
      (await fetch(base + "/instruction", { method: "POST", body: "{}" }))
        .status,
      401,
    );
    const { token } = await (
      await fetch(base + "/pair", {
        method: "POST",
        body: JSON.stringify({ code: status.code }),
      })
    ).json();
    const headers = { Authorization: "Bearer " + token };
    assert.equal(
      (await fetch(base + "/session?id=one", { headers })).status,
      404,
    );
    assert.equal(
      (
        await fetch(base + "/instruction", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: "one", text: "Next" }),
        })
      ).status,
      400,
    );
    enabled = true;
    assert.equal(
      (await (await fetch(base + "/session?id=one", { headers })).json()).final,
      "done",
    );
    assert.equal(
      (
        await fetch(base + "/instruction", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: "one", text: "Next" }),
        })
      ).status,
      200,
    );
    assert.deepEqual(received, { id: "one", text: "Next" });
    enabled = false;
    assert.equal(
      (await fetch(base + "/session?id=one", { headers })).status,
      404,
    );
    server.rotate();
    assert.equal(
      (await fetch(base + "/session?id=one", { headers })).status,
      401,
    );
  } finally {
    await server.stop();
  }
});
