const { buildChatRequest, readChatReply } = require('./chat');
const { takeSseEvents, deltaText } = require('./stream');
const { stripReasoning } = require('./markdown');

async function completeChat(provider, key, history, options, onDelta, { fetcher = fetch, timeout = 120000, signal: externalSignal } = {}) {
  const request = buildChatRequest(provider, history, { ...options, stream: true });
  if (['bearer', 'anthropic'].includes(request.auth) && !key) throw new Error(`Save a ${request.label} API key first.`);
  const headers = { ...request.headers };
  if (['bearer', 'optional'].includes(request.auth) && key) headers.Authorization = `Bearer ${key}`;
  if (request.auth === 'anthropic') Object.assign(headers, { 'x-api-key': key, 'anthropic-version': '2023-06-01' });
  const deadline = AbortSignal.timeout(timeout);
  const signal = externalSignal ? AbortSignal.any([externalSignal, deadline]) : deadline;
  let reader;
  try {
    const response = await fetcher(request.url, { method: 'POST', headers, body: JSON.stringify(request.body), signal, redirect: 'error' });
    if (!response.ok) throw new Error(`${request.label} returned ${response.status}.`);
    if (response.headers?.get('content-type')?.includes('application/json') || !response.body?.getReader) return readChatReply(await response.json());
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', full = '';
    const consume = final => {
      const taken = takeSseEvents(buffer, final); buffer = taken.rest;
      for (const event of taken.events) {
        const bit = deltaText(event, request.auth);
        if (bit) { full += bit; onDelta?.(full); }
      }
      return taken.done;
    };
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const done = consume(false);
      if (buffer.length > 1000000 || full.length > 2000000) throw new Error('The model reply exceeded the supported size.');
      if (done) break;
    }
    buffer += decoder.decode();
    // Some compatible servers return JSON even without its content-type header.
    if (!full && buffer.trim().startsWith('{')) return readChatReply(JSON.parse(buffer));
    consume(true);
    if (!stripReasoning(full)) throw new Error(`${request.label} returned an empty reply.`);
    return stripReasoning(full);
  } catch (error) {
    if (externalSignal?.aborted) throw new Error('Generation stopped.');
    if (deadline.aborted) throw new Error(`${request.label} took too long to respond. Try again.`);
    if (error instanceof TypeError) throw new Error(`Could not reach ${request.label}.`);
    throw error;
  } finally {
    if (reader) { try { await reader.cancel(); } catch {} reader.releaseLock(); }
  }
}
module.exports = { completeChat };
