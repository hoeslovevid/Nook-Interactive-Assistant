(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NookLife=factory();})(globalThis,()=>{
  function blink(now,seed=0){const shifted=now+seed*113,cycle=Math.floor(shifted/4200),phase=shifted%4200,start=2100+((cycle*977+seed*71)%1500),gap=phase-start;return gap>=0&&gap<160||cycle%4===0&&gap>=250&&gap<370;}
  function idle(now,seed=0,personality='playful'){const phase=((now*(personality==='calm'?.55:1)+seed*1703)%28000)/1000,result={gesture:'rest',x:0,y:0,lean:0,sx:1,sy:1,gaze:0,arm:0,mouth:0};
    if(personality==='focused'){result.gaze=Math.sin(now/3400)*.7;result.lean=Math.sin(now/5200)*.015;return result;}
    if(phase<2.4){const wave=Math.sin(Math.PI*phase/2.4);Object.assign(result,{gesture:'stretch',y:-wave*.7,sy:1+wave*.07,sx:1-wave*.045,arm:-wave*3});}
    else if(phase>7&&phase<9){const wave=Math.sin(Math.PI*(phase-7)/2);Object.assign(result,{gesture:'glance',lean:wave*.065,gaze:wave*2});}
    else if(phase>15&&phase<17.5){const wave=Math.sin(Math.PI*(phase-15)/2.5);Object.assign(result,{gesture:'yawn',sy:1-wave*.025,mouth:wave});}
    else if(phase>23&&phase<24.6){const wave=Math.sin(Math.PI*(phase-23)/1.6);Object.assign(result,{gesture:'nod',y:wave*.6,lean:-wave*.045});}
    return result;
  }
  function work(elapsed,personality='playful'){
    if(elapsed<90000||personality==='focused')return null;
    const phase=(elapsed-90000)%(personality==='calm'?90000:60000);
    if(phase>2200)return null;
    const stretch=Math.sin(Math.PI*phase/2200);
    return {y:-stretch*.4,lean:stretch*.025,sx:1-stretch*.025,sy:1+stretch*.035,arm:-stretch*1.5};
  }
  function transition(elapsed){if(elapsed>=650||elapsed<0)return {y:0,sx:1,sy:1};const t=elapsed/650;if(t<.18){const q=Math.sin(t/.18*Math.PI/2);return {y:q*.65,sx:1+q*.07,sy:1-q*.08};}const q=Math.sin((t-.18)/.82*Math.PI)*Math.exp(-(t-.18)*2);return {y:-q*1.4,sx:1-q*.04,sy:1+q*.05};}
  const smooth=t=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v);};
  // Deterministic gestures vary by task, with rests between actions. No timers
  // or allocations survive a frame, and every pose stays bounded.
  function performance(mood,elapsed,seed=0){
    const t=Math.max(0,elapsed)/1000,cycle=t%8,p={x:0,y:0,lean:0,sx:1,sy:1,gaze:0,gazeY:0,arm:0,brow:0,wink:0,activity:1};
    if(mood==='coding'){
      const burst=cycle<3.7||cycle>5.6,beat=burst?Math.sin(t*20):0;
      p.activity=burst?1:0;p.arm=beat*.8;p.y=burst?Math.abs(beat)*.14:0;p.gaze=burst?-.8:smooth((cycle-3.7)/.5)*1.4;p.gazeY=burst?.5:-.8;p.lean=burst?-.025:.035;p.brow=burst?.2:0;
    }else if(mood==='reading'){
      const line=t%2.8;p.gaze=-1.4+smooth(line/2.2)*2.8;p.gazeY=.7;p.lean=Math.sin(t*.8)*.018;
      if(line>2.3){const turn=Math.sin((line-2.3)/.5*Math.PI);p.arm=-turn*1.1;p.brow=turn*.25;}
    }else if(mood==='thinking'||mood==='focused'){
      p.gaze=Math.sin(Math.floor(t/3.2)+seed)*1.1;p.gazeY=-.8;p.brow=.3+Math.sin(t*1.3)*.15;
      const pause=t%7;if(pause>5.5){const q=Math.sin((pause-5.5)/1.5*Math.PI);p.lean=-q*.045;p.arm=-q*.6;}
    }else if(mood==='listening'){
      const nod=cycle>4.5&&cycle<5.8?Math.sin((cycle-4.5)/1.3*Math.PI*2):0;p.y=nod*.25;p.lean=-.035;p.gazeY=-.25;p.brow=.25;
    }else if(mood==='speaking'){
      p.arm=Math.sin(t*3.1)*.65;p.lean=Math.sin(t*2.2)*.025;p.gazeY=Math.sin(t*1.2)*.25;p.brow=Math.max(0,Math.sin(t*2.8))*.3;
    }else if(mood==='greeting'){
      p.wink=t>.55&&t<.78?Math.sin((t-.55)/.23*Math.PI):0;p.brow=.3;p.x=Math.sin(t*4)*.3;
    }else if(mood==='happy'||mood==='affection'){
      const beat=t%2.6;p.y=beat<.8?-Math.sin(beat/.8*Math.PI)*.6:0;p.brow=.25;p.lean=Math.sin(t*3)*.025;
    }else if(mood==='expectant'){
      p.gazeY=-.4;p.brow=.5;p.lean=Math.sin(t*.9)*.018;
    }else if(mood==='idle'||mood==='curious'){
      const glance=(t+seed*.73)%13;p.gaze=glance>8&&glance<10?Math.sin((glance-8)/2*Math.PI)*1.2:0;p.gazeY=glance>8&&glance<10?-.2:0;
    }
    return p;
  }
  function spring(position,velocity,target,dt,frequency=15,damping=.78){
    let x=position,v=velocity;const seconds=Math.max(0,Math.min(.064,dt/1000)),steps=Math.max(1,Math.ceil(seconds/.008)),h=seconds/steps;
    for(let i=0;i<steps;i++){v+=((target-x)*frequency*frequency-2*damping*frequency*v)*h;x+=v*h;}
    return {value:x,velocity:v};
  }
  return {blink,idle,work,transition,performance,spring};
});
