const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

function publicState(state) {
  // The paired phone receives status and approval context, never credentials or chat attachments.
  return {
    status: String(state.status || "Quiet"),
    sessions: (state.sessions || []).map(
      ({ id, label, agent, finished, file, task }) => ({
        id,
        label,
        agent,
        finished,
        file: file ? path.basename(file) : "",
        task,
      }),
    ),
    pending: state.pending
      ? {
          id: state.pending.id,
          agent: state.pending.agent,
          title: state.pending.title,
          detail: state.pending.detail,
          kind: state.pending.kind,
          questions: state.pending.questions || [],
          always: Boolean(state.pending.always),
        }
      : null,
    activity: (state.activity || [])
      .slice(0, 6)
      .map(({ title, detail, agent }) => ({ title, detail, agent })),
    updated: Date.now(),
    locked: Boolean(state.push?.locked), handoffActive: Boolean(state.push?.handoffActive),
    detailsEnabled: Boolean(state.features?.companion?.phoneDetails),
    instructionsEnabled:
      Boolean(state.features?.companion?.phoneInstructions) && !state.demo,
    services: (state.services || [])
      .slice(0, 8)
      .map(({ id, title, detail }) => ({ id, title, detail })),
  };
}
function isLocalAddress(value) {
  const address = String(value || "").replace(/^::ffff:/, "");
  if (address === "::1") return true;
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return false;
  return (
    parts[0] === 127 ||
    parts[0] === 10 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 169 && parts[1] === 254)
  );
}
function addresses() {
  return [
    ...new Set(
      Object.values(os.networkInterfaces())
        .flat()
        .filter(
          (item) =>
            item &&
            item.family === "IPv4" &&
            !item.internal &&
            isLocalAddress(item.address),
        )
        .map((item) => item.address),
    ),
  ];
}
function createPhoneServer({
  getState,
  decide,
  getSession = () => null,
  sendInstruction = () => ({ ok: false, error: "Phone drafts are disabled." }),
  serviceDetail = async () => ({ ok: false, error: 'Service unavailable.' }),
  serviceAction = async () => ({ ok: false, error: 'Actions unavailable.' }),
  registerDevice = () => ({ ok: false, error: 'Native phone unavailable.' }),
  historySearch = () => ({ ok: false, error: 'History is unavailable.' }), historyDetail = () => null,
  port = 0,
  host = "0.0.0.0",
  now = Date.now,
}) {
  const sessions = new Map(),
    attempts = new Map();
  let code = "",
    expires = 0,
    server = null,
    boundPort = 0;
  function pairing() {
    code = crypto.randomInt(100000, 1000000).toString();
    expires = now() + 600000;
    return status();
  }
  function status() {
    for (const [token, deadline] of sessions)
      if (deadline <= now()) sessions.delete(token);
    return {
      enabled: Boolean(server),
      port: boundPort,
      urls: server ? addresses().map((ip) => `http://${ip}:${boundPort}`) : [],
      code: server && expires > now() ? code : "",
      expires,
      paired: sessions.size,
    };
  }
  function reply(res, statusCode, data) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  }
  async function body(req) {
    let text = "";
    for await (const chunk of req) {
      text += chunk;
      if (text.length > 20000) throw new Error("Request too large.");
    }
    return JSON.parse(text || "{}");
  }
  async function handle(req, res) {
    if (!isLocalAddress(req.socket.remoteAddress))
      return reply(res, 403, { error: "Local network access only." });
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    const allowedHosts = ["localhost", "127.0.0.1", ...addresses()].map(
      (ip) => `${ip}:${boundPort}`,
    );
    if (!allowedHosts.includes(req.headers.host))
      return reply(res, 403, { error: "Invalid host." });
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${req.headers.host}`
    )
      return reply(res, 403, { error: "Invalid origin." });
    const route = new URL(req.url, `http://${req.headers.host}`).pathname;
    const brandAssets = {
      "/icon.svg": ["icon.svg", "image/svg+xml"],
      "/favicon.ico": ["favicon.ico", "image/x-icon"],
      "/apple-touch-icon.png": ["apple-touch-icon.png", "image/png"],
    };
    if (req.method === "GET" && Object.hasOwn(brandAssets, route)) {
      const [file, type] = brandAssets[route];
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      return res.end(fs.readFileSync(path.join(__dirname, "../assets", file)));
    }
    if (
      req.method === "GET" &&
      ["/", "/phone.js", "/phone.css"].includes(route)
    ) {
      const file = route === "/" ? "phone.html" : route.slice(1);
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      );
      res.writeHead(200, {
        "Content-Type": file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html",
        "Cache-Control": "no-store",
      });
      return res.end(fs.readFileSync(path.join(__dirname, "../phone", file)));
    }
    if (req.method === "POST" && route === "/pair") {
      const address = req.socket.remoteAddress;
      const previous = attempts.get(address);
      const entry =
        previous && now() - previous.start < 60000
          ? previous
          : { start: now(), count: 0 };
      entry.count++;
      attempts.set(address, entry);
      if (attempts.size > 1000) attempts.delete(attempts.keys().next().value);
      if (entry.count > 5)
        return reply(res, 429, { error: "Too many attempts. Wait a minute." });
      const input = await body(req);
      const candidate = String(input.code || "");
      if (
        expires <= now() ||
        !/^\d{6}$/.test(candidate) ||
        !crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(code))
      )
        return reply(res, 401, { error: "Incorrect or expired code." });
      status();
      if (sessions.size >= 3)
        return reply(res, 409, {
          error: "Three devices are paired. Revoke devices on your PC first.",
        });
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, now() + 86400000);
      return reply(res, 200, { token });
    }
    const token = String(req.headers.authorization || "").replace(
      /^Bearer /,
      "",
    );
    if (!sessions.has(token) || sessions.get(token) <= now()) {
      sessions.delete(token);
      return reply(res, 401, { error: "Pair this phone from Nook settings." });
    }
    if (req.method === "GET" && route === "/state")
      return reply(res, 200, publicState(getState()));
    if (req.method === 'GET' && route === '/service') {
      const service = new URL(req.url, `http://${req.headers.host}`).searchParams.get('id');
      const result = await serviceDetail(service); return reply(res, result.ok ? 200 : 400, result);
    }
    if (req.method === 'POST' && route === '/service-action') {
      const input = await body(req); const result = await serviceAction(input.id, input.input); return reply(res, result.ok || result.cancelled ? 200 : 400, result);
    }
    if (req.method === 'POST' && route === '/device') {
      const result = registerDevice(await body(req)); return reply(res, result.ok ? 200 : 400, result);
    }
    if (req.method === 'GET' && route === '/history') {
      const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
      if (params.has('id')) { const item = historyDetail(params.get('id')); return reply(res, item ? 200 : 404, item || { error: 'History unavailable or sharing is off.' }); }
      const result = historySearch({ query: params.get('q') || '', agent: params.get('agent') || '' }); return reply(res, result.ok ? 200 : 400, result);
    }
    if (req.method === "GET" && route === "/session") {
      const id = new URL(
        req.url,
        `http://${req.headers.host}`,
      ).searchParams.get("id");
      const detail = getSession(id);
      return detail
        ? reply(res, 200, detail)
        : reply(res, 404, {
            error: "Session unavailable or sharing is disabled on your PC.",
          });
    }
    if (req.method === "POST" && route === "/instruction") {
      const input = await body(req);
      const result = await sendInstruction(input.id, input.text);
      return reply(res, result.ok ? 200 : 400, result);
    }
    if (req.method === "POST" && route === "/logout") {
      sessions.delete(token);
      return reply(res, 200, { ok: true });
    }
    if (req.method === "POST" && route === "/decide") {
      const input = await body(req),
        pending = getState().pending;
      if (!pending || pending.id !== input.id)
        return reply(res, 409, {
          error: "This approval is no longer pending.",
        });
      if (
        !["allow", "deny", "always"].includes(input.action) ||
        (input.action === "always" && !pending.always)
      )
        return reply(res, 400, { error: "Invalid decision." });
      const answers = {};
      if (pending.kind === "question") {
        if (input.action !== "allow")
          return reply(res, 400, { error: "Submit answers to this question." });
        for (const question of pending.questions || []) {
          const value = input.answers?.[question.question];
          if (typeof value !== "string" || !value.trim() || value.length > 1000)
            return reply(res, 400, { error: "Answer every question." });
          answers[question.question] = value;
        }
      }
      const result = decide({ id: input.id, action: input.action, answers });
      return reply(res, result === false ? 409 : 200, { ok: result !== false });
    }
    return reply(res, 404, { error: "Not found." });
  }
  return {
    status,
    rotate() {
      sessions.clear();
      return pairing();
    },
    async start() {
      if (server) return status();
      const instance = http.createServer((req, res) =>
        handle(req, res).catch(() => {
          if (!res.headersSent) reply(res, 400, { error: "Invalid request." });
          else res.end();
        }),
      );
      instance.requestTimeout = 10000;
      instance.headersTimeout = 12000;
      await new Promise((resolve, reject) => {
        instance.once("error", reject);
        instance.listen(port, host, resolve);
      });
      server = instance;
      boundPort = server.address().port;
      return pairing();
    },
    async stop() {
      const current = server;
      server = null;
      sessions.clear();
      attempts.clear();
      code = "";
      if (current) {
        current.closeAllConnections();
        await new Promise((resolve) => current.close(resolve));
      }
      return status();
    },
  };
}
module.exports = { createPhoneServer, publicState, isLocalAddress };
