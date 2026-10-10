(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NookSeed=api;})(typeof window==='undefined'?globalThis:window,()=>{
  const BODY='M24 5 C29 12 40 16 40 29 C40 40 33 44 24 44 C15 44 8 40 8 29 C8 18 17 12 24 5Z';
  function color(canvas,name,fallback){return canvas.dataset[name]||getComputedStyle(document.documentElement).getPropertyValue('--'+name).trim()||fallback;}
  function draw(canvas,now,reduced){
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const p=canvas._nookPose,mood=canvas.dataset.mood||'idle',size=canvas.width;
    const sleepy=mood==='sleepy',happy=mood==='happy',focus=mood==='focused'||mood==='thinking',receiving=mood==='receiving';
    ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/48,size/48);ctx.translate(24,26);
    const breathe=reduced?0:Math.sin(now/900)*.018;
    ctx.translate(0,reduced?0:p.hopY);ctx.rotate(reduced?0:p.lean);ctx.scale(p.sx*(1+breathe),p.sy*(1-breathe));ctx.translate(-24,-26);
    const body=color(canvas,'body',color(canvas,'seed','#edf0f6'));
    const fill=ctx.createLinearGradient(12,8,36,44);fill.addColorStop(0,'#ffffff');fill.addColorStop(.32,body);fill.addColorStop(1,body);
    ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;ctx.fillStyle=fill;ctx.fill(new Path2D(BODY));ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=.6;ctx.stroke(new Path2D(BODY));
    ctx.fillStyle='rgba(15,20,35,.08)';ctx.beginPath();ctx.ellipse(24,40,9,2,0,0,Math.PI*2);ctx.fill();
    const ink=color(canvas,'ink','#13161c');
    // Two eyes give Nook expressive reactions while retaining its seed silhouette.
    for(const x of [18,30]){
      ctx.save();ctx.translate(x+p.lookX*.35,27+p.lookY*.25);ctx.scale(1,p.blink*(sleepy?.35:1));ctx.fillStyle=ink;
      if(happy){ctx.strokeStyle=ink;ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,1,3.4,Math.PI,Math.PI*2);ctx.stroke();}
      else{ctx.beginPath();ctx.ellipse(0,0,mood==='expectant'?4:3.3,focus?3.2:4.3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=color(canvas,'pupil',color(canvas,'lime','#b7c6ff'));ctx.beginPath();ctx.arc(p.lookX*.3,.5,1.6,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(-.9,-1.6,.7,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    ctx.strokeStyle=ink;ctx.lineWidth=1.1;ctx.lineCap='round';ctx.beginPath();
    if(receiving){ctx.fillStyle=ink;ctx.ellipse(24,34,3.3,4,0,0,Math.PI*2);ctx.fill();}
    else if(mood==='expectant'||mood==='curious'){ctx.arc(24,34,1.3,0,Math.PI*2);ctx.stroke();}
    else{ctx.moveTo(21.5,33);ctx.quadraticCurveTo(24,happy?37:35,26.5,33);ctx.stroke();}
    if(happy||mood==='curious'){ctx.fillStyle='rgba(225,136,157,.24)';for(const x of [13,35]){ctx.beginPath();ctx.ellipse(x,32,2.5,1.2,0,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
    if(mood==='thinking') {ctx.fillStyle=color(canvas,'pupil',color(canvas,'lime','#b7c6ff'));for(let i=0;i<3;i++){ctx.globalAlpha=reduced?.7:.3+.7*(.5+.5*Math.sin(now/250-i));ctx.beginPath();ctx.arc(size*(.36+i*.14),size*.08,size*.025,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  }
  function bind(canvas){if(canvas._nookBound)return;canvas._nookBound=true;canvas._nookAim={x:0,y:0};canvas._nookPose={lookX:0,lookY:0,lean:0,hopY:0,sx:1,sy:1,blink:1};
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');let last=0,hopStart=0,squishStart=0,previousHop=false,previousSquish=false;
    function step(now){if(!canvas.isConnected)return;const reduced=media.matches,dt=Math.min(64,now-last||16);last=now;const p=canvas._nookPose,aim=canvas._nookAim||{x:0,y:0},ease=1-Math.exp(-dt/85),mood=canvas.dataset.mood||'idle';
      p.lookX+=(Math.max(-3,Math.min(3,aim.x))-p.lookX)*ease;p.lookY+=(Math.max(-3,Math.min(3,aim.y))-p.lookY)*ease;
      const hop=canvas.classList.contains('is-hop')||canvas.classList.contains('is-happy')||mood==='happy',squish=canvas.classList.contains('is-squish')||canvas.classList.contains('is-hold')||mood==='receiving';
      if(hop&&!previousHop)hopStart=now;if(squish&&!previousSquish)squishStart=now;previousHop=hop;previousSquish=squish;
      const ht=(now-hopStart)/650,st=(now-squishStart)/420;const h=hopStart&&ht<1?Math.sin(Math.PI*ht):0,q=squishStart&&st<1?Math.sin(Math.PI*st):0;
      p.hopY=reduced?0:-h*5;p.sx=reduced?1:1+q*.16-h*.04;p.sy=reduced?1:1-q*.17+h*.06;
      p.lean=reduced?0:p.lean+((mood==='curious'?-.09:canvas.classList.contains('is-lean')?-.12:0)-p.lean)*ease;
      const blink=(now%5700)>5300&&(now%5700)<5450;p.blink=reduced?1:p.blink+((blink?.08:1)-p.blink)*ease;
      if(!document.hidden)draw(canvas,now,reduced);requestAnimationFrame(step);
    }requestAnimationFrame(step);
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();canvas._nookAim={x:((e.clientX-r.left)/r.width-.5)*6,y:((e.clientY-r.top)/r.height-.5)*6};});
    canvas.addEventListener('pointerleave',()=>{canvas._nookAim={x:0,y:0};});
  }
  function mount(){document.querySelectorAll('canvas.seed,canvas.brand-seed,canvas.preview-companion').forEach(bind);}
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();}
  return {bind,mount};
});