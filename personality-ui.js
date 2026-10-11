(()=>{
  let settings={};
  function paint(){for(const canvas of document.querySelectorAll('canvas')){for(const key of ['personality','intensity','speed','movement'])if(settings[key]!=null)canvas.dataset[key]=String(settings[key]);}}
  window.nook.onState(state=>{settings=state.everyday?.settings||{};paint();});
  new MutationObserver(paint).observe(document.body,{childList:true,subtree:true});
})();
