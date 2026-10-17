(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NookActivityQueue=api;})(globalThis,()=>{
 function items(state={},now=Date.now()){
  const out=[];if(state.pending)out.push({id:'approval:'+state.pending.id,type:'approval',priority:100,title:state.pending.title||'Review request',detail:'Your decision is needed',card:'session'});
  for(const s of (state.sessions||[]).filter(s=>!s.finished).slice(0,6))out.push({id:'session:'+s.id,type:'agent',priority:60,title:s.label||s.agent||'Agent working',detail:String(s.task||s.title||'Work in progress').slice(0,120),card:'session',session:s.id});
  for(const n of (state.everyday?.inbox||[]).filter(n=>!n.read&&!n.dismissed&&now-(n.time||n.created||now)<3600000).slice(0,5))out.push({id:'notice:'+n.id,type:'complete',priority:70,title:n.title||'Task complete',detail:'Ready to review',card:'widgets'});
  const f=state.everyday?.focus;if(f?.running)out.push({id:'focus',type:'timer',priority:30,title:f.phase==='break'?'Take a break':'Focus time',detail:Math.ceil((f.remaining||0)/60)+' minutes remaining',card:'widgets'});
  const music=state.features?.media||state.features?.music||state.studio?.spotify?.playback;if(music?.title)out.push({id:'music',type:'music',priority:20,title:music.title,detail:music.artist||'Now playing',card:'widgets'});
  return out.sort((a,b)=>b.priority-a.priority);
 }
 function create(){let selected='',lastMove=0;return {update(rows,now=Date.now(),held=false){if(!rows.length){selected='';return null;}const prior=rows.find(r=>r.id===selected);if(rows[0].type==='approval')selected=rows[0].id;else if(!prior)selected=rows[0].id;else if(!held&&now-lastMove>15000&&rows[0].priority>prior.priority)selected=rows[0].id;return rows.find(r=>r.id===selected);},move(rows,step,now=Date.now()){if(!rows.length)return null;const at=Math.max(0,rows.findIndex(r=>r.id===selected));selected=rows[(at+step+rows.length)%rows.length].id;lastMove=now;return rows.find(r=>r.id===selected);}};}
 return {items,create};
});
