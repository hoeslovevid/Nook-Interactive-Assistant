const crypto = require('node:crypto');
function previewHandoff(messages, provider) {
  const rows = messages.filter(row => row.provider === provider && ['user', 'assistant'].includes(row.role) && row.content).slice(-24).map(row => ({ role: row.role, content: String(row.content) }));
  const revision = crypto.createHash('sha256').update(JSON.stringify([provider, rows])).digest('hex');
  return { rows, revision };
}
function copyHandoff(messages, { from, to, revision, selected }, providers) {
  if (!Object.hasOwn(providers, from) || !Object.hasOwn(providers, to) || from === to) throw new Error('Choose a different chat provider.');
  const preview = previewHandoff(messages, from);
  if (revision !== preview.revision) throw new Error('The conversation changed. Open the handoff again.');
  if (!Array.isArray(selected) || !selected.length || selected.length > 24 || new Set(selected).size !== selected.length || selected.some(index => !Number.isInteger(index) || index < 0 || index >= preview.rows.length)) throw new Error('Select messages to copy.');
  const rows = selected.toSorted((a, b) => a - b).map(index => ({ ...preview.rows[index], provider: to }));
  if (rows.reduce((sum, row) => sum + row.content.length, 0) > 64000) throw new Error('Select fewer messages. The handoff limit is 64,000 characters.');
  return rows;
}
module.exports = { previewHandoff, copyHandoff };
