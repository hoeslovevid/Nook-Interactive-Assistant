const WEEK = 7 * 24 * 60 * 60 * 1000;

function parseLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_error) {
        return null;
      }
    })
    .filter((entry) => entry && typeof entry.t === "number");
}

function dayKey(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function summarizeHistory(text, now) {
  const start = now - WEEK;
  const items = parseLines(text).filter((entry) => entry.t >= start);
  const sessions = new Set();
  const days = new Map();
  const agents = new Map();
  let files = 0;
  let added = 0;
  let removed = 0;
  let commands = 0;
  let permissions = 0;
  let questions = 0;
  const projects = new Map();
  const spans = new Map();
  for (const entry of items) {
    if (entry.sessionId) {
      sessions.add(`${entry.agent || ""}:${entry.sessionId}`);
    }
    if (entry.file || entry.files) {
      files += Number(entry.files) || 1;
    }
    added += Number(entry.added) || 0;
    removed += Number(entry.removed) || 0;
    if (entry.command) {
      commands += 1;
    }
    if (entry.permission) {
      permissions += 1;
    }
    if (entry.question) {
      questions += 1;
    }
    if (entry.project) {
      projects.set(entry.project, (projects.get(entry.project) || 0) + 1);
    }
    if (entry.sessionId) {
      const span = spans.get(`${entry.agent || ""}:${entry.sessionId}`) || { start: entry.t, end: entry.t };
      span.start = Math.min(span.start, entry.t);
      span.end = Math.max(span.end, entry.t);
      spans.set(`${entry.agent || ""}:${entry.sessionId}`, span);
    }
    const agent = entry.agent || "agent";
    agents.set(agent, (agents.get(agent) || 0) + 1);
    const key = dayKey(entry.t);
    days.set(key, (days.get(key) || 0) + 1);
  }
  let topAgent = "";
  let topCount = 0;
  for (const [agent, count] of agents) {
    if (count > topCount) {
      topAgent = agent;
      topCount = count;
    }
  }
  let busiest = "";
  let busiestCount = 0;
  for (const [day, count] of days) {
    if (count > busiestCount) {
      busiest = day;
      busiestCount = count;
    }
  }
  let topProject = "";
  let projectCount = 0;
  for (const [project, count] of projects) {
    if (count > projectCount) {
      topProject = project;
      projectCount = count;
    }
  }
  let time = 0;
  let longest = 0;
  for (const span of spans.values()) {
    const length = Math.max(0, span.end - span.start);
    time += length;
    longest = Math.max(longest, length);
  }
  return {
    sessions: sessions.size,
    events: items.length,
    files,
    added,
    removed,
    commands,
    permissions,
    questions,
    time,
    topAgent: topAgent || "—",
    topProject: topProject || "—",
    busiest: busiest || "—",
    longest,
  };
}

function weekKey(now) {
  const date = new Date(now);
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date - start) / 86400000);
  return `${date.getFullYear()}-W${Math.ceil((day + start.getDay() + 1) / 7)}`;
}

function mondayDue(now, shownKey) {
  const date = new Date(now);
  return date.getDay() === 1 && date.getHours() >= 8 && shownKey !== weekKey(now);
}

function xml(value) {
  return String(value).replace(/[&<>"]/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    return "&quot;";
  });
}

function recapSvg(summary, options) {
  const hideProject = Boolean(options && options.hideProject);
  const minutes = Math.round((Number(summary.time) || 0) / 60000);
  const lines = [
    `${minutes} min · ${summary.sessions} sessions`,
    `${summary.files} files · +${summary.added} −${summary.removed}`,
    `${summary.commands} commands · ${summary.permissions} permissions · ${summary.questions || 0} questions`,
    `Top agent ${summary.topAgent}`,
    hideProject ? "Project hidden" : `Top project ${summary.topProject || "—"}`,
    `Busiest ${summary.busiest}`,
    `Longest ${Math.round((Number(summary.longest) || 0) / 60000)} min`,
  ].map(xml);
  const text = lines
    .map((line, index) => `<text x="80" y="${280 + index * 70}" fill="#f4f0e6" font-size="36" font-family="Segoe UI, sans-serif">${line}</text>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#14161a"/>
  <rect x="0" y="0" width="1080" height="18" fill="#dff25a"/>
  <text x="80" y="160" fill="#dff25a" font-size="64" font-family="Segoe UI, sans-serif">Nook</text>
  <text x="80" y="220" fill="#a39e94" font-size="28" font-family="Segoe UI, sans-serif">This week</text>
  ${text}
</svg>
`;
}

module.exports = { summarizeHistory, recapSvg, weekKey, mondayDue };
