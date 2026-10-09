function takeSseEvents(buffer) {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() || "";
  const events = [];
  for (const part of parts) {
    const data = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (data && data !== "[DONE]") {
      events.push(data);
    }
  }
  return { events, rest };
}

function deltaText(raw, auth) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch (_error) {
    return "";
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
