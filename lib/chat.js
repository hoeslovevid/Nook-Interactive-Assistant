const { stripReasoning } = require("./markdown");

const PROVIDERS = {
  chatgpt: {
    label: "ChatGPT",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    auth: "bearer",
  },
  gemini: {
    label: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-3.8-flash",
    auth: "bearer",
  },
  claude: {
    label: "Claude",
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-5",
    auth: "anthropic",
  },
  ollama: {
    label: "Ollama",
    url: "http://127.0.0.1:11434/v1/chat/completions",
    model: "llama3.2",
    auth: "none",
    local: true,
  },
  lmstudio: {
    label: "LM Studio",
    url: "http://127.0.0.1:1234/v1/chat/completions",
    model: "local-model",
    auth: "none",
    local: true,
  },
  openrouter: {
    label: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4.1-mini",
    auth: "bearer",
  },
  deepseek: { label: "DeepSeek", url: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat", auth: "bearer" },
  mistral: { label: "Mistral", url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest", auth: "bearer" },
  groq: { label: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile", auth: "bearer" },
  xai: { label: "Grok", url: "https://api.x.ai/v1/chat/completions", model: "grok-4.3", auth: "bearer" },
  custom: {
    label: "Custom endpoint",
    url: "http://127.0.0.1:8080/v1/chat/completions",
    model: "local-model",
    auth: "optional",
    remote: true,
  },
};

const SYSTEM = "You are Nook, a concise coding companion. Answer in a few sentences unless asked for more.";

function cleanModel(value, fallback) {
  const model = String(value || "").trim();
  if (/^[A-Za-z0-9._:/-]{1,80}$/.test(model)) {
    return model;
  }
  return fallback;
}

function cleanRemoteUrl(value, fallback) {
  const local = cleanLocalUrl(value, "");
  if (local) {
    return local;
  }
  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol === "https:") {
      return parsed.toString().replace(/\/$/, "");
    }
  } catch (_error) {
    return fallback;
  }
  return fallback;
}

function cleanLocalUrl(value, fallback) {
  const url = String(value || "").trim();
  try {
    const parsed = new URL(url);
    const local = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && local) {
      return parsed.toString().replace(/\/$/, "");
    }
  } catch (_error) {
    return fallback;
  }
  return fallback;
}

function transcript(messages, attachment) {
  const history = messages.slice(-12).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content || ""),
  }));
  if (attachment && attachment.text && history.length) {
    const last = history[history.length - 1];
    if (last.role === "user") {
      const fileText = String(attachment.text).slice(0, 60000);
      last.content = `${last.content}\n\nFile ${attachment.name || "attachment"}:\n${fileText}`;
    }
  }
  return history;
}

function buildChatRequest(provider, messages, options) {
  const spec = PROVIDERS[provider];
  if (!spec) {
    throw new Error("Unknown chat provider.");
  }
  const settings = options && typeof options === "object" ? options : {};
  const model = cleanModel(settings.model, spec.model);
  const history = transcript(messages, settings.attachment);
  const system = settings.greeting ? `${SYSTEM} The person's name is ${settings.greeting}.` : SYSTEM;
  if (spec.auth === "anthropic") {
    const body = {
      model,
      max_tokens: 800,
      system,
      messages: history,
    };
    if (settings.stream) {
      body.stream = true;
    }
    return {
      url: spec.url,
      label: spec.label,
      auth: spec.auth,
      headers: { "content-type": "application/json" },
      body,
    };
  }
  const url = spec.local
    ? cleanLocalUrl(settings.url, spec.url)
    : spec.remote
      ? cleanRemoteUrl(settings.url, spec.url)
      : spec.url;
  return {
    url,
    label: spec.label,
    auth: spec.auth,
    headers: { "Content-Type": "application/json" },
    body: {
      model,
      messages: [{ role: "system", content: system }, ...history],
      ...(settings.stream ? { stream: true } : {}),
    },
  };
}

function buildModelsRequest(provider, options = {}, key = "") {
  const spec = PROVIDERS[provider];
  if (!spec) throw new Error("Unknown chat provider.");
  const base = spec.local ? cleanLocalUrl(options.url, spec.url) : spec.remote ? cleanRemoteUrl(options.url, spec.url) : spec.url;
  const url = base.replace(/\/(?:chat\/completions|messages)\/?$/, "/models");
  const headers = {};
  if (spec.auth === "anthropic") {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  } else if (key && spec.auth !== "none") headers.Authorization = "Bearer " + key;
  return { url, headers };
}

function readChatReply(payload) {
  const choice =
    payload &&
    payload.choices &&
    payload.choices[0] &&
    payload.choices[0].message &&
    payload.choices[0].message.content;
  if (typeof choice === "string" && stripReasoning(choice)) {
    return stripReasoning(choice);
  }
  const blocks = payload && Array.isArray(payload.content) ? payload.content : [];
  const text = blocks
    .filter((block) => block && block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (stripReasoning(text)) {
    return stripReasoning(text);
  }
  throw new Error("The model returned an empty reply.");
}

module.exports = { buildModelsRequest, PROVIDERS, buildChatRequest, readChatReply, cleanModel, cleanLocalUrl, cleanRemoteUrl };
