const crypto = require('node:crypto');
const { cleanServiceUrl, stripeAmount } = require('./services');
const { QUERY, parseGithub } = require('./github');
const trim = (value, length = 200) => String(value || '').slice(0, length);
function createServiceDetails({ getKeys, getPrefs, getGithub, fetcher = fetch, now = Date.now, confirm = async () => false, actionsEnabled = () => false }) {
  const offers = new Map();
  const connection = service => crypto.createHash('sha256').update(JSON.stringify([getKeys()[service] || '', service === 'n8n' ? cleanServiceUrl(getPrefs().n8nUrl) : ''])).digest('hex');
  async function api(url, service, method = 'GET', body) {
    const key = getKeys()[service]; if (!key) throw new Error('Save a ' + service + ' connection first.');
    const headers = { 'Content-Type': 'application/json', ...(service === 'n8n' ? { 'X-N8N-API-KEY': key } : { Authorization: 'Bearer ' + key }) };
    if (service === 'github') Object.assign(headers, { Accept: 'application/vnd.github+json', 'User-Agent': 'Nook' });
    if (service === 'notion') headers['Notion-Version'] = '2022-06-28';
    if (service === 'cal') headers['cal-api-version'] = '2026-05-01';
    const response = await fetcher(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error('The service returned ' + response.status + '. Check access and permissions.');
    return response.status === 204 ? {} : response.json();
  }
  function offer(service, row, action, label, url, body, options = {}) {
    if (!actionsEnabled()) return;
    const id = crypto.randomUUID();
    offers.set(id, { service, row: row.id, action, label, title: row.title, url, body, ...options, connection: connection(service), expires: now() + 300000 });
    row.actions.push({ id, label, needsText: Boolean(options.needsText), summary: options.summary || row.title });
  }
  const row = (id, title, detail, url = '') => ({ id: trim(id), title: trim(title), detail: trim(detail), url, actions: [] });
  async function detail(service) {
    for (const [id, offer] of offers) if (offer.expires < now()) offers.delete(id);
    while (offers.size > 300) offers.delete(offers.keys().next().value);
    const items = [];
    if (service === 'github') {
      let github = getGithub() || {};
      if (!github.login && ![...(github.pulls || []), ...(github.reviews || []), ...(github.branches || [])].length) github = parseGithub(await api('https://api.github.com/graphql', service, 'POST', { query: QUERY }));
      const fetched = new Set();
      for (const item of [...(github.pulls || []), ...(github.reviews || []), ...(github.branches || [])]) {
        const parsed = new URL(item.url); if (parsed.hostname !== 'github.com') continue;
        const segments = parsed.pathname.split('/').filter(Boolean), repo = segments.slice(0, 2).map(encodeURIComponent).join('/');
        const entry = row(item.id, item.title, [item.kind, item.state].filter(Boolean).join(' · '), item.url);
        items.push(entry);
        if (segments[2] === 'pull' && /^\d+$/.test(segments[3] || '') && repo.split('/').length === 2 && actionsEnabled()) {
          const endpoint = 'https://api.github.com/repos/' + repo + '/pulls/' + segments[3];
          try {
            const pr = await api(endpoint, service);
            if (pr.state === 'open' && /^[a-f0-9]{40,64}$/i.test(pr.head?.sha || '') && pr.user?.login !== github.login) {
              for (const [event, label] of [['APPROVE', 'Approve pull request'], ['REQUEST_CHANGES', 'Request changes'], ['COMMENT', 'Leave review comment']]) {
                if (event === 'APPROVE' && pr.draft) continue;
                offer(service, entry, 'review', label, endpoint + '/reviews', { commit_id: pr.head.sha, event }, { needsText: event !== 'APPROVE', verify: { kind: 'pull', url: endpoint, sha: pr.head.sha }, summary: repo + ' #' + segments[3] + '\nCommit: ' + pr.head.sha + '\n' + label + '. Inspect the changes in GitHub before submitting.' });
              }
            }
          } catch (error) { entry.detail += ' · Reviews unavailable: ' + error.message; }
        }
        if (items.length > 20) break;
        if (repo.split('/').length !== 2) continue;
        if (fetched.has(repo) || fetched.size >= 5) continue; fetched.add(repo);
        let runs;
        try { runs = await api('https://api.github.com/repos/' + repo + '/actions/runs?per_page=5', service); }
        catch (error) { items.push(row('ci-unavailable:' + repo, 'CI details unavailable', error.message, item.url)); continue; }
        for (const run of runs.workflow_runs || []) {
          const entry = row('run:' + run.id, run.name, run.conclusion || run.status, run.html_url);
          if (run.conclusion === 'failure' && Number.isSafeInteger(run.id)) offer(service, entry, 'retry', 'Retry failed CI', 'https://api.github.com/repos/' + repo + '/actions/runs/' + run.id + '/rerun-failed-jobs');
          if (!items.some(item => item.id === entry.id)) items.push(entry);
        }
      }
    } else if (service === 'vercel') {
      const payload = await api('https://api.vercel.com/v6/deployments?limit=15', service);
      for (const deployment of payload.deployments || []) {
        const entry = row(deployment.uid, deployment.name, deployment.readyState || deployment.state, deployment.url ? 'https://' + deployment.url : '');
        // Vercel's documented omitted target creates a preview; "preview" is not a valid target string.
        offer(service, entry, 'redeploy', 'Redeploy as preview', 'https://api.vercel.com/v13/deployments', { deploymentId: deployment.uid, name: deployment.name });
        if (['QUEUED', 'BUILDING', 'INITIALIZING'].includes(deployment.readyState || deployment.state)) {
          offer(service, entry, 'cancel', 'Cancel build', 'https://api.vercel.com/v12/deployments/' + encodeURIComponent(deployment.uid) + '/cancel', undefined, { method: 'PATCH', verify: { kind: 'deployment', url: 'https://api.vercel.com/v13/deployments/' + encodeURIComponent(deployment.uid) }, summary: deployment.name + '\nDeployment: ' + deployment.uid + '\nStops this queued or running build.' });
        }
        items.push(entry);
      }
    } else if (service === 'n8n') {
      const base = cleanServiceUrl(getPrefs().n8nUrl); if (!base) throw new Error('Save an n8n server address first.');
      const payload = await api(base + '/api/v1/workflows?limit=20', service);
      for (const workflow of payload.data || []) {
        const entry = row(workflow.id, workflow.name, workflow.active ? 'Active' : 'Inactive', base + '/workflow/' + encodeURIComponent(workflow.id));
        offer(service, entry, workflow.active ? 'pause' : 'activate', workflow.active ? 'Pause workflow' : 'Activate workflow', base + '/api/v1/workflows/' + encodeURIComponent(workflow.id) + (workflow.active ? '/deactivate' : '/activate'));
        items.push(entry);
      }
      try {
        const executions = await api(base + '/api/v1/executions?status=error&limit=10&includeData=false', service);
        for (const execution of executions.data || []) {
          if (execution.status !== 'error' || execution.retrySuccessId || !execution.id) continue;
          const entry = row('execution:' + execution.id, 'Failed execution ' + execution.id, 'Workflow ' + trim(execution.workflowId) + ' · ' + trim(execution.stoppedAt), base + '/execution/' + encodeURIComponent(execution.id));
          offer(service, entry, 'retry-execution', 'Retry execution', base + '/api/v1/executions/' + encodeURIComponent(execution.id) + '/retry', undefined, { verify: { kind: 'execution', url: base + '/api/v1/executions/' + encodeURIComponent(execution.id) + '?includeData=false', workflowId: execution.workflowId }, summary: 'Execution ' + execution.id + ' · Workflow ' + trim(execution.workflowId) + '\nRuns the workflow again and may repeat emails, payments, or other side effects.' });
          items.push(entry);
        }
      } catch (error) { items.push(row('executions-unavailable', 'Execution details unavailable', error.message)); }
    } else if (service === 'stripe') {
      const payload = await api('https://api.stripe.com/v1/balance', service);
      for (const group of ['available', 'pending']) for (const balance of payload[group] || []) {
        items.push(row(group + ':' + balance.currency, group === 'available' ? 'Available balance' : 'Pending balance', stripeAmount(balance.amount, balance.currency)));
      }
    } else if (service === 'resend') {
      const payload = await api('https://api.resend.com/emails?limit=20', service);
      for (const email of payload.data || []) items.push(row(email.id, email.subject || 'Email', [email.last_event, email.created_at].filter(Boolean).join(' · ')));
    } else if (service === 'notion') {
      const payload = await api('https://api.notion.com/v1/search', service, 'POST', { page_size: 20 });
      for (const page of payload.results || []) {
        const title = page.title || Object.values(page.properties || {}).find(property => property.type === 'title')?.title || [];
        items.push(row(page.id, (Array.isArray(title) ? title : []).map(part => part?.plain_text || part?.text?.content || '').join('') || 'Notion page', page.last_edited_time || '', page.url || ''));
      }
    } else if (service === 'cal') {
      const base = cleanServiceUrl(getPrefs().calUrl) || 'https://api.cal.com';
      const payload = await api(base + '/v2/bookings?status=upcoming&limit=20', service);
      const bookings = payload.data?.bookings || payload.data || payload.bookings || [];
      for (const booking of Array.isArray(bookings) ? bookings : []) items.push(row(booking.uid || booking.id, booking.title || 'Upcoming booking', booking.start || booking.startTime || ''));
    } else throw new Error('Choose a connected service.');
    return { service, time: now(), items: items.slice(0, 40) };
  }
  return {
    async detail(service) { try { return { ok: true, ...await detail(service) }; } catch (error) { return { ok: false, error: error.message }; } },
    async act(id, input) {
      const plan = offers.get(id);
      if (!actionsEnabled() || !plan || plan.expires <= now() || plan.connection !== connection(plan.service)) return { ok: false, error: 'This action expired or the connection changed. Refresh the service first.' };
      offers.delete(id); // A confirmation or request can never replay the same offer.
      if (plan.needsText) {
        const body = typeof input?.text === 'string' ? input.text.trim() : '';
        if (!body || body.length > 4000) return { ok: false, error: 'Enter a review comment of 1–4,000 characters, then refresh the service.' };
        plan.body = { ...plan.body, body }; plan.summary += '\n\nYour review:\n' + body;
      }
      try {
        if (!await confirm(plan)) return { ok: false, cancelled: true };
        if (!actionsEnabled() || plan.expires <= now() || plan.connection !== connection(plan.service)) return { ok: false, error: 'This action expired, was disabled, or the connection changed.' };
        if (plan.verify) {
          const current = await api(plan.verify.url, plan.service);
          const valid = plan.verify.kind === 'pull' ? current.state === 'open' && current.head?.sha === plan.verify.sha && !(plan.body.event === 'APPROVE' && current.draft)
            : plan.verify.kind === 'deployment' ? ['QUEUED', 'BUILDING', 'INITIALIZING'].includes(current.readyState || current.state)
            : current.status === 'error' && !current.retrySuccessId && current.workflowId === plan.verify.workflowId;
          if (!valid) return { ok: false, error: 'This item changed while you were reviewing it. Refresh and review it again.' };
        }
        if (!actionsEnabled() || plan.expires <= now() || plan.connection !== connection(plan.service)) return { ok: false, error: 'The connection changed during verification. Refresh the service.' };
        await api(plan.url, plan.service, plan.method || 'POST', plan.body); return { ok: true };
      } catch (error) { return { ok: false, error: error.message }; }
    },
  };
}
module.exports = { createServiceDetails };
