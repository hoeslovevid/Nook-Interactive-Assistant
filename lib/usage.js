function percent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  if (number >= 0 && number <= 1) {
    return Math.round(number * 100);
  }
  if (number >= 0 && number <= 100) {
    return Math.round(number);
  }
  return null;
}

function pill(label, primary, secondary) {
  const five = percent(primary);
  const week = percent(secondary);
  if (five == null && week == null) {
    return null;
  }
  return {
    id: label.toLowerCase(),
    title: label,
    detail: `${five == null ? "—" : `${five}%`} 5h · ${week == null ? "—" : `${week}%`} week`,
  };
}

function fromRateLimits(limits) {
  if (!limits || typeof limits !== "object") {
    return null;
  }
  const primary = limits.primary || limits.five_hour || limits.fiveHour || {};
  const secondary = limits.secondary || limits.weekly || limits.week || {};
  return pill(
    "Codex",
    primary.used_percent ?? primary.usedPercent ?? primary.utilization,
    secondary.used_percent ?? secondary.usedPercent ?? secondary.utilization,
  );
}

function usageFromText(text, label) {
  let found = null;
  for (const line of String(text || "").split("\n")) {
    if (!line.includes("rate_limit") && !line.includes("used_percent") && !line.includes("utilization")) {
      continue;
    }
    try {
      const json = JSON.parse(line);
      const limits =
        (json.payload && json.payload.rate_limits) ||
        json.rate_limits ||
        (json.payload && json.payload.rate_limit_info) ||
        json.rate_limit_info ||
        json;
      const parsed = fromRateLimits(limits);
      if (parsed) {
        parsed.title = label;
        parsed.id = label.toLowerCase();
        found = parsed;
      } else if (limits && (limits.utilization != null || limits.used_percent != null)) {
        const single = pill(label, limits.utilization ?? limits.used_percent, limits.weekly);
        if (single) {
          found = single;
        }
      }
    } catch (_error) {
      // Skip lines that are not JSON.
    }
  }
  return found;
}

function fromCodexAccount(payload) {
  const body = payload && payload.result ? payload.result : payload;
  if (!body || typeof body !== "object") {
    return null;
  }
  const limits = body.rateLimits || body.rate_limits || body;
  const parsed = fromRateLimits(limits);
  if (!parsed) {
    return null;
  }
  parsed.title = "Codex";
  parsed.id = "codex";
  const credits = body.rateLimitResetCredits || body.rate_limit_reset_credits || limits.credits || {};
  const left = credits.remaining ?? credits.balance ?? credits.available;
  if (left != null && Number.isFinite(Number(left))) {
    parsed.detail += ` · ${left} resets`;
  }
  const primary = limits.primary || {};
  parsed.resetsAt = primary.resetsAt || primary.resets_at || null;
  const secondary = limits.secondary || {};
  parsed.weekResetsAt = secondary.resetsAt || secondary.resets_at || null;
  return parsed;
}

module.exports = { percent, pill, fromRateLimits, usageFromText, fromCodexAccount };
