const { buildChatRequest, readChatReply } = require('./chat');
const { takeSseEvents, deltaText } = require('./stream');
const { stripReasoning } = require('./markdown');
const { providerError, errorPayload } = require('./provider-errors');
const {usageFrom}=require('./library-data');

async function completeChat(provider, key, history, options, onDelta, { fetcher = fetch, timeout = 120000, signal: externalSignal } = {}) {
  const request = buildChatRequest(provider, history, { ...options, stream: true });
  // Other compatible servers vary; request the optional final usage block only
  // from OpenAI itself. All providers can still report usage without this flag.
  if(provider==='chatgpt')request.body.stream_options={include_usage:true};
  const report=payload=>{const usage=usageFrom(payload);if(usage)try{options?.onUsage?.(usage);}catch{}};
  if (['bearer', 'anthropic'].includes(request.auth) && !key) throw new Error(`Save a ${request.label} API key first.`);
  const headers = { ...request.headers };
  if (['bearer', 'optional'].includes(request.auth) && key) headers.Authorization = `Bearer ${key}`;
  if (request.auth === 'anthropic') Object.assign(headers, { 'x-api-key': key, 'anthropic-version': '2023-06-01' });
  const deadline = AbortSignal.timeout(timeout);
  const signal = externalSignal ? AbortSignal.any([externalSignal, deadline]) : deadline;
  let reader;
  try {
    const response = await fetcher(request.url, { method: 'POST', headers, body: JSON.stringify(request.body), signal, redirect: 'error' });
    if (!response.ok) throw providerError(provider,request.label,response.status,await errorPayload(response),response.headers?.get('retry-after'));
    if (response.headers?.get('content-type')?.includes('application/json') || !response.body?.getReader) {const payload=await response.json();report(payload);return readChatReply(payload);}
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', full = '';
    const consume = final => {
      const taken = takeSseEvents(buffer, final); buffer = taken.rest;
      for (const event of taken.events) {
        try{report(JSON.parse(event));}catch{}
        const bit = deltaText(event, request.auth, {provider,label:request.label});
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
    if (!full && buffer.trim().startsWith('{')) {const payload=JSON.parse(buffer);report(payload);return readChatReply(payload);}
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
