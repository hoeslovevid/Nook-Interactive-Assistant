const text=v=>String(v||''),snippet=(value,q)=>{const s=text(value).replace(/\s+/g,' '),at=s.toLocaleLowerCase().indexOf(q);return s.slice(Math.max(0,at-45),Math.max(0,at-45)+180);};
function search(query,{chats=[],documents=[],memories=[],sessions=[],spaces=[],reminders=[]}={}){
 const q=text(query).trim().toLocaleLowerCase().slice(0,150);if(q.length<2)return [];const rows=[];
 function add(kind,id,title,body){if(rows.filter(r=>r.kind===kind).length>=20)return;const name=text(title).slice(0,120),copy=text(body);if((name+' '+copy).toLocaleLowerCase().includes(q))rows.push({kind,id,title:name,detail:snippet(copy||name,q),rank:name.toLocaleLowerCase().startsWith(q)?3:name.toLocaleLowerCase().includes(q)?2:1});}
 for(const c of chats)add('chat',c.id,c.name,c.messages.map(m=>m.content).join('\n').slice(0,200000));
 for(const d of documents)add('document',d.id,d.name,d.pages.map(p=>p.text).join('\n').slice(0,200000));
 for(const m of memories)add('memory',m.id,'Approved memory',m.text);
 for(const s of sessions)add('session',s.id,s.label||s.agent,[s.task,s.cwd,s.final].filter(Boolean).join(' '));
 for(const s of spaces)add('space',s.id,s.name,'Project space');
 for(const r of reminders)add('reminder',r.id,r.title,'Local reminder');
 return rows.sort((a,b)=>b.rank-a.rank||a.title.localeCompare(b.title)).slice(0,30).map(({rank,...r})=>r);
}
module.exports={search};
