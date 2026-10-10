function textDiff(before, after) {
  const left = String(before ?? "");
  const right = String(after ?? "");
  if (left === right) {
    return "No changes.";
  }
  const a = left.split("\n");
  const b = right.split("\n");
  if (a.length > 250 || b.length > 250) {
    return "Large change. Installing updates Nook's hook entries and leaves other hooks in place.";
  }
  const scores = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      scores[i][j] =
        a[i] === b[j] ? scores[i + 1][j + 1] + 1 : Math.max(scores[i + 1][j], scores[i][j + 1]);
    }
  }
  const lines = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length && lines.length < 160) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
    } else if (scores[i + 1][j] >= scores[i][j + 1]) {
      lines.push(`- ${a[i]}`);
      i += 1;
    } else {
      lines.push(`+ ${b[j]}`);
      j += 1;
    }
  }
  while (i < a.length && lines.length < 160) {
    lines.push(`- ${a[i]}`);
    i += 1;
  }
  while (j < b.length && lines.length < 160) {
    lines.push(`+ ${b[j]}`);
    j += 1;
  }
  return lines.length ? lines.join("\n") : "No changes.";
}

function pairDiff(before, after) {
  if (String(before ?? '') === String(after ?? '')) return 'No changes.';
  const removed = before ? String(before).split(/\r?\n/).slice(0, 24) : [];
  const added = after ? String(after).split(/\r?\n/).slice(0, 24) : [];
  return [
    ...removed.map((line) => `- ${line}`),
    ...added.map((line) => `+ ${line}`),
    ...([before, after].some(value => String(value || '').split(/\r?\n/).length > 24) ? ['… Preview truncated; open the file for the full change.'] : []),
  ].join("\n");
}

module.exports = { textDiff, pairDiff };
