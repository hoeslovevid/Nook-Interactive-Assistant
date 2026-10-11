const crypto = require('node:crypto');
// A brief lock never starts an activity; unlock and quiet transitions get a grace period.
function createHandoffPolicy({ now = Date.now, generation = () => crypto.randomUUID() } = {}) {
  let locked = false, lockAt = null, active = false, id = '', endAt = null;
  return {
    lock(value) { const next = Boolean(value); if (next === locked) return; locked = next; if (locked) { lockAt = now(); endAt = null; } else { lockAt = null; if (active) endAt = now() + 30000; } },
    observe(state = {}) {
      const urgent = Boolean(state.pending), working = (state.sessions || []).some(item => !item.finished), time = now();
      const shouldStart = urgent || locked && working && lockAt != null && time - lockAt >= 20000;
      if (shouldStart) { if (!active) { active = true; id = generation(); } endAt = null; }
      else if (active) { if (endAt == null) endAt = time + 30000; if (time >= endAt) { active = false; endAt = null; } }
      return { active, generation: id, locked, nextAt: active ? endAt : locked && working && lockAt != null ? lockAt + 20000 : null };
    },
  };
}
module.exports = { createHandoffPolicy };
