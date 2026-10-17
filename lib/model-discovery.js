const { createHash } = require('node:crypto');
const { PROVIDERS, buildModelsRequest, cleanModel } = require('./chat');

function chatModels(payload) {
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
  const models = list.filter(item => {
    if (Array.isArray(item?.supportedGenerationMethods) && !item.supportedGenerationMethods.includes('generateContent')) return false;
    if (Array.isArray(item?.architecture?.output_modalities) && !item.architecture.output_modalities.includes('text')) return false;
    if (item?.capabilities?.completion_chat === false) return false;
    return true;
  }).map(item => item?.id || item?.name || '').filter(id => typeof id === 'string').map(id => id.replace(/^models\//, ''))
    .filter(id => cleanModel(id, '') && !/(?:embedding|embed-|whisper|tts-|moderation|realtime|transcri|rerank|dall-e|^sora|^gpt-image)/i.test(id));
  return [...new Set(models)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, 2000);
}


function modelDetails(payload,ids=chatModels(payload)) {
  const allowed=new Set(ids),list=Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];
  const details=Object.create(null);
  for(const item of list){const id=String(item?.id||item?.name||'').replace(/^models\//,'');if(!allowed.has(id))continue;
    const modalities=item.architecture?.input_modalities||item.input_modalities;
    const caps=item.capabilities||{},context=Number(item.context_length||item.max_context_length||item.inputTokenLimit);
    details[id]={vision:Array.isArray(modalities)?modalities.includes('image'):typeof caps.vision==='boolean'?caps.vision:null,tools:typeof caps.function_calling==='boolean'?caps.function_calling:Array.isArray(item.supported_parameters)?item.supported_parameters.includes('tools'):null,contextWindow:Number.isSafeInteger(context)&&context>0&&context<=20000000?context:null};
  }
  return details;
}

// Keep sanitized model metadata in memory. Credentials never leave the main process.
function createModelDiscovery({ fetcher = fetch, now = Date.now, ttl = 60000, managed } = {}) {
  const cache = new Map(), pending = new Map();
  function clear() { cache.clear(); }
  async function discover(provider, settings = {}, key = '', refresh = false) {
    if(provider==='nook')return managed?managed():{ok:false,models:[],error:'Open Nook Local settings to install a model.'};
    const spec = Object.hasOwn(PROVIDERS, provider) ? PROVIDERS[provider] : null;
    if (!spec) return { ok: false, models: [], error: 'Unknown provider.' };
    if (['bearer', 'anthropic'].includes(spec.auth) && !key) return { ok: false, models: [], error: 'Save your API key first, then check the connection.' };
    const base = settings[provider + 'Url'] || spec.url;
    const request = buildModelsRequest(provider, { url: base }, key);
    const fingerprint = createHash('sha256').update(provider + '\0' + request.url + '\0' + key).digest('hex');
    const stored = cache.get(fingerprint);
    if (!refresh && stored && now() - stored.time < ttl) return { ...stored.result, cached: true };
    if (pending.has(fingerprint)) return pending.get(fingerprint);
    const work = (async () => {
      try {
        const response = await fetcher(request.url, { headers: request.headers, signal: AbortSignal.timeout(8000), redirect: 'error' });
        if (!response.ok) {
          const error = response.status === 401 || response.status === 403 ? 'Access denied. Check the key and its API permissions.' : response.status === 429 ? 'Too many requests. Wait a moment and retry.' : response.status === 404 ? 'This server does not offer model discovery. Enter its model ID manually.' : 'The provider could not list models. Try again shortly.';
          return { ok: false, models: [], error };
        }
        let bytes = 0; const chunks = [];
        for await (const chunk of response.body || []) {
          bytes += chunk.length;
          if (bytes > 8 * 1024 * 1024) throw new Error('oversized');
          chunks.push(Buffer.from(chunk));
        }
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const result = { ok: true, models: chatModels(payload), details: modelDetails(payload), cached: false };
        if (cache.size >= 16) cache.delete(cache.keys().next().value);
        cache.set(fingerprint, { time: now(), result });
        return result;
      } catch (_) {
        return { ok: false, models: [], error: spec.local ? 'Cannot reach the local server. Start it and enable its API, then try again.' : 'Could not reach the model list. Check the address and connection, then retry.' };
      }
    })();
    pending.set(fingerprint, work);
    try { return await work; } finally { pending.delete(fingerprint); }
  }
  return { discover, clear };
}
module.exports = { chatModels, modelDetails, createModelDiscovery };
