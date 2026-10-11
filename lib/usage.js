function percent(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? Math.round(number) : null;
}
function resetTime(value) {
  if (value == null || value === '') return null;
  const numeric = Number(value), time = Number.isFinite(numeric) ? numeric * (numeric < 1e12 ? 1000 : 1) : Date.parse(value);
  return Number.isFinite(time) && time > 0 ? time : null;
}
function pill(label, primary, secondary) {
  const five = percent(primary), week = percent(secondary);
  if (five == null && week == null) return null;
  return { id: label.toLowerCase(), title: label, primaryUsed: five, weeklyUsed: week, readAt: Date.now(),
    detail: `${five == null ? '—' : `${five}%`} 5h · ${week == null ? '—' : `${week}%`} week` };
}
function fromRateLimits(limits) {
  if (!limits || typeof limits !== 'object') return null;
  const primary = limits.primary || limits.five_hour || limits.fiveHour || {}, secondary = limits.secondary || limits.weekly || limits.week || {};
  const result = pill('Codex', primary.used_percent ?? primary.usedPercent ?? primary.utilization, secondary.used_percent ?? secondary.usedPercent ?? secondary.utilization);
  if (result) Object.assign(result, { resetsAt: resetTime(primary.resetsAt ?? primary.resets_at), weekResetsAt: resetTime(secondary.resetsAt ?? secondary.resets_at), primaryMinutes: primary.windowDurationMins || primary.limit_window_minutes || 300 });
  return result;
}
function usageFromText(text, label) {
  let found = null;
  for (const line of String(text || '').split('\n')) {
    if (!/rate_limit|used_percent|utilization/.test(line)) continue;
    try {
      const json = JSON.parse(line), limits = json.payload?.rate_limits || json.rate_limits || json.payload?.rate_limit_info || json.rate_limit_info || json;
      const parsed = fromRateLimits(limits) || pill(label, limits.utilization ?? limits.used_percent, limits.weekly?.utilization ?? limits.weekly);
      if (parsed) { parsed.title = label; parsed.id = label.toLowerCase(); parsed.sourceAt = resetTime(json.timestamp); found = parsed; }
    } catch { /* Logs can contain non-JSON lines. */ }
  }
  return found;
}
function fromCodexAccount(payload) {
  const body = payload?.result || payload; if (!body || typeof body !== 'object') return null;
  const limits = body.rateLimits || body.rate_limits || body, parsed = fromRateLimits(limits); if (!parsed) return null;
  const credits = body.rateLimitResetCredits || body.rate_limit_reset_credits || limits.credits || {}, left = credits.remaining ?? credits.balance ?? credits.available;
  if (left != null && Number.isFinite(Number(left))) { parsed.resetCredits = Number(left); parsed.detail += ` · ${left} resets`; }
  return parsed;
}
module.exports = { percent, resetTime, pill, fromRateLimits, usageFromText, fromCodexAccount };
