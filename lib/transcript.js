function assistantText(line) {
  let json;
  try {
    json = JSON.parse(line);
  } catch (_error) {
    return "";
  }
  const content = json && json.message && json.message.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((block) => block && block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n");
  }
  return "";
}

function firstParagraph(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return "";
  }
  const sentence = clean.split(/(?<=[.!?])\s/)[0] || clean;
  return sentence.length > 280 ? `${sentence.slice(0, 279)}…` : sentence;
}

function finalFromTranscript(text) {
  let found = "";
  for (const line of String(text || "").split("\n")) {
    const bit = assistantText(line);
    if (bit.trim()) {
      found = bit;
    }
  }
  return firstParagraph(found);
}

module.exports = { assistantText, finalFromTranscript };
