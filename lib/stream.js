function takeSseEvents(buffer, final = false) {
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = final ? "" : parts.pop() || "";
  const events = [];
  let done = false;
  for (const part of parts) {
    const data = part
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (data === '[DONE]') { done = true; break; }
    if (data) {
      events.push(data);
      if (/"type"\s*:\s*"message_stop"/.test(data)) {
        try { if (JSON.parse(data).type === 'message_stop') { done = true; break; } } catch {}
      }
    }
  }
  return { events, rest, ...(done ? { done: true } : {}) };
}

function deltaText(raw, auth) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch (_error) {
    return "";
  }
  if (json.error || json.type === "error") {
    throw new Error("The model interrupted its reply. Try again.");
  }
  if (auth === "anthropic") {
    if (json.type === "content_block_delta" && json.delta && typeof json.delta.text === "string") {
      return json.delta.text;
    }
    return "";
  }
  const choice = json.choices && json.choices[0] && json.choices[0].delta;
  return choice && typeof choice.content === "string" ? choice.content : "";
}

module.exports = { takeSseEvents, deltaText };
