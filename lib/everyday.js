(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NookEveryday=factory();})(globalThis,()=>{
  const WIDGETS=['focus','tasks','inbox','sessions','music','services','prompts'];
  const PROVIDERS=['chatgpt','gemini','claude','openrouter','deepseek','mistral','groq','xai','ollama','lmstudio','custom','nook','qwen','moonshot'];
  const text=(value,max=120)=>typeof value==='string'?value.trim().slice(0,max):'';
  const number=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
  function normalize(input={}){
    if(!input||typeof input!=='object')input={};
    return {saveChats:Boolean(input.saveChats),retention:[7,30,90].includes(input.retention)?input.retention:30,
      hoverDashboard:input.hoverDashboard!==false,actionFirst:input.actionFirst!==false,widgets:[...new Set(Array.isArray(input.widgets)?input.widgets.filter(id=>WIDGETS.includes(id)):['focus','tasks','inbox','sessions','music','services'])],
      personality:['calm','playful','focused'].includes(input.personality)?input.personality:'playful',intensity:number(input.intensity,0,1.5,1),speed:number(input.speed,.5,1.5,1),movement:number(input.movement,0,2,1),
      hideFullscreen:Boolean(input.hideFullscreen),paused:Boolean(input.paused)};
  }
  function command(value){const input=text(value,200).toLowerCase().replace(/[.!?]+$/,'').replace(/^(?:nook[, ]+|please )/,'');
    if(/^(show|open)( my| the)? (pending requests|approvals)$/.test(input))return {action:'requests',label:'Show pending requests'};
    if(/^(show|open)( my| the)? chat$/.test(input))return {action:'chat',label:'Open chat'};
    if(/^(show|open)( my| the)? (notifications|inbox)$/.test(input))return {action:'inbox',label:'Open notification inbox'};
    if(/^(show|open)( my| the)? (tasks|task list)$/.test(input))return {action:'tasks',label:'Open tasks'};
    if(/^(start|begin)( a)? (focus timer|focus session|pomodoro)$/.test(input))return {action:'focus-start',label:'Start a 25-minute focus session'};
    if(/^(pause|resume|stop)( the| my)? (focus timer|focus session|timer)$/.test(input)){const verb=input.split(' ')[0];return {action:'focus-'+verb,label:verb[0].toUpperCase()+verb.slice(1)+' focus timer'};}
    if(/^mute( nook| sounds)?$/.test(input))return {action:'mute',label:'Mute Nook'};
    if(/^unmute( nook| sounds)?$/.test(input))return {action:'unmute',label:'Unmute Nook'};
    return null;
  }
  function estimate(files=[]){const chars=files.reduce((sum,f)=>sum+(f.text||'').length,0);return {count:files.length,chars,textTokens:Math.ceil(chars/4),images:files.filter(f=>f.image).length};}
  function clock(seconds){const s=Math.max(0,Math.ceil(seconds));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function normalizeLayout(value={}){return {width:Math.round(number(value.width,520,820,620)),offset:Math.round(number(value.offset,-2000,2000,0)),widgets:[...new Set(Array.isArray(value.widgets)?value.widgets.filter(id=>WIDGETS.includes(id)):WIDGETS)]};}
  return {WIDGETS,PROVIDERS,text,normalize,command,estimate,clock,normalizeLayout};
});
