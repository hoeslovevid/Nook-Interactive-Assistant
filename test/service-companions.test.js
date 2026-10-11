const test = require('node:test'), assert = require('node:assert/strict');
const { describe } = require('../lib/service-cards');
const { stripeAmount, calSummary } = require('../lib/services');
const { createServiceDetails } = require('../lib/service-details');
test('service companions distinguish failed work, reviews, and healthy connections',()=>{
  assert.equal(describe({id:'github',detail:'2 open · 1 reviews'}).mood,'expectant');
  assert.equal(describe({id:'github',detail:'2 open · 0 reviews · 1 failing'}).mood,'dizzy');
  assert.equal(describe({id:'vercel',detail:'Project · READY'}).mood,'happy');
  assert.equal(describe({id:'vercel',detail:'Project · ERROR'}).tone,'error');
});
test('Stripe amounts handle zero and three decimal currencies and API exceptions',()=>{
  assert.equal(stripeAmount(1250,'usd'),'12.50 USD');assert.equal(stripeAmount(1250,'jpy'),'1250 JPY');
  assert.equal(stripeAmount(1250,'kwd'),'1.250 KWD');assert.equal(stripeAmount(500,'isk'),'5.00 ISK');assert.equal(stripeAmount(500,'ugx'),'5.00 UGX');
});
test('all additional service details are read-only and Cal honors its configured origin',async()=>{
  const responses={
    stripe:{available:[{amount:1250,currency:'jpy'}],pending:[]},
    resend:{data:[{id:'email',subject:'Subject',last_event:'delivered'}]},
    notion:{results:[{id:'page',properties:{Title:{type:'title',title:[{plain_text:'Project'}]}},url:'https://notion.so/page'},{id:'invalid',title:'unexpected'}]},
    cal:{data:{bookings:[{uid:'booking',title:'Meeting',start:'2026-10-10'}]}}
  }, calls=[];
  const kit=createServiceDetails({getKeys:()=>({stripe:'test',resend:'test',notion:'test',cal:'test'}),getPrefs:()=>({calUrl:'https://calendar.example.com'}),getGithub:()=>({}),actionsEnabled:()=>true,fetcher:async(url,request)=>{
    calls.push({url,request});const service=url.includes('stripe')?'stripe':url.includes('resend')?'resend':url.includes('notion')?'notion':'cal';
    return{ok:true,status:200,json:async()=>responses[service]};
  }});
  for(const service of Object.keys(responses)){const result=await kit.detail(service);assert.equal(result.ok,true);assert.ok(result.items.every(row=>row.actions.length===0));}
  assert.equal(calls.filter(call=>call.request.method==='POST').length,1,'Notion search POST reads pages');
  assert.match(calls.at(-1).url,/^https:\/\/calendar.example.com\/v2\/bookings/);
  assert.equal(calls.at(-1).request.headers['cal-api-version'],'2026-05-01');
  assert.equal(calSummary({data:[{title:'Review'}]}).detail,'Review');
});
