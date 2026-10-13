const QUOTA_CODES = new Set(['insufficient_quota','credit_balance_exhausted','organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded']);
const RATE_CODES = new Set(['rate_limit_exceeded','slow_down']);

function retryAt(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return 0;
  const trimmed = value.trim();
  const httpDate=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(trimmed);
  const time = /^\d+(?:\.\d+)?$/.test(trimmed) ? now + Number(trimmed)*1000 : httpDate ? Date.parse(trimmed) : NaN;
  return Number.isFinite(time) && time > now && time <= 8640000000000000 ? time : 0;
}

function providerError(provider, label, status, payload, retryHeader, now = Date.now()) {
  const error = payload?.error && typeof payload.error === 'object' ? payload.error : {};
  const code = typeof error.code === 'string' ? error.code : '';
  const type = typeof error.type === 'string' ? error.type : '';
  const name = provider === 'chatgpt' ? 'OpenAI API' : label || 'The model';
  let kind='request',action='models',message=`${name} returned ${status || 'an error'}. Review your model and connection settings.`,wait=0;
  if (QUOTA_CODES.has(code) || type === 'insufficient_quota') {
    kind='quota';action='billing';
    if(code==='credit_balance_exhausted') message=`${name} has no prepaid API credits remaining. Add credits in API billing before retrying.`;
    else if(code==='organization_spend_limit_exceeded') {action='limits';message=`${name} reached your organization's API spending limit. Review that limit before retrying.`;}
    else if(code==='project_spend_limit_exceeded') {action='project';message=`${name} reached this project's API spending limit. Review the project limit before retrying.`;}
    else if(code==='organization_usage_limit_exceeded') {action='limits';message=`${name} reached your organization's approved API usage limit. Review your API limits before retrying.`;}
    else message=`${name} has no available API quota. Check your API credit balance and usage limits before retrying. Repeated retries will not restore quota.`;
  } else if (RATE_CODES.has(code) || type==='rate_limit_error' || type==='rate_limit_exceeded') {
    kind='rate-limit';action='limits';wait=retryAt(retryHeader,now);
    message=`${name} temporarily limited requests. ${wait ? `Wait at least ${Math.ceil((wait-now)/1000)} seconds before retrying.` : 'Wait a moment before retrying; check your API rate limits if this continues.'}`;
  } else if(status===429) {
    kind='limit';action='billing';wait=retryAt(retryHeader,now);
    message=`${name} returned 429. This can mean a temporary rate limit or unavailable API credits/quota. Check API billing and limits.${wait ? ` Wait at least ${Math.ceil((wait-now)/1000)} seconds before retrying.` : ''}`;
  } else if(status===401) {
    kind='auth';message=`${name} rejected the API key. Check the key in Models & connections.`;
  } else if(status===403) {
    kind='auth';message=`${name} denied access. Check the API key's project permissions and model access.`;
  } else if(status===404 || code==='model_not_found') {
    kind='model';message=`${name} could not find or access the selected model. Choose an available model in Models & connections.`;
  } else if(status>=500) {
    kind='server';action='';wait=retryAt(retryHeader,now);message=`${name} is temporarily unavailable.${wait ? ` Wait at least ${Math.ceil((wait-now)/1000)} seconds before retrying.` : ' Try again shortly.'}`;
  } else if(!status) {
    kind='interrupted';action='';message='The model interrupted its reply. Try again.';
  }
  // Never copy provider messages: they can echo credentials, prompts, or account IDs.
  const result=new Error(message);
  result.details={kind,action,status:status||0,retryAt:wait};
  return result;
}

async function errorPayload(response) {
  let reader;
  try {
    if(!response.body?.getReader) return response.json ? await response.json() : {};
    reader=response.body.getReader();let size=0;const chunks=[];
    while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>65536)return {};chunks.push(Buffer.from(chunk.value));}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {return {};}
  finally {if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
}

module.exports={providerError,errorPayload,retryAt};
