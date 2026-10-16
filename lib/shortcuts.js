(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NookShortcuts=api;})(typeof window==='undefined'?globalThis:window,()=>{
  const DEFAULTS={selection:'CommandOrControl+Shift+Alt+S',chat:'CommandOrControl+Shift+Alt+N',alert:'CommandOrControl+Shift+Alt+J',mute:'CommandOrControl+Shift+Alt+M',pet:'CommandOrControl+Shift+Alt+D',next:'CommandOrControl+Shift+Alt+Right',prev:'CommandOrControl+Shift+Alt+Left',toggle:'CommandOrControl+Shift+Alt+O',diff:'CommandOrControl+Shift+Alt+E'};
  function keycaps(value) { const labels={CommandOrControl:'Ctrl',Control:'Ctrl',Command:'⌘',Meta:'⌘',Right:'→',Left:'←',Up:'↑',Down:'↓'};return String(value).split('+').map(key=>labels[key]||key); }
  function capture(event) {
    if(['Control','Shift','Alt','Meta'].includes(event.key))return null;
    if(!event.ctrlKey&&!event.metaKey&&!event.altKey)return {error:'Include Ctrl or Alt so typing stays unaffected.'};
    const parts=[];if(event.ctrlKey||event.metaKey)parts.push('CommandOrControl');if(event.shiftKey)parts.push('Shift');if(event.altKey)parts.push('Alt');
    const named={ArrowRight:'Right',ArrowLeft:'Left',ArrowUp:'Up',ArrowDown:'Down',' ':'Space'};
    const key=named[event.key]||(event.key.length===1?event.key.toUpperCase():event.key);
    if(!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Right|Left|Up|Down|Space|Enter|Tab|Home|End|PageUp|PageDown|Insert|Delete|Backspace)$/.test(key))return {error:'Choose a letter, number, arrow, or function key.'};
    parts.push(key);const value=parts.join('+');if(/^CommandOrControl\+Alt\+[A-Z]$/.test(value))return {error:'Add Shift; this combination types characters on some keyboards.'};
    return {value};
  }
  return {DEFAULTS,keycaps,capture};
});