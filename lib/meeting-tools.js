function transcriptRows(entry){
 const speakers=entry.speakers||{},source=entry.speakerTurns?.length?entry.speakerTurns:(entry.segments||[]).map((s,i,rows)=>({start:s.seconds,end:rows[i+1]?.seconds||s.seconds+6,text:s.text,speaker:'unknown'}));
 return source.filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start>=0&&s.end>s.start&&typeof s.text==='string').map(s=>({...s,name:speakers[s.speaker]||'',text:s.text.replace(/\r/g,'').slice(0,10000)})).slice(0,1000);
}
function timestamp(seconds,vtt=false){const ms=Math.max(0,Math.round(seconds*1000)),pad=(n,d=2)=>String(n).padStart(d,'0');return pad(Math.floor(ms/3600000))+':'+pad(Math.floor(ms/60000)%60)+':'+pad(Math.floor(ms/1000)%60)+(vtt?'.':',')+pad(ms%1000,3);}
function subtitles(entry,format){if(!['srt','vtt'].includes(format))throw new Error('Choose SRT or WebVTT.');const rows=transcriptRows(entry);if(!rows.length)throw new Error('These notes have no recorded timing.');return (format==='vtt'?'WEBVTT\n\n':'')+rows.map((s,i)=>(format==='srt'?i+1+'\n':'')+timestamp(s.start,format==='vtt')+' --> '+timestamp(s.end,format==='vtt')+'\n'+(s.name?s.name+': ':'')+s.text.replace(/-->/g,'→').replace(/\n\s*\n/g,'\n')).join('\n\n')+'\n';}
function tasks(value){return (Array.isArray(value)?value:[]).slice(0,20).map(v=>{if(!v||typeof v.title!=='string'||!v.title.trim()||v.title.length>200)throw new Error('Review each task title, up to 200 characters.');const due=typeof v.due==='string'?v.due:'';if(due&&(!/^\d{4}-\d{2}-\d{2}$/.test(due)||new Date(due+'T12:00:00Z').toISOString().slice(0,10)!==due))throw new Error('Use a valid YYYY-MM-DD due date.');return {title:v.title.trim(),owner:typeof v.owner==='string'?v.owner.trim().slice(0,80):'',due};});}
function correction(before,after){
 if(typeof before!=='string'||typeof after!=='string'||before===after)return null;const a=before.trim().split(/\s+/),b=after.trim().split(/\s+/);let start=0;while(start<a.length&&start<b.length&&a[start]===b[start])start++;let endA=a.length,endB=b.length;while(endA>start&&endB>start&&a[endA-1]===b[endB-1]){endA--;endB--;}
 const from=a.slice(start,endA).join(' '),to=b.slice(start,endB).join(' ');return from&&to&&from.length<=100&&to.length<=200&&endA-start<=6&&endB-start<=6?{from,to}:null;
}
module.exports={transcriptRows,timestamp,subtitles,tasks,correction};
