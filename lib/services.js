const SERVICES = ["github", "vercel", "stripe", "resend", "notion", "n8n", "cal"];

function cleanServiceUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if (url.protocol === "https:" || (url.protocol === "http:" && local)) {
      return url.origin;
    }
  } catch (_error) {
    return "";
  }
  return "";
}

function githubSummary(pulls, reviews) {
  const open = Array.isArray(pulls) ? pulls.length : 0;
  const waiting = Array.isArray(reviews) ? reviews.length : 0;
  const failing = (Array.isArray(pulls) ? pulls : []).filter((pull) => {
    const state = pull && (pull.status || pull.state);
    return state === "failure" || state === "error";
  }).length;
  return {
    id: "github",
    title: "GitHub",
    detail: `${open} open · ${waiting} reviews${failing ? ` · ${failing} failing` : ""}`,
  };
}

function vercelSummary(deployments) {
  const first = Array.isArray(deployments) ? deployments[0] : null;
  const name = (first && (first.name || first.project)) || "Vercel";
  const state = (first && (first.readyState || first.state)) || "none";
  return { id: "vercel", title: "Vercel", detail: `${name} · ${state}` };
}

function stripeAmount(amount, currency) {
  const code = String(currency || '').toUpperCase();
  // ISK and UGX retain two-digit API units despite their zero-decimal display.
  const zero = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','VND','VUV','XAF','XOF','XPF']);
  const digits = zero.has(code) ? 0 : ['BHD','JOD','KWD','OMR','TND'].includes(code) ? 3 : 2;
  return (Number(amount) / 10 ** digits).toFixed(digits) + ' ' + code;
}
function stripeSummary(balance) {
  const available = balance && Array.isArray(balance.available) ? balance.available[0] : null;
  const amount = available ? stripeAmount(available.amount, available.currency) : "no balance";
  return { id: "stripe", title: "Stripe", detail: amount };
}

function resendSummary(emails) {
  const list = emails && Array.isArray(emails.data) ? emails.data : [];
  const latest = list[0];
  return {
    id: "resend",
    title: "Resend",
    detail: latest ? `${latest.subject || latest.to || "email"} · ${latest.last_event || "sent"}` : "No recent email",
  };
}

function notionSummary(search) {
  const results = search && Array.isArray(search.results) ? search.results : [];
  const first = results[0];
  const title =
    first && first.properties
      ? "Page"
      : (first && first.url) || "Notion";
  return { id: "notion", title: "Notion", detail: results.length ? `${results.length} recent · ${title}` : "No pages" };
}

function n8nSummary(workflows) {
  const list = workflows && Array.isArray(workflows.data) ? workflows.data : [];
  const active = list.filter((item) => item && item.active).length;
  return { id: "n8n", title: "n8n", detail: `${active} active · ${list.length} workflows` };
}

function calSummary(bookings) {
  const list = Array.isArray(bookings?.data?.bookings) ? bookings.data.bookings : Array.isArray(bookings?.data) ? bookings.data : Array.isArray(bookings?.bookings) ? bookings.bookings : Array.isArray(bookings) ? bookings : [];
  const next = list[0];
  return {
    id: "cal",
    title: "Cal.com",
    detail: next ? next.title || next.start || "Upcoming" : "No upcoming bookings",
  };
}

module.exports = {
  stripeAmount,
  SERVICES,
  cleanServiceUrl,
  githubSummary,
  vercelSummary,
  stripeSummary,
  resendSummary,
  notionSummary,
  n8nSummary,
  calSummary,
};
