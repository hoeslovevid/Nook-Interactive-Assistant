(() => {
  const stage=document.querySelector('.stage'),canvas=stage.querySelector('.preview-companion'),old=stage.querySelector('svg');
  stage.className='interactive-preview';stage.removeAttribute('aria-hidden');old.hidden=true;old.style.display='none';canvas.classList.add('preview-pet');canvas.width=canvas.height=128;
  const controls=document.createElement('div');controls.className='preview-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Live notch preview scenes');
  const desktop=document.createElement('div');desktop.className='preview-desktop';
  const panel=document.createElement('div');panel.className='preview-island';panel.setAttribute('aria-label','Interactive sample notch');
  const top=document.createElement('div');top.className='preview-toolbar';const brand=document.createElement('strong');brand.textContent='Nook';const toggle=document.createElement('button');toggle.type='button';toggle.textContent='−';toggle.setAttribute('aria-label','Collapse sample notch');top.append(canvas,brand,toggle);
  const body=document.createElement('div');body.className='preview-content';const note=document.createElement('p');note.className='preview-caption';note.textContent='Interactive preview · sample data · click the pet and try the controls';
  panel.append(top,body);desktop.append(panel);stage.append(controls,desktop,note);
  let mode='tasks',task='reading',collapsed=false,playing=false,visible=false,timer,lastState={},musicPlaying=true;
  const moods={idle:'idle',tasks:task,chat:'thinking',approval:'expectant',music:'dancing'};
  const button=(label,callback)=>{const b=document.createElement('button');b.type='button';b.className='preview-action';b.textContent=label;b.onclick=callback;return b;};
  const choices=[];
  for(const [id,label] of [['idle','Idle'],['tasks','Tasks'],['chat','Chat'],['approval','Approval'],['music','Music']]){const b=button(label,()=>{mode=id;collapsed=false;paint();});b.dataset.scene=id;controls.append(b);choices.push(b);}
  const play=button('▶ Play scenes',()=>{playing=!playing;play.textContent=playing?'Pause scenes':'▶ Play scenes';play.setAttribute('aria-pressed',String(playing));schedule();});play.id='preview-play';controls.append(play);
  function schedule(){clearTimeout(timer);if(!playing||!visible||document.hidden)return;timer=setTimeout(()=>{const scenes=['idle','tasks','chat','approval','music'];mode=scenes[(scenes.indexOf(mode)+1)%scenes.length];collapsed=false;paint();schedule();},3200);}
  function paint(){
    panel.dataset.collapsed=String(collapsed);panel.dataset.scene=mode;body.hidden=collapsed;toggle.textContent=collapsed?'+':'−';toggle.setAttribute('aria-label',collapsed?'Expand sample notch':'Collapse sample notch');toggle.setAttribute('aria-expanded',String(!collapsed));
    choices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===mode)));canvas.dataset.mood=collapsed?'curious':mode==='tasks'?task:moods[mode];body.replaceChildren();
    const title=document.createElement('strong'),detail=document.createElement('p');detail.className='preview-detail';
    if(mode==='tasks'){
      title.textContent=task==='happy'?'All checks passed':'Building a friendlier workspace';detail.textContent='Sample agent · greeting.js';const steps=document.createElement('div');steps.className='preview-actions';
      for(const [id,label] of [['reading','Read'],['coding','Edit'],['running','Run'],['happy','Done']]){const b=button(label,()=>{task=id;paint();});b.setAttribute('aria-pressed',String(task===id));steps.append(b);}body.append(title,detail,steps);
      const code=document.createElement('pre');code.className='preview-code';code.textContent=task==='reading'?'const greeting = "Hello";':task==='running'?'✓ greeting.test.js\n✓ Ready to go':task==='happy'?'✓ All checks passed':'− const greeting = "Hello";\n+ const greeting = "Welcome to Nook";';body.append(code);
    }else if(mode==='approval'){
      title.textContent='Sample approval';detail.textContent='Nook is waiting for your OK · preview only';const actions=document.createElement('div');actions.className='preview-actions';
      for(const label of ['Deny','Allow'])actions.append(button(label,()=>{title.textContent=label==='Allow'?'Sample approved':'Sample denied';detail.textContent='Only this preview changed.';canvas.dataset.mood=label==='Allow'?'happy':'curious';actions.replaceChildren(button('Try again',paint));}));body.append(title,detail,actions);
    }else if(mode==='chat'){
      title.textContent='A little space to think';const reply=document.createElement('p');reply.className='preview-chat-reply';reply.textContent='Ask me something to try the composer.';const form=document.createElement('form');form.className='preview-compose';const input=document.createElement('input');input.placeholder='Try a sample message';input.maxLength=120;input.setAttribute('aria-label','Sample chat message');const send=button('↑',()=>{});send.type='submit';send.setAttribute('aria-label','Send sample message');form.append(input,send);form.onsubmit=event=>{event.preventDefault();if(!input.value.trim())return;reply.textContent='“'+input.value.trim()+'” — ready when you are. This stays in the preview.';input.value='';canvas.dataset.mood='happy';};body.append(title,reply,form);
    }else if(mode==='music'){
      title.textContent='Nook’s focus mix';detail.textContent='Sample track · no audio is playing';body.append(title,detail,button(musicPlaying?'Pause':'Play',()=>{musicPlaying=!musicPlaying;paint();}));canvas.dataset.mood=musicPlaying?'dancing':'idle';const progress=document.createElement('input');progress.type='range';progress.value='38';progress.setAttribute('aria-label','Sample music position');body.append(progress);
    }else{title.textContent='Ready when you are';detail.textContent='Click Nook, move your pointer, or pick a scene.';body.append(title,detail);}
    window.NookCompanion.apply(canvas,lastState.features?.companion,lastState.features?.previewOutfit);
    schedule();
  }
  toggle.onclick=()=>{collapsed=!collapsed;paint();};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();});observer.observe(stage);document.addEventListener('visibilitychange',schedule);
  window.nook.onState(next=>{lastState=next;const look=next.look||{};panel.style.width=Math.min(100,Math.max(60,(look.notchWidth||620)/8.2))+'%';window.NookCompanion.apply(canvas,next.features?.companion,next.features?.previewOutfit);});
  window.NookPreview={scene(id){if(Object.hasOwn(moods,id)){mode=id;collapsed=false;paint();}},canvas};paint();
})();
