// Local-only data helpers. No credentials, automatic uploads, or executable packs.
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {normalizeLook}=require('./appearance'),{normalize:normalizeExperience,profileSettings}=require('./experience'),{normalize:normalizeStudio,PROVIDERS}=require('./studio');
const clone=value=>JSON.parse(JSON.stringify(value));
const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
function usageFrom(payload){
 const u=payload?.usage||payload?.message?.usage||payload?.usageMetadata;
 const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
 if(u)return {input:count(u.input_tokens??u.prompt_tokens??u.promptTokenCount),output:count(u.output_tokens??u.completion_tokens??u.candidatesTokenCount),cached:count(u.cache_read_input_tokens??u.prompt_tokens_details?.cached_tokens??u.cachedContentTokenCount)};
 if(Number.isSafeInteger(payload?.prompt_eval_count)||Number.isSafeInteger(payload?.eval_count))return {input:count(payload.prompt_eval_count),output:count(payload.eval_count),cached:null};
 return null;
}
function price(value){const n=Number(value);return value!==''&&value!=null&&Number.isFinite(n)&&n>=0&&n<=10000?n:null;}
function estimate(row,rates){const rate=rates?.[row.provider+':'+row.model];if(!rate||row.input==null||row.output==null||rate.input==null||rate.output==null)return null;return (row.input*rate.input+row.output*rate.output)/1000000;}
function usageSummary(rows,rates={},budget=0,now=Date.now()){
 const month=new Date(now).toISOString().slice(0,7),selected=rows.filter(r=>new Date(r.time).toISOString().slice(0,7)===month);
 const costs=selected.map(r=>estimate(r,rates)),known=costs.filter(n=>n!==null),total=known.reduce((a,b)=>a+b,0);
 return {month,requests:selected.length,failures:selected.filter(r=>!r.ok).length,latency:selected.length?Math.round(selected.reduce((n,r)=>n+r.ms,0)/selected.length):0,input:selected.reduce((n,r)=>n+(r.input||0),0),output:selected.reduce((n,r)=>n+(r.output||0),0),unknownUsage:selected.filter(r=>r.input==null||r.output==null).length,estimatedCost:known.length?total:null,unpriced:costs.filter(n=>n===null).length,budget,budgetReached:budget>0&&total>=budget};
}
function cleanRecovery(value){
 if(!value||!['draft','reply','voice'].includes(value.kind))throw new Error('Choose a recoverable draft.');
 const provider=PROVIDERS.includes(value.provider)?value.provider:'';
 const content=text(value.text,value.kind==='draft'?2000:120000);
 return {id:value.kind+':'+(value.kind==='voice'?'current':provider),kind:value.kind,provider,text:content,time:Date.now(),title:text(value.title,100)};
}
function createLibraryStore({directory,encrypt,decrypt}){
 const file=path.join(directory,'library.json'),journal=path.join(directory,'library-journal.json');let data={version:1,recoveryEnabled:false,documents:[],projects:[],recoveries:[],usage:[],rates:{},budget:0},error='';
 const sourceKeys=['documents','projects'],journalKeys=['recoveryEnabled','recoveries','usage','rates','budget'];
 const subset=keys=>Object.fromEntries(keys.map(key=>[key,data[key]]));
 const validDoc=d=>d&&typeof d.id==='string'&&typeof d.name==='string'&&Array.isArray(d.pages)&&d.pages.length<=2000&&d.pages.every(p=>p&&Number.isSafeInteger(p.number)&&typeof p.text==='string'&&p.text.length<=250000&&typeof p.label==='string');
 try{
  for(const current of [file,journal])if(fs.existsSync(current)){
   if(fs.statSync(current).size>24000000)throw new Error();const raw=JSON.parse(fs.readFileSync(current,'utf8'));if(raw.version!==1||typeof raw.encrypted!=='string')throw new Error();const saved=JSON.parse(decrypt(raw.encrypted));if(!saved||typeof saved!=='object'||Array.isArray(saved))throw new Error();
   for(const key of current===journal?journalKeys:[...sourceKeys,...journalKeys])if(Object.hasOwn(saved,key))data[key]=saved[key];
  }
  if(!Array.isArray(data.documents)||!Array.isArray(data.projects)||!Array.isArray(data.recoveries)||!Array.isArray(data.usage)||data.documents.length>60||data.projects.length>8||data.recoveries.length>30||data.usage.length>2000||!data.documents.every(validDoc)||!data.projects.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.root==='string'&&Array.isArray(p.documents)&&p.documents.length<=160&&p.documents.every(validDoc))||!data.recoveries.every(r=>r&&typeof r.id==='string'&&['draft','reply','voice'].includes(r.kind)&&typeof r.text==='string'&&r.text.length<=120000&&Number.isFinite(r.time))||!data.usage.every(r=>r&&Number.isFinite(new Date(r.time).getTime())&&Number.isFinite(r.ms)&&PROVIDERS.includes(r.provider)&&typeof r.model==='string')||!data.rates||typeof data.rates!=='object'||Array.isArray(data.rates)||JSON.stringify(data).length>16000000)throw new Error();
 }catch(e){data={version:1,recoveryEnabled:false,documents:[],projects:[],recoveries:[],usage:[],rates:{},budget:0};error='The encrypted library could not be read. Your files have been preserved. Reset the library explicitly in Library & tools to start again.';}
 function write(target,value){const encrypted=encrypt(JSON.stringify({version:1,...value}));fs.writeFileSync(target+'.tmp',JSON.stringify({version:1,encrypted}),'utf8');fs.renameSync(target+'.tmp',target);}
 // Draft keystrokes and request metrics must never serialize a multi-megabyte
 // project index. The small recovery journal has its own encrypted atomic file.
 function mutate(fn,area='journal'){
  if(error)throw new Error(error);const keys=area==='sources'?sourceKeys:area==='all'?[...sourceKeys,...journalKeys]:journalKeys,before=clone(subset(keys));
  try{fn();if(Buffer.byteLength(JSON.stringify(subset(keys)))>(area==='journal'?4000000:16000000))throw new Error('The local library is full. Remove documents or projects first.');fs.mkdirSync(directory,{recursive:true});if(area!=='journal')write(file,subset(sourceKeys));if(area!=='sources')write(journal,subset(journalKeys));}catch(e){Object.assign(data,before);throw e;}
 }
 return {
  snapshot(){return {error,recoveryEnabled:data.recoveryEnabled,documents:data.documents.map(({pages,...d})=>({...d,pages:pages.length,characters:pages.reduce((n,p)=>n+p.text.length,0)})),projects:data.projects.map(({documents,...p})=>({...p,files:documents.length,characters:documents.reduce((n,d)=>n+d.pages.reduce((s,p)=>s+p.text.length,0),0)})),recoveries:data.recoveries.map(({text,...r})=>({...r,characters:text.length})),usage:usageSummary(data.usage,data.rates,data.budget),rates:clone(data.rates),budget:data.budget,recentUsage:clone(data.usage.slice(-60).reverse())};},
  saveDocument(doc){const row={id:randomUUID(),name:text(doc.name,180),kind:doc.kind,pages:doc.pages,time:Date.now()};mutate(()=>{if(data.documents.length>=60)throw new Error('Keep up to 60 imported documents.');data.documents.unshift(row);},'sources');return clone(row);},
  document(id){const d=data.documents.find(d=>d.id===id);if(!d)throw new Error('This document is unavailable.');return clone(d);},
  removeDocument(id){mutate(()=>data.documents=data.documents.filter(d=>d.id!==id),'sources');},
  project(id){const p=data.projects.find(p=>p.id===id);if(!p)throw new Error('This project is unavailable.');return clone(p);},
  saveProject(project,id){const row={...project,id:id||randomUUID(),time:Date.now()};mutate(()=>{if(!id&&data.projects.length>=8)throw new Error('Keep up to eight project libraries.');data.projects=[row,...data.projects.filter(p=>p.id!==row.id)];},'sources');return clone(row);},
  removeProject(id){mutate(()=>data.projects=data.projects.filter(p=>p.id!==id),'sources');},
  searchEntries(){return clone([...data.documents,...data.projects.flatMap(p=>p.documents.map(d=>({...d,id:p.id+':'+d.id,name:p.name+'/'+d.name})))]);},
  search(query,ids){const docs=[...data.documents,...data.projects.filter(p=>!ids?.length||ids.includes(p.id)).flatMap(p=>p.documents.map(d=>({...d,name:p.name+'/'+d.name})))];return retrieve(query,docs.filter(d=>!ids?.length||ids.includes(d.id)||!data.documents.includes(d)));},
  enableRecovery(value){mutate(()=>{data.recoveryEnabled=value===true;if(!data.recoveryEnabled)data.recoveries=[];});},
  recover(value){if(!data.recoveryEnabled)return;const row=cleanRecovery(value);mutate(()=>{data.recoveries=data.recoveries.filter(r=>r.id!==row.id);if(row.text.trim())data.recoveries.unshift(row);data.recoveries=data.recoveries.slice(0,26);});},
  recovery(id){const row=data.recoveries.find(r=>r.id===id);if(!row)throw new Error('This recovery is unavailable.');return clone(row);},
  discard(id){mutate(()=>data.recoveries=data.recoveries.filter(r=>r.id!==id));},
  usage(row){mutate(()=>{data.usage.push({provider:PROVIDERS.includes(row.provider)?row.provider:'custom',model:text(row.model,100),time:Date.now(),ms:Math.min(600000,Math.max(0,Math.round(row.ms)||0)),ok:row.ok===true,input:row.input??null,output:row.output??null,cached:row.cached??null});data.usage=data.usage.slice(-2000);});},
  rates(value){mutate(()=>{if(!value||!PROVIDERS.includes(value.provider)||!/^[A-Za-z0-9._:/-]{1,80}$/.test(value.model||''))throw new Error('Choose a provider and model.');const input=price(value.input),output=price(value.output);if(input===null&&output===null)delete data.rates[value.provider+':'+value.model];else data.rates[value.provider+':'+value.model]={input,output,updated:Date.now()};if(Object.keys(data.rates).length>100)throw new Error('Keep up to 100 custom prices.');});},
  budget(value){mutate(()=>data.budget=Math.max(0,Math.min(100000,Number(value)||0)));},
  clearUsage(){mutate(()=>data.usage=[]);},
  reset(){const old=error;error='';try{mutate(()=>{data.documents=[];data.projects=[];data.recoveries=[];data.usage=[];data.rates={};data.budget=0;data.recoveryEnabled=false;},'all');}catch(e){error=old;throw e;}}
 };
}
function words(value){return [...new Set(String(value).toLocaleLowerCase().match(/[\p{L}\p{N}_]{2,}/gu)||[])].slice(0,40);}
function retrieve(query,documents){
 const terms=words(query);if(!terms.length)throw new Error('Enter at least one word with two characters.');const result=[];
 for(const doc of documents)for(const page of doc.pages||[]){const chunks=page.text.match(/[\s\S]{1,1800}/g)||[];chunks.forEach((chunk,index)=>{const lower=chunk.toLocaleLowerCase();const score=terms.reduce((n,term)=>n+(lower.includes(term)?1:0),0);if(score)result.push({documentId:doc.id,source:doc.name,page:page.number,label:page.label||'Page '+page.number,chunk:index+1,text:chunk,score});});}
 return result.sort((a,b)=>b.score-a.score||a.source.localeCompare(b.source)||a.page-b.page||a.chunk-b.chunk).slice(0,8);
}
function reviewedExcerpt(rows){if(!Array.isArray(rows)||!rows.length||rows.length>8)throw new Error('Select up to eight source excerpts.');return rows.map(r=>'['+r.source+' · '+r.label+' · excerpt '+r.chunk+']\n'+r.text).join('\n\n').slice(0,18000);}
function portable(state,kind='theme'){
 const profile=profileSettings(state),studio=normalizeStudio(state.studio?.settings);
 const experience=normalizeExperience(state.experience?.settings),visualExperience=Object.fromEntries(['order','hidden','pinnedServices','layout'].map(k=>[k,experience[k]]));
 const layout={widgetOrder:studio.widgetOrder,widgetSizes:studio.widgetSizes,notchStyle:studio.notchStyle};
 return {format:'nook-'+kind,version:1,name:kind==='theme'?'My Nook theme':'Nook settings backup',created:new Date().toISOString(),look:normalizeLook(state.look),experience:kind==='theme'?visualExperience:experience,layout,...(kind==='settings'?{profile}:{})};
}
function parsePortable(input){
 if(!input||typeof input!=='object'||!['nook-theme','nook-settings'].includes(input.format)||input.version!==1||!input.look||typeof input.look!=='object')throw new Error('Choose a version 1 Nook theme or settings file.');
 const base=portable({look:input.look,experience:{settings:input.experience},studio:{settings:input.layout}},input.format==='nook-theme'?'theme':'settings');base.name=text(input.name,80)||base.name;
 if(input.format==='nook-settings'){
  const p=input.profile||{},prefs=p.prefs||{},alerts=p.alerts||{};
  base.profile={look:base.look,experience:base.experience,models:Object.fromEntries(Object.entries(p.models||{}).filter(([id,value])=>PROVIDERS.includes(id)&&typeof value==='string'&&/^[A-Za-z0-9._:/-]{1,80}$/.test(value))),prefs:Object.fromEntries(['muted','openOnHover','showClaudeUsage','showCodexUsage'].filter(k=>typeof prefs[k]==='boolean').map(k=>[k,prefs[k]])),alerts:Object.fromEntries(['notifications','quietHours'].filter(k=>typeof alerts[k]==='boolean').map(k=>[k,alerts[k]]))};
 }
 return base;
}
function diagnostics(state,version){return {format:'nook-diagnostics',version:1,created:new Date().toISOString(),appVersion:version,platform:process.platform,architecture:process.arch,look:{theme:state.look?.theme,motion:state.effectiveMotion||state.look?.motion},runtime:{battery:Boolean(state.runtime?.battery),economy:Boolean(state.runtime?.economy)},connections:Object.fromEntries(PROVIDERS.map(id=>[id,{configured:Boolean(state.keys?.[id]),status:['ok','error','checking'].includes(state.connections?.[id]?.status)?state.connections[id].status:'unknown'}])),counts:{messages:state.messages?.length||0,sessions:state.sessions?.length||0,documents:state.library?.documents?.length||0,projects:state.library?.projects?.length||0},voice:{engine:state.flow?.settings?.engine,shortcutReady:Boolean(state.flow?.shortcutReady)},excluded:'No keys, tokens, server addresses, filenames, paths, prompts, transcripts, or request error text.'};}
function emailDraft(value){
 const header=(v,n)=>{if(/[\r\n]/.test(String(v||'')))throw new Error('Email headers cannot contain line breaks.');return text(v,n);};
 const recipients=header(value.to,1000).split(/[;,]/).map(v=>v.trim()).filter(Boolean);if(!recipients.length||recipients.length>20||recipients.some(v=>v.length>254||!/^[-\w.!#$%&'*+/=?^`{|}~]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v)))throw new Error('Enter valid recipient email addresses.');
 const subject=header(value.subject,200),body=text(value.body,50000);if(!subject.trim()||!body.trim())throw new Error('Enter an email subject and message.');return {to:recipients.join(', '),subject,body};
}
function emailFile(value,files=[]){
 const draft=emailDraft(value),boundary='nook-'+randomUUID(),base64=v=>(v.match(/.{1,76}/g)||[]).join('\r\n');
 function encodedHeader(input){const chunks=[];let part='';for(const char of input){if(Buffer.byteLength(part+char)>42){chunks.push(part);part='';}part+=char;}if(part)chunks.push(part);return chunks.map(p=>'=?UTF-8?B?'+Buffer.from(p).toString('base64')+'?=').join('\r\n ');}
 const lines=['X-Unsent: 1','To: '+draft.to.split(', ').join(',\r\n '),'Subject: '+encodedHeader(draft.subject),'MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=utf-8','Content-Transfer-Encoding: base64','',base64(Buffer.from(draft.body).toString('base64'))];
 for(const file of files){const name=String(file.name).slice(0,180),fallback=name.replace(/[^\x20-\x7e]|["\\]/g,'_'),encoded=encodeURIComponent(name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()),parts=encoded.match(/(?:%[\dA-F]{2}|.){1,24}/g)||['attachment'];lines.push('--'+boundary,'Content-Type: application/octet-stream','Content-Disposition: attachment;',' filename="'+fallback+'";');parts.forEach((part,i)=>lines.push(' filename*'+i+'*='+(i===0?"UTF-8''":'')+part+(i<parts.length-1?';':'')));lines.push('Content-Transfer-Encoding: base64','',base64(file.bytes));}
 lines.push('--'+boundary+'--','');return lines.join('\r\n');
}
function calendarDraft(value){
 const title=text(value.title,200).trim(),start=new Date(value.start),end=new Date(value.end);if(!title||!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start||end-start>31*86400000)throw new Error('Enter a title and an end time after the start (up to 31 days).');
 const zone=text(value.timeZone,80);try{new Intl.DateTimeFormat('en',{timeZone:zone}).format(start);}catch{throw new Error('Choose a valid time zone.');}
 return {title,start:start.toISOString(),end:end.toISOString(),timeZone:zone,location:text(value.location,500),description:text(value.description,10000)};
}
function calendarFile(input){const value=calendarDraft(input),escape=v=>v.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'),utc=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nook//Reviewed calendar draft//EN','BEGIN:VEVENT','UID:'+randomUUID()+'@nook.local','DTSTAMP:'+utc(Date.now()),'DTSTART:'+utc(value.start),'DTEND:'+utc(value.end),'SUMMARY:'+escape(value.title),'LOCATION:'+escape(value.location),'DESCRIPTION:'+escape(value.description+'\nReviewed time zone: '+value.timeZone),'END:VEVENT','END:VCALENDAR'];return lines.map(line=>{let out='',count=0;for(const char of line){const n=Buffer.byteLength(char);if(count+n>73){out+='\r\n ';count=1;}out+=char;count+=n;}return out;}).join('\r\n')+'\r\n';}
module.exports={createLibraryStore,usageFrom,usageSummary,estimate,retrieve,reviewedExcerpt,portable,parsePortable,diagnostics,emailDraft,emailFile,calendarDraft,calendarFile,cleanRecovery};
