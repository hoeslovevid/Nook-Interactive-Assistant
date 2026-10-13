const {randomUUID}=require('node:crypto');
const {recentMessages}=require('./chat-memory');
const {buildContext}=require('./studio');
function createChatSession({messages,complete,getSettings,onChange=()=>{},onSent=()=>{},onDone=()=>{},attachmentBudget=32*1024*1024,now=Date.now}) {
  const active=new Map(),attachments=new Map(),cooldowns=new Map();
  const history=provider=>messages.filter(m=>m.provider===provider);
  const busy=provider=>active.has(provider);
  const notify=(callback,...args)=>{try{callback(...args);}catch{}};
  const ensure=()=>{for(const m of messages)if(!m.id)m.id=randomUUID();};
  async function send(provider,text,{action='send',messageId,attachment}={}) {
    if(busy(provider))return {ok:false,error:'This model is still responding.'};
    const cooldown=cooldowns.get(provider);
    if(cooldown?.retryAt>now())return {ok:false,error:`Wait ${Math.ceil((cooldown.retryAt-now())/1000)} seconds before retrying this provider.`,failure:{...cooldown}};
    cooldowns.delete(provider);
    ensure();let requestText=String(text||'').trim();let source;
    if(action!=='send') {
      const rows=history(provider);source=action==='edit'?rows.find(m=>m.id===messageId&&m.role==='user'):rows.findLast(m=>m.role==='user');
      if(!source)return {ok:false,error:'There is no message to retry.'};
      requestText=action==='edit'?requestText:source.prompt||source.content;
      attachment=attachments.get(source.id);
      if(source.hasAttachment&&!attachment)return {ok:false,error:'This attachment is no longer in memory. Reattach it and send a new message.'};
    }
    if(!requestText||requestText.length>2000)return {ok:false,error:'Enter a message of up to 2,000 characters.'};
    // Validate access before removing any existing turns.
    let settings;try{settings=getSettings(provider);}catch(error){return {ok:false,error:error.message};}
    if(source){const at=messages.indexOf(source);for(const row of messages.slice(at).filter(m=>m.provider===provider))attachments.delete(row.id);messages.splice(0,messages.length,...messages.filter((m,i)=>m.provider!==provider||i<at));}
    const user={id:randomUUID(),role:'user',provider,prompt:requestText,hasAttachment:Boolean(attachment),content:attachment?requestText+'\n\n['+attachment.name+' attached]':requestText};
    const reply={id:randomUUID(),role:'assistant',provider,content:'',status:'streaming'};
    messages.push(user,reply);messages.splice(0,messages.length,...recentMessages(messages,200));
    if(attachment)attachments.set(user.id,attachment);
    // Named conversations can leave the active transcript and return later.
    // Keep their context within the same shared budget until eviction or deletion.
    while(attachments.size>200)attachments.delete(attachments.keys().next().value);
    const weight=value=>(value?.files||[value]).reduce((sum,file)=>sum+String(file?.text||'').length*2+String(file?.image||'').length*2,0);
    let retained=[...attachments.values()].reduce((sum,value)=>sum+weight(value),0);
    for(const [id,value] of attachments){if(retained<=attachmentBudget)break;retained-=weight(value);attachments.delete(id);}
    const controller=new AbortController();active.set(provider,controller);let last=0;
    try {
      // Optional recent-model bookkeeping must not block a valid conversation.
      notify(onSent,provider,settings.model);
      notify(onChange);
      const context=buildContext(history(provider).filter(m=>m!==reply),settings.context||{});
      const result=await complete(provider,settings.key,context.messages,{...settings,system:context.system,attachment},delta=>{reply.content=delta;const now=Date.now();if(now-last>80){last=now;notify(onChange);}},{signal:controller.signal});
      if(controller.signal.aborted)throw new Error('Generation stopped.');
      reply.content=result;reply.status='complete';notify(onDone,reply);return {ok:true};
    }catch(error){reply.status=controller.signal.aborted?'stopped':'error';if(reply.status==='error'){reply.error=error.message;if(error.details){reply.failure={...error.details};if(reply.failure.retryAt>now())cooldowns.set(provider,reply.failure);}}return {ok:reply.status==='stopped',stopped:reply.status==='stopped',error:reply.error,...(reply.failure?{failure:reply.failure}:{})};}
    finally{active.delete(provider);notify(onChange);}
  }
  return {send,busy,busyProviders:()=>[...active.keys()],forget(ids){if(!ids){attachments.clear();return;}for(const id of ids)attachments.delete(id);},stop(provider){const controller=active.get(provider);if(!controller)return {ok:false,error:'Nothing is generating.'};controller.abort();return {ok:true};},dispose(){for(const c of active.values())c.abort();attachments.clear();},ensure};
}
module.exports={createChatSession};
