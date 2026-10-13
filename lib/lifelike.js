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
  return {blink,idle,work,transition};
});
