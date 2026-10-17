(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NookResponsiveness=api;})(globalThis,()=>{
 function report(samples){const clean=samples.filter(v=>Number.isFinite(v)&&v>0&&v<1000).sort((a,b)=>a-b);if(clean.length<20)return {ok:false,error:'Keep the app visible while checking responsiveness.'};const p95=clean[Math.min(clean.length-1,Math.floor(clean.length*.95))],long=clean.filter(v=>v>50).length;return {ok:true,samples:clean.length,p95:Math.round(p95*10)/10,longFrames:long,withinBudget:p95<=35&&long<=3,budget:'95% of display frames within 35 ms; at most three frames above 50 ms.'};}
 return {report};
});
