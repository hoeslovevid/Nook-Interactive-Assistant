// Compact connection cards keep setup available without overwhelming the page.
const connectionForms = Array.from(keysPage.querySelectorAll('.key-card'));
const cloudProviders = ['chatgpt','gemini','claude','openrouter','deepseek','mistral','groq','xai'];
const localProviders = ['ollama','lmstudio','custom'];
let connectionFilter = 'all';
let configuredKeys = {};
const filterBar = document.createElement('div'); filterBar.className = 'connection-filters'; filterBar.setAttribute('role','group'); filterBar.setAttribute('aria-label','Filter connections');
const connectionGrid = document.createElement('div'); connectionGrid.className = 'connection-grid';
const connectionCount = document.createElement('p'); connectionCount.className = 'connection-count'; connectionCount.setAttribute('role','status');
const noConnections = document.createElement('div'); noConnections.className = 'connection-empty'; noConnections.textContent = 'No matching connections. Try a different name or filter.'; noConnections.hidden = true;
for (const node of keysPage.querySelectorAll('.connection-intro')) node.remove();
keysPage.querySelector('header').after(filterBar,connectionCount,connectionGrid,noConnections);
for (const [id,label] of [['all','All'],['cloud','Cloud AI'],['local','Local & custom'],['services','Integrations'],['saved','Key saved']]) {
  const button=document.createElement('button');button.type='button';button.className='filter-button';button.textContent=label;button.dataset.filter=id;button.setAttribute('aria-pressed',id==='all'?'true':'false');
  button.addEventListener('click',()=>{connectionFilter=id;filterConnections();});filterBar.append(button);
}
function filterConnections() {
  const query=connectionSearch.value.trim().toLowerCase();let count=0;
  for(const form of connectionForms){const id=form.dataset.provider;const group=cloudProviders.includes(id)?'cloud':localProviders.includes(id)?'local':'services';
    const visible=(connectionFilter==='all'||connectionFilter===group||(connectionFilter==='saved'&&configuredKeys[id]))&&(form.querySelector('h2').textContent+' '+(form.querySelector('[data-model]')?.value||'')).toLowerCase().includes(query);
    form.hidden=!visible;if(visible)count++;
  }
  for(const button of filterBar.children)button.setAttribute('aria-pressed',button.dataset.filter===connectionFilter?'true':'false');
  connectionCount.textContent=count+' connection'+(count===1?'':'s');noConnections.hidden=count>0;
}
connectionSearch.addEventListener('input',filterConnections);
for(const form of connectionForms){
  const id=form.dataset.provider;const heading=form.querySelector('.key-heading');
  const avatar=document.createElement('span');avatar.className='provider-avatar';avatar.dataset.provider=id;avatar.textContent=({chatgpt:'O',gemini:'G',claude:'C',openrouter:'OR',lmstudio:'LM',deepseek:'D',mistral:'M',groq:'Gq',xai:'x',ollama:'OL',custom:'+'})[id]||form.querySelector('h2').textContent.slice(0,2);avatar.setAttribute('aria-hidden','true');heading.prepend(avatar);
  const details=document.createElement('details');const summary=document.createElement('summary');const summaryCopy=document.createElement('span');summaryCopy.className='provider-summary';
  const model=form.querySelector('[data-model]');summaryCopy.textContent=model?.value||(localProviders.includes(id)?'Local connection':'Workspace integration');
  summary.append(heading,summaryCopy);details.append(summary);
  const contents=document.createElement('div');contents.className='connection-body';for(const node of Array.from(form.childNodes))if(node!==heading)contents.append(node);details.append(contents);form.append(details);connectionGrid.append(form);
  details.addEventListener('toggle',()=>{if(details.open){for(const other of connectionGrid.querySelectorAll('details'))if(other!==details)other.open=false;}});
  if(model){model.addEventListener('change',()=>{summaryCopy.textContent=model.value;});
    const picker=document.createElement('select');picker.className='discovered-models';picker.hidden=true;picker.setAttribute('aria-label','Available '+form.querySelector('h2').textContent+' models');model.closest('label').after(picker);
    const search=document.createElement('input');search.type='search';search.className='model-search';search.placeholder='Search available models…';search.setAttribute('aria-label','Search '+form.querySelector('h2').textContent+' models');search.hidden=true;picker.before(search);
    const list=form.querySelector('datalist');
    function paintModelOptions(){picker.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose an available model';picker.append(placeholder);for(const item of list.options){if(!item.value.toLowerCase().includes(search.value.trim().toLowerCase()))continue;const option=document.createElement('option');option.value=item.value;option.textContent=item.value;picker.append(option);}picker.hidden=search.hidden=list.options.length===0;}
    new MutationObserver(paintModelOptions).observe(list,{childList:true});search.addEventListener('input',paintModelOptions);
    picker.addEventListener('change',()=>{if(!picker.value)return;model.value=picker.value;model.dispatchEvent(new Event('change'));});
  }
  const guide=window.NookProviderGuides[id];
  if(guide){contents.querySelector(':scope > p:not(.note)')?.remove();const help=document.createElement('div');help.className='provider-guide';const copy=document.createElement('p');copy.textContent=guide.text;help.append(copy);if(guide.url){const link=document.createElement('button');link.type='button';link.className='ghost';link.textContent='Get an API key ↗';link.addEventListener('click',async()=>{const result=await window.nook.providerGuide(id);if(!result.ok)form.querySelector('.note').textContent='Could not open your browser. Try again.';});help.append(link);}contents.prepend(help);}
  for(const input of form.querySelectorAll('input[type=password]')){
    input.dataset.secret='true';input.setAttribute('aria-label',form.querySelector('h2').textContent+' API key');input.spellcheck=false;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='ghost secret-toggle';toggle.textContent='Show';toggle.setAttribute('aria-label','Show or hide '+form.querySelector('h2').textContent+' key');toggle.setAttribute('aria-pressed','false');
    toggle.addEventListener('click',()=>{const show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?'Hide':'Show';toggle.setAttribute('aria-pressed',String(show));});input.after(toggle);
    details.addEventListener('toggle',()=>{if(!details.open){input.type='password';toggle.textContent='Show';toggle.setAttribute('aria-pressed','false');}});
    form.addEventListener('focusout',()=>{if(!form.contains(document.activeElement)){input.type='password';toggle.textContent='Show';toggle.setAttribute('aria-pressed','false');}});
  }
}
window.nook.onState(state=>{
  configuredKeys={...state.serviceKeys};for(const id of cloudProviders)configuredKeys[id]=Boolean(state.keys?.[id]);
  configuredKeys.custom = Boolean(state.keys?.custom);
  for(const form of connectionForms){const id=form.dataset.provider;const summary=form.querySelector('.provider-summary');const model=form.querySelector('[data-model]');if(model)summary.textContent=model.value;
    const badge=form.querySelector('.badge');if(id==='custom'){badge.textContent=configuredKeys[id]?'Key saved':'Optional key';badge.classList.toggle('is-saved',Boolean(configuredKeys[id]));}else if(cloudProviders.includes(id)||!localProviders.includes(id)){badge.textContent=configuredKeys[id]?'Key saved':'Needs key';badge.classList.toggle('is-saved',Boolean(configuredKeys[id]));}
  }filterConnections();
});
filterConnections();

// Shortcut buttons display readable keycaps and record only after an explicit click.
const shortcutDescriptions={chat:'Start a conversation from anywhere',alert:'Bring an approval into focus',mute:'Toggle companion sounds',pet:'Show or hide your desktop companion',next:'Move to the next session',prev:'Move to the previous session',toggle:'Expand or tuck away the notch',diff:'Open the latest file changes'};
const shortcutPage=document.querySelector('#page-shortcuts');
shortcutPage.querySelector('header p').textContent='Your favorite actions, one key combination away. Click a shortcut to change it.';
const shortcutNote=document.createElement('p');shortcutNote.className='shortcut-note';shortcutNote.setAttribute('role','status');shortcutNote.textContent='Click a shortcut, then press your new combination. Esc cancels.';document.querySelector('#shortcuts-form').after(shortcutNote);
const resetShortcuts=document.createElement('button');resetShortcuts.type='button';resetShortcuts.className='ghost shortcut-reset';resetShortcuts.textContent='Restore defaults';shortcutPage.querySelector('header').append(resetShortcuts);
let recording=null;
function paintShortcut(field,button){button.replaceChildren();for(const key of window.NookShortcuts.keycaps(field.value)){const cap=document.createElement('kbd');cap.textContent=key;button.append(cap);}button.setAttribute('aria-label','Change '+field.dataset.shortcut+' shortcut: '+window.NookShortcuts.keycaps(field.value).join(' + '));}
async function saveShortcut(field,value,button){const duplicate=Array.from(document.querySelectorAll('[data-shortcut]')).find(other=>other!==field&&other.value.toLowerCase()===value.toLowerCase());if(duplicate){shortcutNote.textContent='Already used by '+duplicate.closest('label').querySelector('.shortcut-title').textContent+'. Choose another combination.';return;}
  const old=field.value;field.value=value;button.disabled=true;recording=null;button.classList.remove('is-recording');
  try{const result=await window.nook.savePrefs({shortcuts:{[field.dataset.shortcut]:value}});if(result?.shortcutErrors?.length){field.value=result.shortcuts[field.dataset.shortcut]||old;shortcutNote.textContent='That shortcut is unavailable in Windows. Your previous shortcut is kept.';}else{shortcutNote.textContent='Shortcut saved.';}}
  catch(_){field.value=old;shortcutNote.textContent='Could not save this shortcut. Try again.';}
  finally{button.disabled=false;paintShortcut(field,button);}
}
for(const field of document.querySelectorAll('[data-shortcut]')){
  field.hidden=true;const label=field.closest('label');const titleText=label.textContent.trim();for(const node of Array.from(label.childNodes))if(node!==field)node.remove();
  const copy=document.createElement('span');copy.className='shortcut-copy';const title=document.createElement('span');title.className='shortcut-title';title.textContent=titleText;const description=document.createElement('small');description.textContent=shortcutDescriptions[field.dataset.shortcut];copy.append(title,description);
  const button=document.createElement('button');button.type='button';button.className='shortcut-recorder';label.prepend(copy);label.append(button);paintShortcut(field,button);
  field.addEventListener('shortcut-paint',()=>{if(recording!==button)paintShortcut(field,button);});
  button.addEventListener('click',()=>{if(recording){recording.classList.remove('is-recording');recording.dispatchEvent(new Event('recording-cancel'));}recording=button;button.classList.add('is-recording');button.textContent='Press your keys…';shortcutNote.textContent='Recording. Press Esc to cancel.';});
  button.addEventListener('recording-cancel',()=>paintShortcut(field,button));
  button.addEventListener('blur',()=>{if(recording===button){recording=null;button.classList.remove('is-recording');paintShortcut(field,button);}});
  button.addEventListener('keydown',event=>{if(recording!==button)return;event.preventDefault();if(event.key==='Escape'){recording=null;button.classList.remove('is-recording');paintShortcut(field,button);shortcutNote.textContent='No changes made.';return;}const captured=window.NookShortcuts.capture(event);if(!captured)return;if(captured.error){shortcutNote.textContent=captured.error;return;}saveShortcut(field,captured.value,button);});
}
resetShortcuts.addEventListener('click',async()=>{resetShortcuts.disabled=true;if(recording){recording.classList.remove("is-recording");recording.dispatchEvent(new Event("recording-cancel"));recording=null;}try{const result=await window.nook.savePrefs({shortcuts:window.NookShortcuts.DEFAULTS});if(result?.shortcuts)for(const field of document.querySelectorAll('[data-shortcut]')){field.value=result.shortcuts[field.dataset.shortcut];field.dispatchEvent(new Event('shortcut-paint'));}shortcutNote.textContent=result?.shortcutErrors?.length?'Some defaults are unavailable in Windows. Previous shortcuts kept.':'Default shortcuts restored.';}catch(_){shortcutNote.textContent='Could not restore defaults. Try again.';}finally{resetShortcuts.disabled=false;}});

// Keep sound and behavior controls grouped beneath the shortcut list.
const soundsCard=document.createElement('div');soundsCard.className='settings-group';
const soundsTitle=document.createElement('h2');soundsTitle.textContent='Sound & feedback';soundsCard.append(soundsTitle);
const soundsActions=document.createElement('div');soundsActions.className='settings-actions';soundsActions.append(document.querySelector('#toggle-mute'),document.querySelector('#open-sounds'));soundsCard.append(soundsActions,document.querySelector('#week-note'));shortcutNote.after(soundsCard);
const behaviorTitle=document.createElement('h2');behaviorTitle.textContent='Companion behavior';behaviorTitle.className='settings-group-title';document.querySelector('#prefs-form').prepend(behaviorTitle);
const shortcutTitles={pet:'Desktop companion',next:'Next session',prev:'Previous session',toggle:'Toggle notch'};
for(const field of document.querySelectorAll('[data-shortcut]')){if(shortcutTitles[field.dataset.shortcut])field.closest('label').querySelector('.shortcut-title').textContent=shortcutTitles[field.dataset.shortcut];}
