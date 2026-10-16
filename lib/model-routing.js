const {PROVIDERS}=require('./studio');
function choose(mode,{models={},keys={},roles={},health={},lock=''}={}){
 if(!['local','fast','images','default'].includes(mode))throw new Error('Choose a model preference.');
 const allowed=p=>PROVIDERS.includes(p)&&(!lock||p===lock)&&Boolean(keys[p]||['ollama','lmstudio','custom'].includes(p));
 const configured=PROVIDERS.filter(p=>allowed(p)&&typeof models[p]==='string'&&models[p]);let selected,reason;
 if(mode==='local'){const provider=configured.find(p=>['ollama','lmstudio'].includes(p));if(provider){selected={provider,model:models[provider]};reason='A configured local provider. Verify that its server is running before sending.';}}
 if(mode==='fast'){if(roles.quick&&allowed(roles.quick.provider)){selected=roles.quick;reason='Your explicitly assigned Fast answers model.';}else{const provider=configured.filter(p=>Number.isFinite(health[p]?.latency)&&health[p].model===models[p]).sort((a,b)=>health[a].latency-health[b].latency)[0];if(provider){selected={provider,model:models[provider]};reason='Lowest latency in your recorded connection tests; this is not a guarantee of future speed.';}}}
 if(mode==='images'){const candidates=[roles.images,...configured.map(provider=>({provider,model:models[provider]}))].filter(Boolean);selected=candidates.find(v=>allowed(v.provider)&&health[v.provider]?.details?.[v.model]?.vision===true);if(selected)reason='Your provider explicitly reports image input for this model.';}
 if(mode==='default'){const provider=configured[0];if(provider){selected={provider,model:models[provider]};reason='A configured model'+(lock?' within your locked provider.':'.');}}
 if(!selected)throw new Error(mode==='images'?'Browse provider models first so Nook can verify image support.':mode==='fast'?'Assign a Fast answers role or run a connection test first.':lock?'No matching model is available within your locked provider.':'Configure a matching AI connection first.');
 return {...selected,mode,reason,locked:Boolean(lock)};
}
module.exports={choose};
