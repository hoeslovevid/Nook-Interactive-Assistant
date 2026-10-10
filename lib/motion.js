(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NookMotion=api;})(typeof window==='undefined'?globalThis:window,()=>{
  function springProgress(t) { if(t>=1)return 1;if(t<=0)return 0;return 1-Math.exp(-8*t)*(Math.cos(9*t)+.55*Math.sin(9*t)); }
  function companionMood({pending=false,drop=false,receiving=false,thinking=false,celebrating=false,working=false,hover=false,sleeping=false}={}) {
    return receiving?'receiving':drop?'curious':pending?'expectant':celebrating?'happy':thinking?'thinking':working?'focused':hover?'curious':sleeping?'sleepy':'idle';
  }
  return {springProgress,companionMood};
});