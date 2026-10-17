(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NookCompanion = api;
})(typeof window === "undefined" ? globalThis : window, () => {
  const OUTFITS = ["none", "cap", "glasses", "headphones", "scarf", "winter", "crown", "bow", "raincoat", "sunvisor", "wizard", "festive", "astronaut", "beret", "leaf", "halo", "hoodie", "detective", "chef", "robot", "pirate", "bee", "hiker", "fox", "dragon", "vampire", "graduate", "knight", "flower"];
  const LAYERS={hat:['none','cap','winter','crown','bow','sunvisor','wizard','festive','beret','leaf','halo','detective','chef','pirate','hiker','graduate','flower'],face:['none','glasses','headphones','robot'],clothing:['none','scarf','winter','raincoat','hoodie','detective','chef','bee','hiker','vampire','graduate','knight','dragon']};
  const SKINS={pearl:{name:'Porcelain',body:'#edf0f6',top:'#ffffff',ink:'#17202b',shine:.45},midnight:{name:'Obsidian',body:'#343b4b',top:'#647188',ink:'#f2f5ff',shine:.2},mint:{name:'Matcha',body:'#b7d6bc',top:'#f0f7de',ink:'#223b31',shine:.3},coral:{name:'Peach',body:'#efb7a9',top:'#fff2da',ink:'#54352f',shine:.3},lavender:{name:'Moonstone',body:'#b8b0df',top:'#f0e8ff',ink:'#34314f',shine:.4},aurora:{name:'Aurora',body:'#9ecfda',top:'#e3d7ff',ink:'#263d50',shine:.5}};
  function normalize(input = {}) {
    return {
      layered:input.layered===true,layers:Object.fromEntries(Object.entries(LAYERS).map(([k,v])=>[k,v.includes(input.layers?.[k])?input.layers[k]:'none'])),
      petPack:input.petPack&&['body','top','ink'].every(k=>/^#[\da-f]{6}$/i.test(input.petPack[k]||''))&&OUTFITS.includes(input.petPack.outfit)&&Object.hasOwn(SKINS,input.petPack.skin)?{name:String(input.petPack.name||'My Nook').slice(0,60),body:input.petPack.body,top:input.petPack.top,ink:input.petPack.ink,skin:input.petPack.skin,outfit:input.petPack.outfit}:null,
      petBodyMotion:input.petBodyMotion!==false,petProps:input.petProps!==false,petParticles:input.petParticles!==false,petInteractions:input.petInteractions!==false,petEntrances:input.petEntrances!==false,petAudio:input.petAudio!==false,petQuality:['adaptive','smooth','balanced'].includes(input.petQuality)?input.petQuality:'adaptive',
      skin:Object.hasOwn(SKINS,input.skin)?input.skin:'pearl',animationStyle:['calm','expressive','minimal'].includes(input.animationStyle)?input.animationStyle:'expressive',
      outfit: OUTFITS.includes(input.outfit) ? input.outfit : "none",
      seasonal: Boolean(input.seasonal),
      music: Boolean(input.music),
      voice: ["openai","offline","parakeet"].includes(input.voice) ? input.voice : "windows",
      voiceLanguage: typeof input.voiceLanguage === "string" && /^(auto|[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,3})$/i.test(input.voiceLanguage) ? input.voiceLanguage : "auto",
      remoteRelayEnabled:input.remoteRelayEnabled===true,remoteRelayUrl:(()=>{try{return (()=>{const u=new URL(input.remoteRelayUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))return '';return u.origin;})();}catch{return '';}})(),
      phoneDetails: Boolean(input.phoneDetails),
      phoneInstructions: Boolean(input.phoneInstructions),
      onboardingDone: Boolean(input.onboardingDone),
      phoneAutoStart: Boolean(input.phoneAutoStart),
      phonePort: Number.isInteger(input.phonePort) && input.phonePort >= 1024 && input.phonePort <= 65535 ? input.phonePort : 45821,
    };
  }
  function outfit(settings, date = new Date()) {
    const value = normalize(settings);
    if (!value.seasonal) return value.outfit;
    const month = date.getMonth();
    return month === 11 || month < 2
      ? "winter"
      : month >= 5 && month <= 7
        ? "sunvisor"
        : month === 9 ? "wizard" : "scarf";
  }
  function apply(canvas, settings, preview) {
    const p=normalize(settings),pack=p.petPack&&p.petPack.outfit===p.outfit&&p.petPack.skin===p.skin?p.petPack:null;for(const [key,value]of Object.entries({skin:p.skin,skinBody:pack?.body||SKINS[p.skin].body,skinTop:pack?.top||SKINS[p.skin].top,skinInk:pack?.ink||SKINS[p.skin].ink,animationStyle:p.animationStyle,...Object.fromEntries(['petBodyMotion','petProps','petParticles','petInteractions','petEntrances','petAudio','petQuality'].map(k=>[k,String(p[k])]))}))if(canvas.dataset[key]!==value)canvas.dataset[key]=value;
    const layered=p.layered&&!OUTFITS.includes(preview);canvas.dataset.layered=String(layered);for(const [key,value]of Object.entries(p.layers))if(canvas.dataset['layer'+key[0].toUpperCase()+key.slice(1)]!==value)canvas.dataset['layer'+key[0].toUpperCase()+key.slice(1)]=value;
    const next = OUTFITS.includes(preview) ? preview : layered?'none':outfit(settings);
    if (canvas.dataset.outfit !== next) canvas.dataset.outfit = next;
  }
  function agentColor(canvas, state, preferred) {
    const active =
      (state.sessions || []).find(
        (session) => session.agent === state.pending?.agent,
      ) ||
      (state.sessions || []).find((session) => session.id === preferred) ||
      (state.sessions || []).find((session) => !session.finished) ||
      (state.sessions || [])[0];
    const color = state.prefs?.colors?.[active?.agent];
    if (/^#[0-9a-f]{6}$/i.test(color || "")) { if (canvas.dataset.body !== color) canvas.dataset.body = color; }
    else if (canvas.dataset.body !== undefined) delete canvas.dataset.body;
  }
  function wardrobeStep(state, target, dt, reduced) {
    if (reduced) return { sway: 0, velocity: 0 };
    const step = Math.min(0.032, Math.max(0, dt / 1000));
    const velocity = (state.velocity + (target - state.sway) * 100 * step) * Math.exp(-9 * step);
    return { sway: Math.max(-1, Math.min(1, state.sway + velocity * step)), velocity };
  }
  function draw(ctx, outfit, accent = "#b7c6ff", pose = {}) {
    ctx.save();
    ctx.globalAlpha *= pose.alpha ?? 1;
    const sway = pose.sway || 0,tip=pose.tip||0,lag=pose.lag||0;
    if(['cap','beret','winter','wizard','festive','detective','chef','hiker','pirate','graduate'].includes(outfit)){ctx.translate(24,16);ctx.rotate(tip*.1);ctx.translate(-24,-16);}
    if(outfit==='halo'){ctx.translate(lag*.8,-Math.abs(tip)*.7);}
    ctx.translate(24, outfit === 'glasses' ? 27 : 18);
    ctx.rotate((pose.lookX || 0) * .016 + sway * .08);
    ctx.translate(-24 + (pose.lookX || 0) * .3, -(outfit === 'glasses' ? 27 : 18) + (pose.lookY || 0) * .18);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if(['detective','chef','robot','pirate','bee','hiker','fox','dragon','vampire','graduate','knight','flower'].includes(outfit)){drawNewOutfit(ctx,outfit,accent,{sway,tip,lag});}
    else if(outfit==='astronaut'){ctx.strokeStyle='#d8e7f1';ctx.lineWidth=2.7;ctx.beginPath();ctx.arc(24,25,17,Math.PI*.9,Math.PI*2.1);ctx.stroke();ctx.fillStyle='#8dc8da';ctx.fillRect(7,23,4,9);ctx.fillRect(37,23,4,9);ctx.strokeStyle='#ffffff99';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(24,25,14,3.6,4.6);ctx.stroke();}
    else if(outfit==='beret'){ctx.fillStyle='#a2657d';ctx.beginPath();ctx.ellipse(23,14,13,5,-.15,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#674354';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(23,10);ctx.lineTo(25,7);ctx.stroke();}
    else if(outfit==='leaf'){ctx.fillStyle='#6eaa83';ctx.beginPath();ctx.moveTo(24,13);ctx.bezierCurveTo(10,11,15,0,24,8);ctx.bezierCurveTo(33,-1,40,7,24,13);ctx.fill();ctx.strokeStyle='#47745a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(24,15);ctx.lineTo(24,7);ctx.stroke();}
    else if(outfit==='halo'){ctx.strokeStyle='#e7ca80';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(24,7,12,3,-.1,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#fff2bf';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(24,6.4,11,2.2,-.1,Math.PI,Math.PI*2);ctx.stroke();}
    else if(outfit==='hoodie'){ctx.fillStyle='#7d91b8';ctx.beginPath();ctx.moveTo(11,33);ctx.quadraticCurveTo(24,39,37,33);ctx.lineTo(35,43);ctx.quadraticCurveTo(24,47,13,43);ctx.closePath();ctx.fill();ctx.strokeStyle='#dee5f4';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(20,36);ctx.lineTo(19+tip*1.5,40+lag);ctx.moveTo(28,36);ctx.lineTo(29-tip,40-lag);ctx.stroke();}
    else if (outfit === "glasses") {
      ctx.strokeStyle = "#38445c";
      ctx.lineWidth = 1.4;
      for (const x of [18, 30]) {
        ctx.beginPath();
        ctx.arc(x, 27, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(23, 27);
      ctx.lineTo(25, 27);
      ctx.stroke();
    } else if (outfit === "headphones") {
      ctx.strokeStyle = "#38445c";
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(24, 27, 14, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(8, 23, 4, 10);
      ctx.fillRect(36, 23, 4, 10);
    } else if (outfit === "cap") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(24, 15, 11, 5, -0.15, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(31, 15, 10, 2, -0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (outfit === "scarf" || outfit === "winter") {
      ctx.fillStyle = outfit === "winter" ? "#db879c" : accent;
      ctx.fillRect(12, 36, 24, 4);
      ctx.beginPath(); ctx.moveTo(30, 39); ctx.quadraticCurveTo(35 + sway * 6, 40, 35 + sway * 4, 46); ctx.lineTo(30 + sway * 4, 46); ctx.quadraticCurveTo(29 + sway * 3, 43, 30, 39); ctx.fill();
      if (outfit === "winter") {
        ctx.beginPath();
        ctx.ellipse(24, 14, 11, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4f6fa";
        ctx.fillRect(13, 13, 22, 3);
        ctx.beginPath();
        ctx.arc(24, 7, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (outfit === 'crown') {
      ctx.fillStyle = '#efcd83'; ctx.beginPath(); ctx.moveTo(13, 16); ctx.lineTo(12, 8); ctx.lineTo(19, 12); ctx.lineTo(24, 6); ctx.lineTo(29, 12); ctx.lineTo(36, 8); ctx.lineTo(35, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(24, 13, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (outfit === 'bow') {
      ctx.fillStyle = '#db879c'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(24 + side * 5, 16, 5, 3, side * .35, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#f1b9c7'; ctx.beginPath(); ctx.arc(24, 16, 2, 0, Math.PI * 2); ctx.fill();
    } else if (outfit === 'sunvisor') {
      ctx.fillStyle = '#78cdb7'; ctx.fillRect(12, 13, 24, 3); ctx.beginPath(); ctx.ellipse(31, 16, 12, 2.8, -.12, 0, Math.PI * 2); ctx.fill();
    } else if (outfit === 'wizard') {
      ctx.fillStyle = '#7962b2'; ctx.beginPath(); ctx.moveTo(13, 15); ctx.lineTo(22, 1); ctx.quadraticCurveTo(25, 8, 34, 15); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#bba3ee'; ctx.beginPath(); ctx.ellipse(24, 16, 15, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#efd59b'; ctx.beginPath(); ctx.arc(23, 10, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7962b2'; ctx.beginPath(); ctx.arc(24, 9, 2, 0, Math.PI * 2); ctx.fill();
    } else if (outfit === 'festive') {
      ctx.fillStyle = '#dc797e'; ctx.beginPath(); ctx.moveTo(13, 15); ctx.lineTo(26, 3); ctx.lineTo(35, 15); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f5efda'; ctx.fillRect(13, 14, 22, 3); ctx.beginPath(); ctx.arc(26, 3, 2.4, 0, Math.PI * 2); ctx.fill();
    } else if (outfit === 'raincoat') {
      ctx.fillStyle = '#e9ce74'; ctx.beginPath(); ctx.moveTo(12, 35); ctx.quadraticCurveTo(24, 41, 36, 35); ctx.lineTo(36, 43); ctx.lineTo(12, 43); ctx.fill(); ctx.strokeStyle = '#aa9148'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(24, 38); ctx.lineTo(24, 43); ctx.stroke();
    }
    ctx.restore();
  }
  function drawNewOutfit(c,id,accent,{sway,tip,lag}){
    const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();},polygon=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();},line=(points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
    if(id==='detective'){ellipse(24,15,15,3,'#b7a083');polygon([[13,14],[16,7],[31,7],[35,14]],'#c6b18f');line([[15,12],[32,12]],'#655b53',2);polygon([[12,35],[22,38],[19,44],[12,43]],'#b7a083');polygon([[36,35],[26,38],[29,44],[36,43]],'#b7a083');}
    if(id==='chef'){c.fillStyle='#fcfaf3';c.fillRect(15,8,18,8);for(const [x,y]of [[16,7],[23,5],[31,7]])ellipse(x,y,5,4,'#fcfaf3');line([[15,15],[33,15]],'#cbd3df');polygon([[16,36],[32,36],[34,44],[14,44]],'#faf8ee');ellipse(24,40,1,1,'#64708c');}
    if(id==='robot'){line([[24,12],[24,5]],'#6d829b',1.5);ellipse(24+tip,4,2,2,accent);c.fillStyle='#8299ae';c.fillRect(7,23,4,9);c.fillRect(37,23,4,9);c.fillStyle='#54647e';c.fillRect(17,36,14,7);for(let i=0;i<3;i++)ellipse(20+i*4,39,1,1,i===1?'#7acfb3':accent);}
    if(id==='pirate'){polygon([[10,16],[14,8],[24,11],[34,8],[38,16]],'#343445');line([[11,16],[37,16]],'#dfc798',1.5);ellipse(24,13,2,2,'#f5f2e4');line([[13,21],[35,28]],'#343445',1.4);ellipse(30,27,5,4,'#343445');polygon([[15,36],[33,36],[30,42],[18,42]],'#b16d7e');}
    if(id==='bee'){line([[17,15],[15-tip,8]],'#544a49');line([[31,15],[33+tip,8]],'#544a49');ellipse(15-tip,7,2,2,'#e6bd55');ellipse(33+tip,7,2,2,'#e6bd55');ellipse(8,34+sway,5,8,'#d2e7efbb');ellipse(40,34-sway,5,8,'#d2e7efbb');c.fillStyle='#e6bd55';c.fillRect(13,35,22,8);c.fillStyle='#4d4a55';c.fillRect(13,38,22,2);}
    if(id==='hiker'){c.fillStyle='#8b9d80';c.fillRect(8,27,5,14);ellipse(24,15,15,3,'#b9a27e');polygon([[15,14],[18,7],[30,8],[34,14]],'#c8b38c');line([[16,12],[32,12]],'#7a705f',1.5);line([[14,36],[19,43]],'#6b7b63',2);line([[35,36],[30,43]],'#6b7b63',2);}
    if(id==='fox'){polygon([[10,19],[10,4],[22,14]],'#d59970');polygon([[38,19],[38,4],[26,14]],'#d59970');polygon([[12,15],[12,8],[18,14]],'#f2dfc7');polygon([[36,15],[36,8],[30,14]],'#f2dfc7');ellipse(24,39,10,4,'#f2dfc7');}
    if(id==='dragon'){polygon([[9,31],[2,22+tip],[4,39],[10,36]],'#8db69a');polygon([[39,31],[46,22-tip],[44,39],[38,36]],'#8db69a');polygon([[14,17],[14,6],[20,13]],'#d5bd8b');polygon([[34,17],[34,6],[28,13]],'#d5bd8b');ellipse(24,40,7,4,'#bdd6a5');}
    if(id==='vampire'){polygon([[11,32],[17,36],[14,45],[6,43]],'#635574');polygon([[37,32],[31,36],[34,45],[42,43]],'#635574');polygon([[13,33],[19,36],[16,41]],'#b47a8f');polygon([[35,33],[29,36],[32,41]],'#b47a8f');polygon([[20,36],[24,39],[20,41]],'#8f5c73');polygon([[28,36],[24,39],[28,41]],'#8f5c73');}
    if(id==='graduate'){polygon([[8,12],[24,6],[40,12],[24,18]],'#3c455e');c.fillStyle='#3c455e';c.fillRect(17,13,14,5);line([[36,13],[36+sway*3,24+lag]],'#d6b56e',1.3);ellipse(36+sway*3,24+lag,1.6,2.6,'#d6b56e');polygon([[14,36],[24,40],[34,36],[32,44],[16,44]],'#3c455e');}
    if(id==='knight'){ellipse(24,16,12,7,'#adb8c5');c.fillStyle='#8491a5';c.fillRect(12,15,24,4);line([[16,16],[32,16]],'#4f5d75',1.8);line([[24,8],[24,3]],accent,3);polygon([[35,33],[43,35],[42,42],[38,46],[34,42]],'#889cb7');line([[38,35],[38,43]],'#cdd9e8');}
    if(id==='flower'){for(let i=0;i<7;i++){const a=i/7*Math.PI*2;ellipse(24+Math.cos(a)*8,12+Math.sin(a)*5,3.5,3.5,i%2?'#c0aad8':'#d9c6e8');}ellipse(24,12,4,3,'#e9c779');polygon([[13,36],[24,40],[19,44],[11,40]],'#8ead87');polygon([[35,36],[24,40],[29,44],[37,40]],'#8ead87');}
  }
  function drawLayers(ctx,layers,accent,pose={}) {
    for(const [key,rect]of [['clothing',[0,34,48,14]],['face',[0,20,48,14]],['hat',[0,-3,48,23]]]){
      const value=LAYERS[key].includes(layers?.[key])?layers[key]:'none';if(value==='none')continue;
      ctx.save();ctx.beginPath();ctx.rect(...rect);ctx.clip();draw(ctx,value,accent,pose);ctx.restore();
    }
  }
  return { LAYERS, drawLayers, OUTFITS, SKINS, normalize, outfit, apply, agentColor, draw, wardrobeStep };
});
