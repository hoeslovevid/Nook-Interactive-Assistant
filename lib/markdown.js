function stripReasoning(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
}

function markdownBlocks(text) {
  const source = stripReasoning(text);
  const blocks = [];
  const parts = source.split(/```/);
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const lines = part.split("\n");
      const lang = lines[0] && !lines[0].includes(" ") ? lines.shift() : "";
      blocks.push({ type: "code", lang, text: lines.join("\n").replace(/\n$/, "") });
      return;
    }
    for (const line of part.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      if (line.startsWith("### ")) {
        blocks.push({ type: "heading", text: line.slice(4) });
      } else if (line.startsWith("## ")) {
        blocks.push({ type: "heading", text: line.slice(3) });
      } else if (line.startsWith("# ")) {
        blocks.push({ type: "heading", text: line.slice(2) });
      } else if (line.startsWith("> ")) {
        blocks.push({ type: "quote", text: line.slice(2) });
      } else if (/^[-*] /.test(line)) {
        blocks.push({ type: "item", text: line.slice(2) });
      } else {
        blocks.push({ type: "text", text: line });
      }
    }
  });
  return blocks;
}

if (typeof module === "object" && module.exports) {
  module.exports = { stripReasoning, markdownBlocks };
} else {
  window.NookMarkdown = { stripReasoning, markdownBlocks };
}
