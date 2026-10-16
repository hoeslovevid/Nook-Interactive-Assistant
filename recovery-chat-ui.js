(() => {
 const input=document.getElementById('chat-input');if(!input)return;
 const timers=new Map(),pending=new Map();let enabled=false;
 function capture(id,value){
  if(!enabled)return;pending.set(id,value.slice(0,2000));clearTimeout(timers.get(id));
  timers.set(id,setTimeout(()=>{timers.delete(id);const text=pending.get(id);pending.delete(id);window.nook.library('recover-draft',{provider:id,text}).catch(()=>{});},650));
 }
 input.addEventListener('input',()=>capture(provider,input.value));
 window.nook.onState(state=>{enabled=state.library?.recoveryEnabled===true;if(!enabled){for(const timer of timers.values())clearTimeout(timer);timers.clear();pending.clear();}});
 window.nook.onCommand(action=>{
  const source=action.startsWith('source-draft:'),restore=action.startsWith('restore-draft:');if(!source&&!restore)return;
  // An attached source must not silently replace work already in the composer.
  if(restore||!input.value.trim())input.value=action.slice(source?13:14).slice(0,2000);
  providerDrafts.set(provider,input.value);capture(provider,input.value);input.focus();
 });
 window.addEventListener('beforeunload',()=>{for(const [id,text]of pending)window.nook.library('recover-draft',{provider:id,text}).catch(()=>{});});
 window.NookDrafts={capture};
 // Source tools prepare a draft; the Send button remains the only AI action.
 const tools=document.createElement('button');tools.type='button';tools.className='tool-button';tools.textContent='Sources';tools.title='Review documents and selected text';tools.onclick=()=>window.nook.openApp('library');
 document.querySelector('.chat-tools')?.append(tools);
})();
