const path = require("path");
const clip = (value, limit = 8000) => String(value || "").slice(0, limit);
function timelineEntry(turn, final = "", now = Date.now()) {
  return {
    time: now,
    task: clip(turn.task, 80),
    title: clip(turn.title || turn.label, 100),
    detail: clip(turn.detail, 1000),
    file: clip(turn.file, 1000),
    diff: clip(turn.diff, 16000),
    added: Number(turn.added) || 0,
    removed: Number(turn.removed) || 0,
    final: clip(final),
  };
}
function sessionDetail(session) {
  if (!session) return null;
  return {
    id: session.id,
    label: session.label,
    agent: session.agent,
    finished: Boolean(session.finished),
    final: clip(session.final),
    steps: (session.steps || [])
      .slice(-30)
      .map((step) => ({
        time: step.time,
        task: clip(step.task, 80),
        title: clip(step.title, 100),
        file: step.file ? path.win32.basename(step.file) : "",
        detail: clip(step.detail, 1000),
        diff: clip(step.diff, 16000),
        added: Number(step.added) || 0,
        removed: Number(step.removed) || 0,
      })),
  };
}
function instructionDraft(session, input, now = Date.now()) {
  if (
    !session ||
    typeof input !== "string" ||
    !input.trim() ||
    input.trim().length > 4000
  )
    return null;
  return {
    id: require("crypto").randomUUID(),
    sessionId: session.id,
    label: clip(session.label, 80),
    agent: session.agent,
    text: input.trim(),
    time: now,
  };
}
module.exports = { timelineEntry, sessionDetail, instructionDraft };
