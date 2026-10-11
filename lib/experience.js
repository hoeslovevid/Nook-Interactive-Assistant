(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NookExperience=api;})(globalThis,()=>{
  const CARDS=['sessions','services','music','github'];
  const PROVIDERS=['chatgpt','gemini','claude','openrouter','ollama','lmstudio','deepseek','mistral','groq','xai','custom'];
  const SERVICES=['github','vercel','stripe','resend','notion','n8n','cal'];
  const cleanList=(value,allowed,max=40)=>[...new Set(Array.isArray(value)?value.filter(id=>allowed.includes(id)):[])].slice(0,max);
  function normalize(input={}) {
    const order=cleanList(input.order,CARDS);
    return {order:[...order,...CARDS.filter(id=>!order.includes(id))],hidden:cleanList(input.hidden,CARDS),pinnedServices:cleanList(input.pinnedServices,SERVICES),
      layout:input.layout==='spacious'?'spacious':'compact',batterySaver:input.batterySaver!==false,spokenReplies:Boolean(input.spokenReplies),speechVoice:typeof input.speechVoice==='string'?input.speechVoice.slice(0,120):'',speechRate:Number.isFinite(Number(input.speechRate))?Math.min(3,Math.max(-3,Math.round(Number(input.speechRate)))):0,
      favorites:cleanModels(input.favorites),recents:cleanModels(input.recents)};
  }
  function cleanModels(value) { return [...new Set(Array.isArray(value)?value.filter(id=>typeof id==='string'&&PROVIDERS.includes(id.split(':')[0])&&/^[a-z]+:[A-Za-z0-9._:/-]{1,80}$/.test(id)):[])].slice(0,40); }
  function modelSort(ids,provider,prefs) {const p=normalize(prefs),score=id=>p.favorites.includes(provider+':'+id)?0:p.recents.includes(provider+':'+id)?1:2;return [...ids].sort((a,b)=>score(a)-score(b)||a.localeCompare(b,undefined,{numeric:true}));}
  function serviceSort(items,prefs){const pins=normalize(prefs).pinnedServices;return [...items].sort((a,b)=>(pins.includes(a.id)?0:1)-(pins.includes(b.id)?0:1));}
  function profileSettings(state) {
    const p=state.prefs||{},w=state.workspace?.settings||{};
    return {look:state.look,models:Object.fromEntries(Object.entries(state.models||{}).filter(([id])=>!id.endsWith('Url'))),experience:normalize(state.experience?.settings),prefs:{mainTool:p.mainTool,pills:p.pills,muted:p.muted,openOnHover:p.openOnHover,showClaudeUsage:p.showClaudeUsage,showCodexUsage:p.showCodexUsage},alerts:{notifications:w.notifications,quietHours:w.quietHours,quietStart:w.quietStart,quietEnd:w.quietEnd,mutedAgents:w.mutedAgents}};
  }
  return {CARDS,SERVICES,normalize,modelSort,serviceSort,profileSettings};
});
