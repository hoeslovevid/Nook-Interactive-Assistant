(() => {
  let latest={},index=0,visible=[];
  const dialog=document.createElement('dialog');dialog.className='command-dialog';dialog.setAttribute('aria-label','Search Nook');
  const head=document.createElement('div');head.className='command-head';const input=document.createElement('input');input.type='search';input.placeholder='Search sessions, models, settings…';input.setAttribute('aria-label','Search commands');const close=document.createElement('button');close.type='button';close.textContent='Esc';close.setAttribute('aria-label','Close search');head.append(input,close);
  const results=document.createElement('div');results.className='command-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','Matching commands');input.setAttribute('role','combobox');input.setAttribute('aria-controls','palette-results');input.setAttribute('aria-autocomplete','list');results.id='palette-results';const footer=document.createElement('div');footer.className='command-foot';footer.textContent='↑ ↓ to navigate · Enter to open · Esc to close';dialog.append(head,results,footer);document.body.append(dialog);
  const shell=()=>{if(typeof renderShell==='function')renderShell();};
  function commands(){
    const rows=[{title:'Open chat',detail:'Chat with your chosen AI',run:()=>window.nook.paletteCommand('chat')},{title:'Open activity notch',detail:'Sessions and waiting requests',run:()=>window.nook.paletteCommand('home')}];
    for(const [id,title] of [['home','Home dashboard'],['look','Appearance & live notch preview'],['keys','Models & connections'],['agents','Agents & usage'],['companion','Companion, voice & devices'],['performance','Performance'],['workspace','Workspace & alerts'],['shortcuts','Shortcuts'],['updates','Updates'],['week','Weekly recap']])rows.push({title,detail:'Settings',run:()=>{if(typeof showPage==='function')showPage(id);else window.nook.openApp(id);}});
    for(const s of latest.sessions||[]){rows.push({title:s.label||s.agent,detail:(s.task||'Session')+' · '+(s.cwd||''),run:()=>window.nook.paletteCommand('session:'+s.id)});rows.push({title:'Open terminal · '+(s.label||s.agent),detail:'Jump to linked terminal',run:()=>window.nook.openTerminal(s.id)});}
    for(const s of latest.services||[])rows.push({title:s.title||s.id,detail:s.detail||'Service',run:()=>window.nook.openService(s.id)});
    for(const key of latest.experience?.settings?.favorites||[]){const at=key.indexOf(':'),provider=key.slice(0,at),model=key.slice(at+1);rows.push({title:'★ '+model,detail:'Favorite model · '+provider,run:async()=>{await window.nook.saveModel({[provider]:model});window.nook.paletteCommand('provider:'+provider);}});}
    rows.push({title:'Chats & everyday tools',detail:'Conversations, prompts, focus timer, tasks, hover widgets',run:()=>{if(typeof showPage==='function')showPage('everyday');else window.nook.openApp('everyday');}});
    for(const [title,run] of [['Conversation library',()=>window.NookEverydayUI?.library()],['Saved prompts',()=>window.NookEverydayUI?.prompts()],['Compare AI models',()=>window.NookEverydayUI?.compare()],['Focus timer',()=>window.NookEverydayUI?.widget('focus')],['Small tasks',()=>window.NookEverydayUI?.widget('tasks')],['Notification inbox',()=>window.NookEverydayUI?.widget('inbox')]])rows.push({title,detail:'Everyday tools',run});
    rows.push({title:latest.prefs?.muted?'Enable sounds':'Mute sounds',detail:'Companion feedback',run:()=>window.nook.savePrefs({muted:!latest.prefs?.muted})});
    return rows;
  }
  function paint(){const query=input.value.trim().toLowerCase();visible=commands().filter(r=>(r.title+' '+r.detail).toLowerCase().includes(query)).slice(0,30);index=Math.max(0,Math.min(index,visible.length-1));results.replaceChildren();visible.forEach((row,i)=>{const b=document.createElement('button');b.type='button';b.className='command-result';b.tabIndex=-1;b.id='palette-result-'+i;b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===index));const span=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=row.title;detail.textContent=row.detail;span.append(title,detail);b.append(span);b.onclick=()=>choose(i);results.append(b);});if(!visible.length){const p=document.createElement('p');p.className='home-empty';p.textContent='No matches. Try an agent, model, or settings page.';results.append(p);}if(visible.length)input.setAttribute('aria-activedescendant','palette-result-'+index);else input.removeAttribute('aria-activedescendant');}
  function shut(){dialog.close();input.setAttribute('aria-expanded','false');shell();}
  async function choose(i){const row=visible[i];if(!row)return;shut();try{await row.run();}catch{} }
  function open(){if(!dialog.open)dialog.showModal();input.value='';index=0;input.setAttribute('aria-expanded','true');paint();input.focus();shell();}
  close.onclick=shut;dialog.addEventListener('cancel',event=>{event.preventDefault();shut();});input.oninput=()=>{index=0;paint();};
  window.addEventListener('keydown',event=>{
    if(event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='k'){event.preventDefault();event.stopImmediatePropagation();open();return;}
    if(!dialog.open)return;
    if(event.key==='Enter'&&event.target!==input)return;
    if(['ArrowDown','ArrowUp','Enter','Escape'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();if(event.key==='Escape')shut();else if(event.key==='Enter')choose(index);else {index=Math.max(0,Math.min(visible.length-1,index+(event.key==='ArrowDown'?1:-1)));paint();document.getElementById('palette-result-'+index)?.scrollIntoView({block:'nearest'});}}
  },true);
  window.nook.onState(state=>{latest=state;});window.NookPalette={open,close:shut};
  if(document.querySelector('.notch-nav')){const b=document.createElement('button');b.type='button';b.className='chrome-button';b.setAttribute('aria-label','Search Nook');b.title='Search · Ctrl+K';b.textContent='⌕';b.onclick=event=>{event.stopPropagation();open();};document.querySelector('.notch-nav').append(b);}
})();
