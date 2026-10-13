const test=require('node:test'),assert=require('node:assert/strict');
const {providerError,errorPayload,retryAt}=require('../lib/provider-errors');
const {completeChat}=require('../lib/chat-transport');
const history=[{role:'user',content:'Hello'}];

test('429 billing and spend codes take precedence over the broad quota type and retry headers',()=>{
  for(const [code,action,phrase] of [
    ['credit_balance_exhausted','billing',/prepaid API credits/],
    ['organization_spend_limit_exceeded','limits',/spending limit/],
    ['project_spend_limit_exceeded','project',/project/],
    ['organization_usage_limit_exceeded','limits',/approved API usage/],
    ['insufficient_quota','billing',/Repeated retries/],
  ]){
    const error=providerError('chatgpt','ChatGPT',429,{error:{code,type:'insufficient_quota',message:'echoed-secret-key'}},'10',1000);
    assert.equal(error.details.kind,'quota');assert.equal(error.details.action,action);assert.equal(error.details.retryAt,0);
    assert.match(error.message,phrase);assert.ok(!JSON.stringify(error).includes('echoed-secret-key'));assert.ok(!error.message.includes('echoed-secret-key'));
  }
});
test('rate-limit responses honor seconds and HTTP dates, while invalid hints are ignored',()=>{
  assert.equal(retryAt('2.5',1000),3500);assert.equal(retryAt('Thu, 01 Jan 1970 00:00:05 GMT',1000),5000);
  for(const value of ['','not-a-date','-1','Infinity'])assert.equal(retryAt(value,1000),0);
  const error=providerError('chatgpt','ChatGPT',429,{error:{code:'slow_down',type:'rate_limit_error'}},'3',1000);
  assert.equal(error.details.retryAt,4000);assert.equal(error.details.kind,'rate-limit');assert.match(error.message,/at least 3 seconds/);
  const ambiguous=providerError('chatgpt','ChatGPT',429,{},null,1000);
  assert.equal(ambiguous.details.kind,'limit');assert.match(ambiguous.message,/can mean/);
});
test('HTTP errors expose safe recovery guidance without provider secrets, prompts, or account identifiers',async()=>{
  let calls=0;
  const fetcher=async()=>{calls++;return new Response(JSON.stringify({error:{code:'credit_balance_exhausted',type:'insufficient_quota',message:'secret API key, private prompt and account id'}}),{status:429});};
  await assert.rejects(completeChat('chatgpt','fake-key',history,{},null,{fetcher}),error=>{
    assert.equal(error.details.kind,'quota');assert.match(error.message,/OpenAI API/);assert.ok(!error.message.includes('private prompt'));return true;
  });
  assert.equal(calls,1,'quota failures must not trigger automatic requests');
});
test('oversized and non-JSON provider errors stay bounded and fall back to an honest explanation',async()=>{
  assert.deepEqual(await errorPayload(new Response('x'.repeat(65537))),{});
  assert.deepEqual(await errorPayload(new Response('<html>server error</html>')),{});
  assert.equal(providerError('custom','Custom endpoint',401,{}).details.kind,'auth');
  assert.equal(providerError('chatgpt','ChatGPT',404,{}).details.kind,'model');
});
test('billing errors inside streamed replies retain the same recovery classification',async()=>{
  const payload='data: {"choices":[{"delta":{"content":"Partial"}}]}\n\ndata: {"error":{"type":"insufficient_quota","code":"credit_balance_exhausted"}}\n\n';
  await assert.rejects(completeChat('chatgpt','fake-key',history,{},null,{fetcher:async()=>new Response(payload,{headers:{'Content-Type':'text/event-stream'}})}),error=>error.details.kind==='quota');
});
