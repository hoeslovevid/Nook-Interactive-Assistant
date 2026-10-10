(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NookWorkbench = api;
})(typeof window === 'undefined' ? globalThis : window, () => {
  function diffRows(text) {
    let old = 1, next = 1;
    return String(text || '').split(/\r?\n/).map(line => {
      const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) { old = Number(hunk[1]); next = Number(hunk[2]); return { type: 'meta', text: line }; }
      if (/^(---|\+\+\+|diff |index |\\ |…)/.test(line)) return { type: 'meta', text: line };
      if (line.startsWith('-')) return { type: 'removed', old: old++, text: line.slice(1) };
      if (line.startsWith('+')) return { type: 'added', next: next++, text: line.slice(1) };
      return { type: 'context', old: old++, next: next++, text: line.startsWith(' ') ? line.slice(1) : line };
    });
  }
  function timeline(session) {
    const steps = (session?.steps || []).filter(step => step.task && !/sessionstart|userprompt|stop|agentstop/i.test(step.task)).slice(-5);
    return steps.map((step, index) => ({ label: String(step.task).slice(0, 28), done: Boolean(session.finished) || index < steps.length - 1, current: !session.finished && index === steps.length - 1 }));
  }
  return { diffRows, timeline };
});
