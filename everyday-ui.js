(() => {
  const $=id=>document.getElementById(id),appMode=Boolean($('everyday-app')),detached=new URLSearchParams(location.search).has('detached');
  let latest={},dialogType='',dialogPaint=null,dashboardKey='',voiceCommands=false,attachmentKey='';
  const E=window.NookEveryday;
  const node=(tag,copy,cls)=>{const n=document.createElement(tag);if(copy)n.textContent=copy;if(cls)n.className=cls;return n;};
  const button=(copy,run,cls='everyday-button')=>{const n=node('button',copy,cls);n.type='button';n.onclick=run;return n;};
  const input=(placeholder,max=120)=>{const n=node('input');n.placeholder=placeholder;n.setAttribute('aria-label',placeholder);n.maxLength=max;return n;};
  const label=(copy,field)=>{const n=node('label',null,'everyday-label');n.append(node('span',copy),field);return n;};
  const stack=(...children)=>{const n=node('div',null,'everyday-stack');n.append(...children);return n;};
  const row=(...children)=>{const n=node('div',null,'everyday-row');n.append(...children);return n;};
  const section=(title,...children)=>{const n=node('section',null,'everyday-surface');n.append(node('h2',title),...children);return n;};
  const shell=()=>{if(typeof renderShell==='function')renderShell();};
  const notice=node('p',null,'everyday-note');notice.setAttribute('role','status');
  async function act(action,value){try{const result=await window.nook.everyday(action,value);if(!result.ok&&!result.cancelled)throw new Error(result.error||'Could not complete that action.');notice.textContent=result.cancelled?'':result.ok?'':result.error;return result;}catch(error){notice.textContent=error.message;return {ok:false,error:error.message};}}
  const dialog=node('dialog',null,'everyday-dialog');dialog.setAttribute('aria-label','Nook tools');const dialogTitle=node('h2'),dialogBody=node('div',null,'everyday-dialog-body');dialog.append(row(dialogTitle,button('Close',()=>dialog.close())),dialogBody,notice);document.body.append(dialog);dialog.addEventListener('close',()=>{dialogPaint=null;shell();});
  function modal(type,title,build){if(dialog.open)dialog.close();dialogType=type;dialogTitle.textContent=title;dialogBody.replaceChildren();notice.textContent='';build(dialogBody);dialog.showModal();shell();}
  function openChat(provider){if(appMode)window.nook.paletteCommand('provider:'+provider);else{window.NookChatControls.selectProvider(provider);held=true;expanded=true;welcome=false;shell();}}
  function library(){modal('library','Your conversations',body=>{
    const search=input('Search conversation titles or messages',200),list=node('div',null,'everyday-list');
    const opt=node('input');opt.type='checkbox';opt.checked=Boolean(latest.everyday?.settings.saveChats);opt.onchange=async()=>{const r=await act('save',{saveChats:opt.checked});if(!r.ok)opt.checked=!opt.checked;};
    const retention=node('select');for(const days of [7,30,90]){const option=node('option',days+' days');option.value=String(days);retention.append(option);}retention.value=String(latest.everyday?.settings.retention||30);retention.onchange=()=>act('save',{retention:Number(retention.value)});
    body.append(label('Save chats with system encryption',opt),label('Automatically delete after',retention),node('p','When saving is off, this library lasts until Nook closes. Files, images, and API keys are excluded. Up to 100 conversations, with the latest 200 messages each.','everyday-note'),search,list);
    let serial=0;
    const paint=async()=>{opt.checked=Boolean(latest.everyday?.settings.saveChats);retention.value=String(latest.everyday?.settings.retention||30);const current=++serial,term=search.value.trim().toLowerCase();let rows=[...(latest.everyday?.chats||[])].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updated-a.updated);
      // Message search is local and decrypts only in the main process.
      if(term){const matches=await Promise.all(rows.map(async c=>{if(c.name.toLowerCase().includes(term))return c;const result=await window.nook.everyday('chat',{action:'detail',id:c.id});return result.conversation?.messages.some(m=>m.content.toLowerCase().includes(term))?c:null;}));rows=matches.filter(Boolean);}
      if(current!==serial||!dialog.open||dialogType!=='library')return;list.replaceChildren();
      for(const c of rows){const title=input('Conversation name',60);title.value=c.name;title.onchange=()=>act('chat',{action:'rename',id:c.id,name:title.value});const controls=row(button('Open',async()=>{const r=await act('chat',{action:'open',id:c.id});if(r.ok){dialog.close();openChat(c.provider);}}),button(c.pinned?'Unpin':'Pin',()=>act('chat',{action:'pin',id:c.id})),button('Export',()=>act('chat',{action:'export',id:c.id})),button('Delete',()=>act('chat',{action:'delete',id:c.id})));list.append(stack(title,node('small',c.provider+' · '+c.count+' messages · '+new Date(c.updated).toLocaleDateString()),controls));}
      if(!rows.length)list.append(node('p',term?'No matching conversations.':'Your conversations appear here after your first reply.','everyday-note'));
    };
    let timer;search.oninput=()=>{clearTimeout(timer);timer=setTimeout(paint,200);};dialogPaint=paint;paint();
    const providerSelect=node('select');for(const id of E.PROVIDERS){const option=node('option',id);option.value=id;providerSelect.append(option);}providerSelect.value=appMode?'chatgpt':provider;
    body.append(row(providerSelect,button('New conversation',async()=>{const r=await act('chat',{action:'new',provider:providerSelect.value});if(r.ok){dialog.close();openChat(providerSelect.value);}})));
    let armed=false;body.append(button('Delete all conversations',async event=>{if(!armed){armed=true;event.target.textContent='Confirm deletion of all conversations';return;}await act('chat',{action:'clear'});armed=false;event.target.textContent='Delete all conversations';}));
  });}
  function prompts(){modal('prompts','Saved prompts',body=>{
    const list=node('div',null,'everyday-list'),title=input('Prompt title',60),draft=node('textarea');draft.maxLength=2000;draft.rows=4;draft.placeholder='Write a prompt to review before sending…';draft.setAttribute('aria-label','Prompt text');let editing='';
    const save=button('Save prompt',async()=>{const r=await act('prompt',{action:'save',id:editing,title:title.value,body:draft.value});if(r.ok){editing='';title.value='';draft.value='';save.textContent='Save prompt';}});
    const paint=()=>{
      list.replaceChildren();
      for(const p of latest.everyday?.prompts||[]){
        const use=button('Use prompt',()=>{dialog.close();if(appMode){window.nook.everyday('draft',p.body);}else{showCard('chat');held=true;expanded=true;chatInput.value=p.body;chatInput.focus();shell();}});
        const edit=button('Edit',()=>{editing=p.id;title.value=p.title;draft.value=p.body;save.textContent='Save changes';});
        const remove=button('Delete',()=>act('prompt',{action:'delete',id:p.id}));
        list.append(stack(node('strong',p.title),node('p',p.body,'everyday-prompt-copy'),row(use,edit,remove)));
      }
      if(!list.children.length)list.append(node('p','Save the prompts you use often, or try a starter below.','everyday-note'));
    };
    body.append(list,label('Title',title),label('Prompt',draft),save,node('h3','Starters'));
    for(const [name,copy] of [['Explain an error','Explain this error and suggest the smallest useful fix:\n'],['Review code','Review this code for correctness, clarity, and performance:\n'],['Summarize notes','Summarize these notes into key points and next actions:\n']])body.append(button(name,()=>{editing='';title.value=name;draft.value=copy;save.textContent='Save prompt';}));
    dialogPaint=paint;paint();
  });}
  function compare(){modal('compare','Compare two models',body=>{
    const draft=node('textarea');draft.maxLength=2000;draft.rows=3;draft.placeholder='Ask both models the same question…';draft.setAttribute('aria-label','Comparison prompt');
    const choices=E.PROVIDERS.filter(id=>latest.keys?.[id]||['ollama','lmstudio','custom'].includes(id));const selectors=[];
    for(let i=0;i<2;i++){const select=node('select'),model=input('Model ID',80);for(const id of choices){const option=node('option',id);option.value=id;select.append(option);}select.value=choices[Math.min(i,choices.length-1)]||'';model.value=latest.models?.[select.value]||'';select.onchange=()=>{model.value=latest.models?.[select.value]||'';};selectors.push({select,model});body.append(row(label('Provider '+(i+1),select),label('Model '+(i+1),model)));}
    const summary=node('p',null,'everyday-note'),send=button('Send to both models',async()=>{notice.textContent='';await act('compare',{text:draft.value,models:selectors.map(s=>({provider:s.select.value,model:s.model.value}))});}),stop=button('Stop comparison',()=>act('compare-stop'));const results=node('div',null,'comparison-grid');
    const explain=()=>{summary.textContent='This sends only the prompt below to '+selectors.map(s=>s.select.value+' / '+s.model.value).join(' and ')+'. Two requests; provider charges may apply. Chat history and attachments are excluded.';};for(const s of selectors){s.select.addEventListener('change',explain);s.model.addEventListener('input',explain);}explain();
    body.append(summary,draft,row(send,stop),results);
    const paint=()=>{const comparison=latest.comparison||{};send.disabled=Boolean(comparison.busy);stop.hidden=!comparison.busy;results.replaceChildren();for(const r of comparison.results||[]){const card=section(r.provider+' / '+r.model);const copy=node('div',null,'comparison-answer');if(window.NookRichMarkdown)copy.append(window.NookRichMarkdown.renderMarkdown(r.content||'Waiting for a reply…',{openUrl:url=>window.nook.openChatUrl(url)}));else copy.textContent=r.content||'Waiting for a reply…';card.append(copy,node('small',r.status),r.error?node('p',r.error,'everyday-note'):node('span'));results.append(card);}};dialogPaint=paint;paint();
  });}
  function focusWidget(){const clock=node('strong',null,'focus-clock'),status=node('small'),labelInput=input('What are you focusing on?'),minutes=node('input');minutes.type='number';minutes.min='1';minutes.max='120';minutes.value='25';minutes.setAttribute('aria-label','Focus minutes');const pause=button('Pause',()=>act('focus',{action:latest.everyday?.focus.running?'pause':'resume'}));const breakButton=button('Start break',()=>act('focus',{action:'break'}));
    const view=section('Focus',row(clock,status),labelInput,row(label('Minutes',minutes),button('Start',()=>act('focus',{action:'start',label:labelInput.value,minutes:Number(minutes.value)})),pause,button('Stop',()=>act('focus',{action:'stop'})),breakButton));
    function paint(){const f=latest.everyday?.focus||{};clock.textContent=E.clock(f.running?Math.max(0,(f.end-Date.now())/1000):f.remaining??1500);status.textContent=(f.phase==='idle'?'Ready':f.phase==='break'?'Break':f.remaining===0?'Finished':f.running?'Focusing':'Paused')+(f.label?' · '+f.label:'');pause.textContent=f.running?'Pause':'Resume';pause.disabled=f.phase==='idle'||f.remaining===0;breakButton.hidden=f.phase!=='focus'||f.remaining!==0;}
    return {view,paint};
  }
  function taskWidget(){const list=node('div',null,'everyday-list'),draft=input('Add a small task'),form=node('form',null,'everyday-row'),add=button('Add',()=>{});add.type='submit';form.append(draft,add);form.onsubmit=async event=>{event.preventDefault();const r=await act('task',{action:'add',title:draft.value});if(r.ok)draft.value='';};const view=section('Small tasks',form,list,button('Clear completed',()=>act('task',{action:'clear-done'})));let signature='';
    function paint(){const tasks=latest.everyday?.tasks||[],next=JSON.stringify(tasks);if(next===signature)return;signature=next;list.replaceChildren();for(const task of tasks){const check=node('input');check.type='checkbox';check.checked=task.done;check.setAttribute('aria-label','Complete '+task.title);check.onchange=()=>act('task',{action:'toggle',id:task.id});const copy=node('span',task.title+([task.owner,task.due].filter(Boolean).length?' · '+[task.owner,task.due].filter(Boolean).join(' · '):''));copy.classList.toggle('task-done',task.done);list.append(row(check,copy,button('Remove',()=>act('task',{action:'delete',id:task.id}))));}if(!tasks.length)list.append(node('p','Keep your next few steps here.','everyday-note'));}return {view,paint};
  }
  function inboxWidget(){
    const list=node('div',null,'everyday-list'),view=section('Notifications',row(button('Mark all read',()=>act('inbox',{action:'read-all'})),button('Clear',()=>act('inbox',{action:'clear'}))),list);
    let signature='';
    function paint(){
      const items=(latest.everyday?.inbox||[]).filter(i=>!i.dismissed),next=JSON.stringify(items);
      if(next===signature)return;signature=next;list.replaceChildren();
      for(const item of items){
        const title=node('strong',item.title);title.classList.toggle('inbox-unread',!item.read);
        const open=button('View',async()=>{await act('inbox',{action:'read',id:item.id});if(item.kind==='ci')window.nook.openService('github');else if(item.sessionId)window.nook.paletteCommand('session:'+item.sessionId);else if(item.kind==='chat')openChat(item.agent);else if(item.kind==='comparison')compare();else if(item.kind==='focus')widgetDialog('focus');});
        list.append(stack(title,node('small',item.agent+' · '+new Date(item.time).toLocaleTimeString()),row(open,button('Dismiss',()=>act('inbox',{action:'dismiss',id:item.id})))));
      }
      if(!items.length)list.append(node('p','Completions and service alerts will appear here. Approval requests remain in the action card.','everyday-note'));
    }return {view,paint};
  }
  function widgetDialog(type){const factory={focus:focusWidget,tasks:taskWidget,inbox:inboxWidget}[type];if(!factory)return;modal(type,type==='inbox'?'Notification inbox':type==='tasks'?'Small tasks':'Focus timer',body=>{const widget=factory();body.append(widget.view);dialogPaint=widget.paint;widget.paint();});}
  let focusApp,tasksApp,inboxApp;
  if(appMode){
    window.nook.onCommand(action=>{if(action==='page-everyday')showPage('everyday');});
    const root=$('everyday-app');focusApp=focusWidget();tasksApp=taskWidget();inboxApp=inboxWidget();
    root.append(section('Conversations & prompts',node('p','Open your conversation library, save reusable prompts, or compare two models.','everyday-note'),row(button('Conversation library',library),button('Saved prompts',prompts),button('Compare models',compare))),row(focusApp.view,tasksApp.view),inboxApp.view);
    const settings=section('Hover dashboard');const enabled=node('input');enabled.type='checkbox';enabled.id='hover-dashboard-enabled';enabled.onchange=()=>act('save',{hoverDashboard:enabled.checked});settings.append(label('Show selected widgets when hovering over the notch',enabled),node('p','Pending approvals take priority. Drag-free controls stay open while you interact; the dashboard retracts when you leave.','everyday-note'));const choices=node('div',null,'everyday-options');
    for(const id of E.WIDGETS){const checkbox=node('input');checkbox.type='checkbox';checkbox.dataset.widget=id;checkbox.onchange=()=>act('save',{widgets:[...choices.querySelectorAll('input:checked')].map(n=>n.dataset.widget)});choices.append(label(id[0].toUpperCase()+id.slice(1),checkbox));}settings.append(choices);const actionFirst=node('input');actionFirst.type='checkbox';actionFirst.id='hover-action-first';actionFirst.onchange=()=>act('save',{actionFirst:actionFirst.checked});settings.append(label('Put services needing attention first',actionFirst));root.append(settings);
    const personality=node('select');personality.id='pet-personality';for(const id of ['calm','playful','focused']){const option=node('option',id[0].toUpperCase()+id.slice(1));option.value=id;personality.append(option);}personality.onchange=()=>act('save',{personality:personality.value});const petSettings=section('Pet personality',label('Personality',personality));
    for(const [id,title,min,max] of [['intensity','Animation intensity',0,1.5],['speed','Animation speed',.5,1.5],['movement','Movement within the pet area',0,2]]){const range=node('input');range.type='range';range.min=String(min);range.max=String(max);range.step='.1';range.id='pet-'+id;range.onchange=()=>act('save',{[id]:Number(range.value)});petSettings.append(label(title,range));}petSettings.append(node('p','Task expressions remain visible. Movement stays inside the pet’s canvas and respects reduced motion.','everyday-note'));root.append(petSettings);
    const fullscreen=node('input');fullscreen.type='checkbox';fullscreen.id='notch-fullscreen';fullscreen.onchange=()=>act('save',{hideFullscreen:fullscreen.checked});fullscreen.disabled=!navigator.userAgent.includes('Windows');const paused=node('input');paused.type='checkbox';paused.id='notch-paused';paused.onchange=()=>act('save',{paused:paused.checked});
    const display=node('select');display.id='layout-display';const width=node('input');width.id='layout-width';width.type='number';width.min='520';width.max='820';width.value='620';const offset=node('input');offset.id='layout-offset';offset.type='number';offset.min='-2000';offset.max='2000';offset.value='0';
    const loadLayout=()=>{const value=latest.everyday?.layouts?.[display.value];width.value=String(value?.width||latest.look?.notchWidth||620);offset.value=String(value?.offset||0);};display.onchange=loadLayout;
    root.append(section('Displays & fullscreen',label('Hide notch over fullscreen apps (Windows)',fullscreen),label('Pause the notch',paused),node('p','Use the tray to open Nook while paused. Display layouts remember width, horizontal placement, and selected widgets. Missing displays fall back to your normal monitor preference.','everyday-note'),label('Display',display),row(label('Width in pixels',width),label('Horizontal offset',offset)),row(button('Save display layout',()=>act('layout',{id:display.value,layout:{width:Number(width.value),offset:Number(offset.value),widgets:latest.everyday?.settings.widgets}})),button('Reset display layout',()=>act('layout',{id:display.value,layout:null})))));
    root.append(section('Voice commands',node('p','In notch chat, switch voice input to “Commands,” then hold to talk. Review the recognized action and click Run. No command approves an agent or sends an AI message.','everyday-note'),node('p','Try: “Open my chat,” “Show pending requests,” “Show notifications,” “Start a focus timer,” “Pause the timer,” “Mute Nook.”','everyday-note')));
    const appNote=node('p',null,'everyday-note');appNote.id='everyday-app-note';appNote.setAttribute('role','status');root.append(appNote);
    new MutationObserver(()=>{if(!dialog.open&&notice.textContent)appNote.textContent=notice.textContent;}).observe(notice,{childList:true});
  }else{
    if(detached){document.body.classList.add('detached-chat');welcome=false;held=true;expanded=true;showCard('chat');}
    const controls=row(button(detached?'Return to notch':'Expand chat',()=>act(detached?'chat-return':'chat-window',{provider})),button('Conversations',library),button('Prompts',prompts),button('Compare',compare));controls.classList.add('chat-library-controls');document.querySelector('.chat-control-bar')?.after(controls);if(!controls.isConnected)$('chat-form').before(controls);
    const voiceSelect=node('select');voiceSelect.id='voice-input-mode';voiceSelect.setAttribute('aria-label','Voice input mode');for(const [id,copy] of [['dictation','Dictation'],['commands','Commands']]){const option=node('option',copy);option.value=id;voiceSelect.append(option);}voiceSelect.onchange=()=>{voiceCommands=voiceSelect.value==='commands';};$('voice-talk').before(voiceSelect);
    const tray=node('div',null,'attachment-tray');tray.id='attachment-tray';$('file-chip').after(tray);
    const requestPicker=node('div',null,'request-picker');$('card-approval').prepend(requestPicker);
    const dashboard=$('card-widgets');dashboard.append(row(node('h2','Your space'),button('Customize',()=>window.nook.openApp('studio')),button('Activity',()=>{showCard('session');held=true;shell();})),node('p','Quick actions, right where you’re working.','everyday-note'));const grid=node('div',null,'hover-widget-grid');dashboard.append(grid);
    const widgetNodes=new Map();let requestKey='';
    function paintDashboard(){
      const prefs=latest.everyday?.settings||{},layout=latest.everyday?.layouts?.[latest.currentDisplay],studio=latest.studio?.settings||{};
      const selected=layout?.widgets||prefs.widgets||[],widgets=(studio.widgetOrder||selected).filter(id=>selected.includes(id)),items=[];
      const requests=latest.requests||[],nextRequests=JSON.stringify([requests,latest.pending?.id]);
      if(nextRequests!==requestKey){requestKey=nextRequests;requestPicker.replaceChildren();if(requests.length>1)for(const request of requests){const pick=button(request.agent+' · '+request.title,()=>act('request-select',request.id));pick.setAttribute('aria-pressed',String(request.id===latest.pending?.id));requestPicker.append(pick);}}
      for(const id of widgets){
        const item={key:id,widget:id,size:studio.widgetSizes?.[id]||'small'};
        if(id==='focus')Object.assign(item,{title:'Focus',detail:'',pet:'focused',action:()=>widgetDialog('focus')});
        if(id==='tasks'){const tasks=(latest.everyday?.tasks||[]).filter(t=>!t.done);Object.assign(item,{title:'Small tasks',detail:tasks.length+' remaining'+(tasks[0]?' · '+tasks[0].title:''),pet:'idle',action:()=>widgetDialog('tasks')});}
        if(id==='inbox'){const unread=(latest.everyday?.inbox||[]).find(i=>!i.read&&!i.dismissed);Object.assign(item,{title:'Notifications',detail:(latest.everyday?.unread||0)+' unread'+(unread?' · '+unread.title:''),action:()=>widgetDialog('inbox')});}
        if(id==='sessions')Object.assign(item,{title:'Agents',detail:(latest.sessions||[]).filter(s=>!s.finished).length+' active · '+(latest.pendingCount||0)+' waiting',pet:(latest.pendingCount||0)>0?'expectant':'idle',action:()=>{showCard('session');held=true;shell();}});
        if(id==='music'){const music=latest.features?.music;if(!music?.available)continue;Object.assign(item,{title:music.title||'Music',detail:(music.playing?'Pause':'Play')+' · '+(music.artist||'Now playing'),disabled:!music.canToggle,action:()=>window.nook.media('toggle')});}
        if(id==='services'){
          const pins=latest.experience?.settings?.pinnedServices||[],attention=s=>window.NookServiceCards.describe(s).tone!=='ready';
          const services=[...(latest.services||[])].sort((a,b)=>(prefs.actionFirst?Number(attention(b))-Number(attention(a)):0)||Number(pins.includes(b.id))-Number(pins.includes(a.id)));
          for(const service of services.slice(0,4)){const d=window.NookServiceCards.describe(service);items.push({...item,key:'services:'+service.id,title:service.title||service.id,detail:d.status+' · '+(service.detail||'Open service'),tone:d.tone,pet:d.mood,color:d.color,action:()=>window.nook.openService(service.id)});}continue;
        }
        if(id==='prompts')Object.assign(item,{title:'Saved prompts',detail:(latest.everyday?.prompts||[]).length+' ready to use',action:prompts});
        if(id==='focus')item.pet=latest.everyday?.focus.running?'focused':'idle';
        items.push(item);
      }
      if(prefs.actionFirst){const priority=item=>item.tone==='error'?0:item.tone==='warning'?1:2;items.sort((a,b)=>priority(a)-priority(b));}
      // Compare only rendered values, not playback positions or unrelated agent events.
      const signature=JSON.stringify(items.map(({action,...item})=>item));if(signature===dashboardKey)return;dashboardKey=signature;
      const keys=new Set(items.map(item=>item.key));
      for(const [key,record]of widgetNodes)if(!keys.has(key)){record.canvas?._nookDispose?.();record.tile.remove();widgetNodes.delete(key);}
      grid.querySelector('.everyday-note')?.remove();
      items.forEach((item,index)=>{
        let record=widgetNodes.get(item.key);
        if(!record){const tile=node('button',null,'hover-widget'),title=node('strong'),detail=node('small');tile.type='button';tile.append(title,detail);record={tile,title,detail};if(item.pet){const canvas=node('canvas',null,'brand-seed hover-pet');canvas.width=canvas.height=96;canvas.setAttribute('aria-hidden','true');tile.append(canvas);record.canvas=canvas;window.NookSeed.bind(canvas);}widgetNodes.set(item.key,record);}
        const {tile,title,detail,canvas}=record;
        for(const [key,value]of Object.entries({widget:item.widget,size:item.size,tone:item.tone||''}))if(tile.dataset[key]!==value)tile.dataset[key]=value;
        if(title.textContent!==item.title)title.textContent=item.title;
        if(item.widget==='focus')detail.classList.add('hover-focus-time');else if(detail.textContent!==item.detail)detail.textContent=item.detail;
        if(tile.disabled!==Boolean(item.disabled))tile.disabled=Boolean(item.disabled);tile.onclick=item.action;
        if(canvas){if(canvas.dataset.mood!==item.pet)canvas.dataset.mood=item.pet;if(item.color&&canvas.dataset.body!==item.color)canvas.dataset.body=item.color;}
        if(grid.children[index]!==tile)grid.insertBefore(tile,grid.children[index]||null);
      });
      if(!items.length)grid.append(node('p','Choose widgets in Chats & everyday tools. Music and service cards appear when connected.','everyday-note'));
      if(!dashboard.hidden||latest.pending)shell();
    }
    window.nook.onCommand(action=>{if(action.startsWith('widget:'))widgetDialog(action.slice(7));if(action.startsWith('draft:')){showCard('chat');held=true;expanded=true;chatInput.value=action.slice(6);window.NookDrafts?.capture(provider,chatInput.value);chatInput.focus();shell();}});
    window.nook.onState(next=>{
      latest=next;paintDashboard();const files=next.attachments?.files||[];const key=JSON.stringify(files);if(key!==attachmentKey){attachmentKey=key;tray.replaceChildren();for(const file of files){const card=node('div',null,'attachment-item');if(file.image){const image=node('img');image.src=file.image;image.alt=file.name;card.append(image);}card.append(node('span',file.name),button('Remove',()=>act('attachment-remove',file.id)));if(file.text)card.append(button('Preview',()=>modal('attachment',file.name,body=>body.append(node('pre',file.text,'attachment-text')))));tray.append(card);}if(files.length){const estimate=E.estimate(files);tray.append(node('small',estimate.count+' files · ~'+estimate.textTokens.toLocaleString()+' text tokens (rough estimate)'+(estimate.images?' · '+estimate.images+' image(s), token count varies by model':'')));}}
    });
  }
  function timerPaint(){focusApp?.paint();const tile=document.querySelector('.hover-focus-time');if(tile){const f=latest.everyday?.focus;tile.textContent=f?.phase==='idle'?'Start a focus session':E.clock(f?.running?(f.end-Date.now())/1000:f?.remaining||0)+' · '+(f?.running?f.phase:f?.remaining===0?'Finished':'Paused');}if(dialog.open&&dialogType==='focus')dialogPaint?.();}
  let clockTimer;function scheduleClock(){clearInterval(clockTimer);if(!document.hidden){timerPaint();clockTimer=setInterval(timerPaint,1000);}}document.addEventListener('visibilitychange',scheduleClock);scheduleClock();
  window.nook.onState(next=>{
    const changedApproval=next.pending?.id!==latest.pending?.id;latest=next;if(!appMode&&!detached&&next.pending&&(changedApproval||dialog.open)){dialog.close();}
    if(appMode){const prefs=next.everyday?.settings||{};$('hover-dashboard-enabled').checked=prefs.hoverDashboard!==false;$('hover-action-first').checked=prefs.actionFirst!==false;for(const checkbox of document.querySelectorAll('[data-widget]'))checkbox.checked=prefs.widgets?.includes(checkbox.dataset.widget);for(const id of ['personality','intensity','speed','movement']){const field=$(id==='personality'?'pet-personality':'pet-'+id);if(document.activeElement!==field)field.value=String(prefs[id]??1);}$('notch-fullscreen').checked=Boolean(prefs.hideFullscreen);$('notch-paused').checked=Boolean(prefs.paused);
      const displays=$('layout-display');const old=displays.value,signature=JSON.stringify(next.displays);if(displays.dataset.signature!==signature){displays.dataset.signature=signature;displays.replaceChildren();for(const d of next.displays||[]){const option=node('option',(d.primary?'Primary · ':'')+d.label+' · '+d.id);option.value=d.id;displays.append(option);}displays.value=[...displays.options].some(o=>o.value===old)?old:next.currentDisplay;displays.dispatchEvent(new Event('change'));}
      focusApp.paint();tasksApp.paint();inboxApp.paint();$('everyday-app-note').textContent=next.everyday?.error||next.everyday?.warning||notice.textContent;
    }if(dialog.open)dialogPaint?.();timerPaint();
  });
  window.NookEverydayUI={library,prompts,compare,widget:widgetDialog,voiceMode:()=>voiceCommands,async reviewVoice(text){const result=await act('voice-preview',text);modal('voice','Review voice command',body=>{body.append(node('p','You said: '+text));if(result.command)body.append(node('strong',result.command.label),button('Run command',async()=>{const r=await act('voice-run',text);if(r.ok)dialog.close();}));else body.append(node('p','Command not recognized. Try “Open my chat” or “Start a focus timer.”','everyday-note'));});}};
})();
