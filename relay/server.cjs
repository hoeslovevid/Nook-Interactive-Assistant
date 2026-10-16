// Single-PC relay. Terminate HTTPS at your reverse proxy; bind this process to loopback.
// The relay transports opaque AES-GCM envelopes and never receives the PC session token.
const http=require('node:http'),crypto=require('node:crypto');
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
function createRelayHandler({desktopKey,now=Date.now}){
 if(!/^[A-Za-z0-9_-]{32,256}$/.test(desktopKey||''))throw new Error('Set NOOK_RELAY_DESKTOP_KEY to a random key of at least 32 characters.');
 let phones=new Map();const jobs=new Map(),rates=new Map();
 return async(req,res)=>{const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};try{
  for(const [id,j]of jobs)if(j.expires<=now())jobs.delete(id);for(const [id,r]of rates)if(now()-r.time>60000)rates.delete(id);
  if(req.method!=='POST')return reply(405,{error:'POST required.'});const auth=String(req.headers.authorization||'').replace(/^Bearer /,''),isDesktop=crypto.timingSafeEqual(Buffer.from(hash(auth)),Buffer.from(hash(desktopKey)));let phone='';if(!isDesktop)for(const [id,value]of phones)if(crypto.timingSafeEqual(Buffer.from(value),Buffer.from(hash(auth))))phone=id;if(!isDesktop&&!phone)return reply(401,{error:'Unauthorized.'});
  const rateKey=isDesktop?'desktop':phone,rate=rates.get(rateKey)||{time:now(),count:0};if(++rate.count>(isDesktop?240:180))return reply(429,{error:'Slow down.'});rates.set(rateKey,rate);
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>3000000)return reply(413,{error:'Too large.'});}const input=JSON.parse(raw||'{}');
  if(isDesktop&&req.url==='/desktop/register'){const next=new Map();for(const p of (Array.isArray(input.phones)?input.phones:[]).slice(0,3))if(/^[a-f0-9]{32}$/.test(p.id)&&/^[a-f0-9]{64}$/.test(p.key))next.set(p.id,hash(p.key));phones=next;for(const [id,j]of jobs)if(!phones.has(j.phone))jobs.delete(id);return reply(200,{ok:true});}
  if(isDesktop&&req.url==='/desktop/poll'){const pending=[...jobs.values()].filter(j=>!j.delivered&&!j.response).slice(0,8);for(const j of pending)j.delivered=true;return reply(200,{jobs:pending.map(({id,phone,envelope})=>({id,phone,envelope}))});}
  const envelope=v=>v&&typeof v.iv==='string'&&v.iv.length===16&&typeof v.data==='string'&&v.data.length<=2800000;
  if(isDesktop&&req.url==='/desktop/reply'){const job=jobs.get(input.id);if(!job||job.phone!==input.phone||!envelope(input.envelope))return reply(404,{error:'Expired request.'});job.response=input.envelope;delete job.envelope;return reply(200,{ok:true});}
  if(phone&&req.url==='/phone/send'){if(!/^[a-f0-9-]{36}$/.test(input.id)||!envelope(input.envelope))return reply(400,{error:'Invalid envelope.'});if(jobs.has(input.id))return reply(409,{error:'Duplicate request.'});if([...jobs.values()].filter(j=>j.phone===phone).length>=8)return reply(429,{error:'Queue full.'});jobs.set(input.id,{id:input.id,phone,envelope:input.envelope,expires:now()+150000});return reply(200,{ok:true});}
  if(phone&&req.url==='/phone/result'){const job=jobs.get(input.id);if(!job||job.phone!==phone)return reply(404,{error:'Expired request.'});if(job.response){jobs.delete(input.id);return reply(200,{envelope:job.response});}return reply(200,{pending:true});}
  return reply(404,{error:'Not found.'});
 }catch{return reply(400,{error:'Invalid request.'});}};
}
if(require.main===module){const server=http.createServer(createRelayHandler({desktopKey:process.env.NOOK_RELAY_DESKTOP_KEY}));server.requestTimeout=10000;server.headersTimeout=12000;server.listen(Number(process.env.PORT)||45900,'127.0.0.1',()=>console.log('Nook relay listening on loopback. Configure an HTTPS reverse proxy.'));}
module.exports={createRelayHandler};
