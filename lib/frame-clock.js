(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NookFrames=api.createFrameClock();})(globalThis,()=>{
 function createFrameClock({request=cb=>requestAnimationFrame(cb),cancel=id=>cancelAnimationFrame(id),setTimer=setTimeout,clearTimer=clearTimeout,now=()=>performance.now(),onError=e=>console.error('Pet frame:',e.message)}={}){
  const jobs=new Map();let serial=0,frame=0,timer=0,timerAt=0,ticking=false;
  function arm(){if(ticking)return;if(!jobs.size){if(frame)cancel(frame);if(timer)clearTimer(timer);frame=timer=0;return;}if(frame)return;let due=Infinity;for(const job of jobs.values())due=Math.min(due,job.due);const current=now(),wait=due-current;if(timer&&timerAt<=due-8)return;if(timer){clearTimer(timer);timer=0;}if(wait>18){timerAt=current+Math.max(0,wait-8);timer=setTimer(()=>{timer=0;frame=request(tick);},Math.max(0,wait-8));}else frame=request(tick);}
  function tick(time){frame=0;ticking=true;for(const [id,job]of [...jobs])if(job.due<=time+1){jobs.delete(id);try{job.callback(time);}catch(e){onError(e);}}ticking=false;arm();}
  return {schedule(callback,delay=0){const id=++serial;jobs.set(id,{callback,due:now()+Math.max(0,Number(delay)||0)});arm();return id;},cancel(id){jobs.delete(id);arm();},snapshot:()=>({jobs:jobs.size,frames:frame?1:0,timers:timer?1:0})};
 }
 return {createFrameClock};
});
