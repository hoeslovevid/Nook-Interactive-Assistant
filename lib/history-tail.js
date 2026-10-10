const fs = require('node:fs');

// Stream updates must not reread and parse the entire lifetime activity log.
function createHistoryTail({ maxBytes = 4 * 1024 * 1024, maxLines = 2000, now = Date.now } = {}) {
  let saved = null, summary = null, summaryTime = 0;
  function read(file) {
    try {
      const stat = fs.statSync(file), signature = `${file}:${stat.size}:${stat.mtimeMs}`;
      if (saved?.signature === signature) return saved.text;
      const size = Math.min(stat.size, maxBytes), offset = stat.size - size;
      const buffer = Buffer.alloc(size), descriptor = fs.openSync(file, 'r');
      let bytes;
      try { bytes = fs.readSync(descriptor, buffer, 0, size, offset); } finally { fs.closeSync(descriptor); }
      let text = buffer.subarray(0, bytes).toString('utf8');
      // Discard a partial first record (including a split UTF-8 character).
      if (offset > 0) { const newline = text.indexOf('\n'); text = newline < 0 ? '' : text.slice(newline + 1); }
      text = text.split('\n').slice(-maxLines).join('\n');
      saved = { signature, text }; summary = null;
      return text;
    } catch (_) { saved = null; summary = null; return ''; }
  }
  function recap(file, summarize) {
    const text = read(file), time = now();
    if (!summary || time - summaryTime >= 60000) { summary = summarize(text, time); summaryTime = time; }
    return summary;
  }
  return { read, recap };
}
module.exports = { createHistoryTail };
