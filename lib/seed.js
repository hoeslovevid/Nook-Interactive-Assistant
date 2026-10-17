(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NookSeed = api;
})(typeof window === "undefined" ? globalThis : window, () => {
  const BODY =
    "M24 5 C29 12 40 16 40 29 C40 40 33 44 24 44 C15 44 8 40 8 29 C8 18 17 12 24 5Z";
  function color(canvas, name, fallback) {
    return (
      canvas.dataset[name] || (name==='body'?canvas.dataset.skinBody:name==='ink'?(/^[#][0-9a-f]{6}$/i.test(canvas.dataset.body||'')?((parseInt(canvas.dataset.body.slice(1,3),16)*.2126+parseInt(canvas.dataset.body.slice(3,5),16)*.7152+parseInt(canvas.dataset.body.slice(5,7),16)*.0722)<110?'#f2f5ff':'#17202b'):canvas.dataset.skinInk):null) ||
      getComputedStyle(document.documentElement)
        .getPropertyValue("--" + name)
        .trim() ||
      fallback
    );
  }
  let speechActive=false,audioState={speech:{},input:{}};
  function moodOf(canvas, now) {
    const normal = canvas.dataset.mood || "idle";
    if (["expectant", "receiving"].includes(normal)||canvas.dataset.animationPreview==='true') return normal;
    if(speechActive&&canvas.dataset.petAudio!=='false'&&['idle','greeting','curious','listening','speaking'].includes(normal)&&!canvas.dataset.skinPreview&&!canvas.classList.contains('outfit-preview'))return 'speaking';
    return canvas._nookReaction && now < canvas._nookReaction.until
      ? canvas._nookReaction.mood
      : normal;
  }
  function react(canvas, mood, duration = 1200) {
    canvas._nookReaction = { mood, until: performance.now() + duration };
    canvas._nookWake?.();clearTimeout(canvas._nookReactionTimer);
    if(Number.isFinite(duration))canvas._nookReactionTimer=setTimeout(()=>{canvas._nookWake?.();},duration+20);
  }
  function draw(canvas, realNow, reduced, now=realNow) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = canvas._nookPose,
      mood = moodOf(canvas, realNow),
      size = canvas.width;
    const sleepy = mood === "sleepy",
      happy = mood === "happy",
      focus = ["focused", "thinking", "coding", "reading", "running"].includes(
        mood,
      ),
      receiving = mood === "receiving";
    ctx.clearRect(0, 0, size, size);
    const theatre=window.NookTheatre,face=p.face||{},outline=new Path2D(theatre&&canvas.dataset.petBodyMotion!=='false'?theatre.bodyPath(p.bend,p.compression,p.ripple):BODY);
    ctx.save();ctx.scale(size/48,size/48);ctx.fillStyle='rgba(0,0,0,.14)';ctx.beginPath();ctx.ellipse(24,45,Math.max(5,11-Math.abs(p.hopY||0)*.6),1.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();
    ctx.scale(size / 48, size / 48);
    ctx.translate(24, 26);
    const breathe = reduced ? 0 : Math.sin((now+p.phase*127) / 900) * 0.012;
    ctx.translate(reduced?0:p.shiftX||0, reduced ? 0 : p.hopY);
    ctx.rotate(reduced ? 0 : p.lean);
    ctx.scale(p.sx * (1 + breathe), p.sy * (1 - breathe));
    ctx.translate(-24, -26);
    const body = color(canvas, "body", color(canvas, "seed", "#edf0f6"));
    const fill = ctx.createLinearGradient(12, 8, 36, 44);
    const skin=window.NookCompanion?.SKINS?.[canvas.dataset.skin]||{top:"#ffffff",shine:.45};
    fill.addColorStop(0, canvas.dataset.skinTop||skin.top);
    fill.addColorStop(0.32, body);
    fill.addColorStop(1, body);
    ctx.shadowColor = "rgba(0,0,0,.22)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = fill;
    ctx.fill(outline);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.save();ctx.clip(outline);ctx.globalAlpha*=skin.shine;const sheen=ctx.createRadialGradient(18+p.lookX,15+p.lookY,1,22,22,24);sheen.addColorStop(0,'#ffffff');sheen.addColorStop(1,'#ffffff00');ctx.fillStyle=sheen;ctx.fillRect(8,5,32,39);ctx.restore();
    // Small hands make work and approval reactions readable at notch size.
    if (
      [
        "coding",
        "expectant",
        "receiving",
        "happy",
        "greeting",
        "dancing", "idle", "speaking", "listening",
      ].includes(mood)
    ) {
      ctx.fillStyle = body;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          24 + side * 15,
          32 + (side === 1 ? p.arm : p.arm*.65),
          3,
          4,
          side * 0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.strokeStyle = document.documentElement.dataset.scheme==='light'?"rgba(70,80,105,.30)":"rgba(255,255,255,.42)";
    ctx.lineWidth = 0.6;
    ctx.stroke(outline);
    ctx.fillStyle = "rgba(15,20,35,.08)";
    ctx.beginPath();
    ctx.ellipse(24, 40, 9, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    const ink = color(canvas, "ink", "#13161c");
    // Two eyes give Nook expressive reactions while retaining its seed silhouette.
    for (const x of [18, 30]) {
      ctx.save();
      ctx.translate(x + (p.lookX + p.gaze+(face.gazeX||0)) * 0.35, 27 + (p.lookY+(p.gazeY||0)+(face.gazeY||0)) * 0.25);
      if(!reduced&&x===30)ctx.scale(1,1-(p.wink||0)*.9);
      ctx.scale(1, p.blink * (x===18?(face.left??1):(face.right??1)));
      ctx.fillStyle = ink;
      if (mood === "dizzy") {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.2) {
          const r = a * 0.25;
          const px = Math.cos(a) * r,
            py = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else if (mood === "annoyed") {
        ctx.fillRect(-3, -1, 6, 2);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, -4);
        ctx.lineTo(3, -2);
        ctx.stroke();
      } else if ((face.smile||0)>.8&&(face.left||0)<.8) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 1, 3.4, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          mood === "expectant" ? 4 : 3.3,
          focus ? 3.2 : 4.3,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = color(
          canvas,
          "pupil",
          color(canvas, "lime", "#b7c6ff"),
        );
        ctx.beginPath();
        ctx.arc(p.lookX * 0.3, 0.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.beginPath();
        ctx.arc(-0.9, -1.6, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if(p.brow>.05||face.browLeft>.05||face.browRight>.05){ctx.save();ctx.strokeStyle=ink;ctx.globalAlpha=.6;ctx.lineWidth=.8;ctx.lineCap='round';for(const [x,lift]of [[18,face.browLeft||0],[30,face.browRight||0]]){ctx.beginPath();ctx.moveTo(x-2.5,21-lift*2);ctx.quadraticCurveTo(x,20-lift*2.8,x+2.5,21-lift);ctx.stroke();}ctx.restore();}
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (receiving || mood === "speaking" || p.mouth > .05) {
      ctx.fillStyle = ink;
      ctx.ellipse(24, 34, mood === "speaking" ? 1.4+(1-(face.round||0))*1.2 : 3.3, reduced ? 1.8 : mood === "speaking" ? .35+(face.mouth||0)*3 : p.mouth ? 1+p.mouth*2.7 : 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if ((face.round||0)>.25) {
      ctx.arc(24, 34, 1.3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.moveTo(21.5, 33);
      ctx.quadraticCurveTo(24, 33+(face.smile??.35)*4, 26.5, 33);
      ctx.stroke();
    }
    if (happy || mood === "curious" || (face.cheek||0)>.1) {
      ctx.fillStyle = "rgba(225,136,157,"+(.15+(face.cheek||0)*.2)+")";
      for (const x of [13, 35]) {
        ctx.beginPath();
        ctx.ellipse(x, 32-(face.smile||0)*.4, 2.5, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (window.NookCompanion)
      window.NookCompanion.draw(
        ctx,
        p.outfit,
        color(canvas, "pupil", color(canvas, "lime", "#b7c6ff")),
        { lookX: p.lookX, lookY: p.lookY, sway: p.wardrobe?.sway, tip:p.tip,lag:p.lag,alpha: p.outfitAlpha },
      );
    if (p.previousOutfit && p.outfitAlpha < 1) window.NookCompanion.draw(ctx, p.previousOutfit, color(canvas, 'pupil', '#b7c6ff'), { lookX: p.lookX, lookY: p.lookY, sway: p.wardrobe?.sway, tip:p.tip,lag:p.lag,alpha: 1 - p.outfitAlpha });
    if(canvas.dataset.layered==='true'&&window.NookCompanion)window.NookCompanion.drawLayers(ctx,{hat:canvas.dataset.layerHat,face:canvas.dataset.layerFace,clothing:canvas.dataset.layerClothing},color(canvas,'pupil','#b7c6ff'),{lookX:p.lookX,lookY:p.lookY,sway:p.wardrobe?.sway,tip:p.tip,lag:p.lag});
    if(canvas.dataset.petProps!=='false'){ctx.save();if(theatre?.WORK.includes(mood))ctx.globalAlpha*=reduced?1:theatre.ease((canvas._nookPreview?now:realNow-(canvas._nookScene?.started||realNow))/650);
    // Task props are original vector artwork, kept inside the canvas bounds.
    if (mood === "reading") {
      ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#b7c6ff"));
      ctx.beginPath();
      ctx.moveTo(13, 37);
      ctx.quadraticCurveTo(19, 35, 24, 38);
      ctx.quadraticCurveTo(29, 35, 35, 37);
      ctx.lineTo(35, 44);
      ctx.quadraticCurveTo(29, 42, 24, 45);
      ctx.quadraticCurveTo(19, 42, 13, 44);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(19,22,28,.45)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(24, 38);
      ctx.lineTo(24, 44);
      ctx.stroke();
      if(!reduced){const turn=(now/1400)%1;if(turn>.65){const reach=Math.cos((turn-.65)/.35*Math.PI)*10;ctx.fillStyle='#f4f6fa';ctx.beginPath();ctx.moveTo(24,38);ctx.lineTo(24+reach,37);ctx.lineTo(24+reach,43);ctx.lineTo(24,45);ctx.closePath();ctx.fill();}}

    }
    if (mood === "coding") {
      ctx.fillStyle = "#333c53";
      ctx.fillRect(12, 38, 24, 7);
      ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#b7c6ff"));
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 6; col++)
          ctx.fillRect(14 + col * 3.3, 40 + row * 2, 2, 1);
      if(!reduced){const key=Math.floor(now/130)%12;ctx.fillStyle='#f4f6fa';ctx.fillRect(14+(key%6)*3.3,40+Math.floor(key/6)*2,2,1);}

    }
    if (mood === "running") {
      ctx.fillStyle = "#333c53";
      ctx.fillRect(30, 35, 13, 9);
      ctx.strokeStyle = color(
        canvas,
        "pupil",
        color(canvas, "lime", "#b7c6ff"),
      );
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 38);
      ctx.lineTo(34, 39.5);
      ctx.lineTo(32, 41);
      ctx.moveTo(36, 41);
      if(reduced||Math.floor(now/450)%2===0)ctx.lineTo(40, 41);
      ctx.stroke();

    }
    window.NookTheatre?.drawProps?.(ctx,mood,canvas._nookPreview?now:realNow-(canvas._nookScene?.started||realNow),color(canvas,'pupil','#b7c6ff'),Number(canvas.dataset.taskProgress),reduced);ctx.restore();
    }
    ctx.restore();
    if(receiving&&canvas.dataset.petProps!=='false'){ctx.save();ctx.scale(size/48,size/48);const flight=reduced?1:Math.min(1,(realNow-(canvas._nookReceiveStart||realNow))/650);ctx.translate(41-flight*15,9+flight*20);ctx.rotate((1-flight)*.4);ctx.fillStyle='#dbe0f1';ctx.fillRect(-4,-5,8,10);ctx.fillStyle=color(canvas,'pupil','#b7c6ff');ctx.fillRect(-2,-2,4,1);ctx.fillRect(-2,0,3,1);ctx.restore();}
    if (canvas.dataset.petParticles!=='false'&&["sleepy", "happy", "receiving"].includes(mood)) {
      ctx.save();
      ctx.scale(size / 48, size / 48);
      ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#b7c6ff"));
      if (mood === "sleepy") {
        ctx.font = "bold 5px Segoe UI";
        ctx.fillText("z", 36, reduced ? 11 : 13 - ((now / 700) % 5));
        ctx.fillText("z", 41, reduced ? 6 : 8 - ((now / 900) % 4));
      }
      if (mood === "happy") {
        for (const [x, y] of [
          [7, 12],
          [40, 8],
        ]) {
          const r = reduced ? 2 : 1.5 + Math.sin(now / 150) * 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y - r);
          ctx.lineTo(x + r * 0.4, y);
          ctx.lineTo(x, y + r);
          ctx.lineTo(x - r * 0.4, y);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (mood === "receiving") {
        const y = reduced ? 8 : 3 + ((now / 1000) % 1) * 12;
        ctx.fillRect(21, y, 6, 7);
        ctx.fillStyle = "#13161c";
        ctx.fillRect(22, y + 2, 4, 0.7);
        ctx.fillRect(22, y + 4, 3, 0.7);
      }
      ctx.restore();
    }
    if (mood === "dancing"&&canvas.dataset.petParticles!=='false') {
      ctx.save();
      ctx.scale(size / 48, size / 48);
      ctx.font = "bold 7px Segoe UI";
      ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#b7c6ff"));
      ctx.fillText("♪", 4, reduced ? 17 : 17 + Math.sin(now / 200) * 2);
      ctx.fillText("♫", 39, reduced ? 11 : 11 + Math.cos(now / 200) * 2);
      ctx.restore();
    }
    if (mood === "affection"&&canvas.dataset.petParticles!=='false') {
      ctx.save();
      ctx.scale(size / 48, size / 48);
      ctx.fillStyle = "#eea3bd";
      for (const [x, y] of [
        [7, 12],
        [39, 8],
      ]) {
        const lift = reduced ? 0 : Math.sin(now / 350) * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + lift + 4);
        ctx.bezierCurveTo(
          x - 8,
          y + lift - 1,
          x - 3,
          y + lift - 6,
          x,
          y + lift - 2,
        );
        ctx.bezierCurveTo(
          x + 3,
          y + lift - 6,
          x + 8,
          y + lift - 1,
          x,
          y + lift + 4,
        );
        ctx.fill();
      }
      ctx.restore();
    }
    if (canvas.dataset.petParticles!=='false'&&(mood === "thinking" || mood === "listening")) {
      ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#b7c6ff"));
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = reduced
          ? 0.7
          : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now / 250 - i));
        ctx.beginPath();
        ctx.arc(
          size * (0.36 + i * 0.14),
          size * 0.08,
          size * 0.025,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  function bind(canvas) {
    if (canvas._nookBound) return;
    canvas._nookBound = true;
    canvas._nookAim = { x: 0, y: 0 };
    canvas._nookPose = {
      phase: Math.floor(Math.random()*1000), mouth:0, shiftX:0,face:{},bend:0,compression:0,ripple:0,tip:0,lag:0,petEnergy:0,
      lookX: 0,
      lookY: 0,
      lean: 0,
      hopY: 0,
      sx: 1,
      sy: 1,
      blink: 1,
      gaze: 0,
      arm: 0,
      wardrobe: { sway: 0, velocity: 0 }, outfit: canvas.dataset.outfit, outfitAlpha: 1, outfitTime: 0,
    };
    const idleDirector=window.NookTheatre?.createIdle(canvas._nookPose.phase);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, frame = 0;
    const clock=window.NookFrames;
    function stop(){clock.cancel(frame);frame=0;}
    function schedule(delay=0){if(frame||!visible||document.hidden)return;frame=clock.schedule(step,delay);}
    canvas._nookWake = schedule;
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) { last = 0; schedule(); } else stop();
    });
    visibility.observe(canvas);
    const changes = new MutationObserver(records => { if (records.some(record => record.oldValue !== canvas.getAttribute(record.attributeName))) schedule(); });
    changes.observe(canvas, { attributes: true, attributeOldValue:true, attributeFilter: ['data-mood', 'data-outfit', 'data-body', 'data-pupil', 'data-eyes', 'data-accessory', 'data-skin','data-skin-body','data-skin-top','data-skin-ink', 'data-animation-style','data-layered','data-layer-hat','data-layer-face','data-layer-clothing','data-pet-body-motion','data-pet-props','data-pet-particles','data-pet-quality','data-pet-interactions','data-pet-audio','class'] });
    const onVisibility = () => { if (document.hidden) stop(); else { last = 0; schedule(); } };
    const onMotion = () => { stop(); schedule(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('nook-motion-change', onMotion);
    media.addEventListener('change', onMotion);
    canvas._nookDispose = () => {
      stop(); clearTimeout(affectionTimer);clearTimeout(pressTimer);clearTimeout(canvas._nookReactionTimer);canvas._nookWake=null;canvas._nookDisposed=true; visibility.disconnect(); changes.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('nook-motion-change', onMotion);
      media.removeEventListener('change', onMotion);
    };
    let last = 0,
      hopStart = 0,
      squishStart = 0,
      previousHop = false,
      previousSquish = false,
      lastMood = "",
      moodStart = 0;
    let lastInteraction=0,stroke=null,pressTimer;
    function step(now) {
      frame = 0;
      if (!canvas.isConnected) { canvas._nookDispose(); return; }
      if (!visible || document.hidden) return;
      const mode = document.documentElement.dataset.motion || 'full';
      const reduced = media.matches || mode === 'reduced',
        dt = Math.min(64, now - last || 16);
      last = now;
      const p = canvas._nookPose,
        aim = canvas._nookAim || { x: 0, y: 0 },
        ease = canvas._nookPreview?.paused?1:1 - Math.exp(-dt / 85),
        mood = moodOf(canvas,now);
      const styleScale=canvas.dataset.animationStyle==='minimal'?.25:canvas.dataset.animationStyle==='calm'?.6:1;
      const intensity=styleScale*Math.max(0,Math.min(1.5,Number(canvas.dataset.intensity ?? 1))),speed=Math.max(.5,Math.min(1.5,Number(canvas.dataset.speed ?? 1))),animationNow=canvas._nookPreview?previewTime(canvas,now):now*speed;
      const sceneElapsed=canvas._nookPreview?animationNow:Math.max(0,(now-(mood!==lastMood?now:moodStart))*speed);
      const theatre=window.NookTheatre,oldMood=lastMood;
      if (mood !== lastMood) {
        lastMood = mood;
        moodStart = now;idleDirector?.reset(animationNow);canvas._nookScene={mood,started:now,previous:oldMood};
        if(mood==='receiving')canvas._nookReceiveStart=now;
      }
      let motion = window.NookMotion
        ? window.NookMotion.companionPose(mood, sceneElapsed, reduced)
        : { y: 0, lean: 0, sx: 1, sy: 1, gaze: 0, arm: 0 };
      const idle = !reduced && ['idle','curious'].includes(mood) && idleDirector ? idleDirector.update(animationNow,canvas.dataset.personality) : null;
      p.mouth = reduced ? 0 : (p.mouth||0)+((idle?.mouth||0)-(p.mouth||0))*ease;
      const acting=!reduced&&window.NookLife?.performance?window.NookLife.performance(mood,sceneElapsed,p.phase):null;
      const scene=!reduced&&theatre?.scene(mood,sceneElapsed);canvas.dataset.performanceStage=scene?.stage||'still';if(scene){if(['happy','proud','relieved','triumph','oops','coffee','peekaboo','bow','parcel','reminder','conductor','snooze','sparkle','stretch'].includes(mood))motion={...motion,...scene};else motion={...motion,x:(motion.x||0)+scene.x,y:motion.y+scene.y,lean:motion.lean+scene.lean,gaze:motion.gaze+scene.gaze,arm:motion.arm+scene.arm};if(theatre.WORK.includes(mood)&&sceneElapsed<850)motion.arm*=theatre.ease(sceneElapsed/850);if(['idle','curious'].includes(mood)&&theatre.WORK.includes(canvas._nookScene?.previous)&&sceneElapsed<800)canvas.dataset.performanceStage='settle';}
      if(acting)motion={...motion,x:(motion.x||0)+acting.x,y:motion.y+acting.y,lean:motion.lean+acting.lean,gaze:['coding','reading'].includes(mood)?acting.gaze:motion.gaze+acting.gaze,arm:motion.arm*acting.activity+acting.arm};
      for(const key of ['gazeY','brow','wink'])p[key]=reduced?0:(p[key]||0)+(((acting?.[key]||0)+(idle?.[key]||0)+(scene?.[key]||0))-(p[key]||0))*ease;
      if(idle)motion={...motion,y:motion.y+idle.y,lean:motion.lean+idle.lean,sx:motion.sx*idle.sx,sy:motion.sy*idle.sy,gaze:motion.gaze+idle.gaze,arm:motion.arm+idle.arm};
      const stretch=!reduced&&['focused','thinking','coding','reading','running'].includes(mood)&&window.NookLife?.work((now-moodStart)*speed,canvas.dataset.personality);
      if(stretch)motion={...motion,y:motion.y+stretch.y,lean:motion.lean+stretch.lean,sx:motion.sx*stretch.sx,sy:motion.sy*stretch.sy,arm:motion.arm+stretch.arm};
      if(!reduced&&window.NookLife?.transition){const anticipation=window.NookLife.transition(sceneElapsed);motion={...motion,y:motion.y+anticipation.y,sx:motion.sx*anticipation.sx,sy:motion.sy*anticipation.sy};}
      motion={...motion,y:motion.y*intensity,lean:motion.lean*intensity,sx:1+(motion.sx-1)*intensity,sy:1+(motion.sy-1)*intensity,arm:motion.arm*intensity};
      if(idle)motion.x=(motion.x||0)+Math.sin(animationNow/7000+p.phase)*Math.max(0,Math.min(2,Number(canvas.dataset.movement ?? 1)))*1.2*intensity;
      const entranceCue=canvas._nookEntrance;
      if(!reduced&&entranceCue&&canvas.dataset.petEntrances!=='false'&&theatre){const elapsed=now-entranceCue.start;if(elapsed<750){const entry=theatre.entrance(entranceCue.mode,elapsed);motion={...motion,y:motion.y+entry.y,arm:motion.arm+entry.arm,lean:motion.lean+entry.lean};}else canvas._nookEntrance=null;}
      if(canvas.dataset.petBodyMotion!=='false'&&!reduced&&theatre){for(const [key,target]of [['bend',motion.lean*10+(p.lookX||0)*.12],['compression',(motion.sy-1)*9],['ripple',Math.sin(sceneElapsed/95)*Math.min(.45,Math.abs(p.hopVelocity||0)*.05)]]){const r=canvas._nookPreview?.paused?{value:target,velocity:0}:window.NookLife.spring(p[key]||0,p[key+'Velocity']||0,target,dt,18,.65);p[key]=r.value;p[key+'Velocity']=r.velocity;}}else p.bend=p.compression=p.ripple=0;
      const a=canvas._nookPreviewAudio||audioFor(mood,now),expression=canvas._nookPreview?.expression||(idle?.gesture==='dozing'?'dozing':['idle','curious'].includes(mood)&&canvas._nookScene?.previous==='happy'&&sceneElapsed<800?'relieved':mood);
      if(canvas.dataset.petInteractions==='false')p.petEnergy=0;
      if(theatre){const target=theatre.face(expression,sceneElapsed,canvas.dataset.petAudio==='false'?{}:a,p.petEnergy);for(const [key,value]of Object.entries(target))p.face[key]=reduced?value:(p.face[key]??value)+(value-(p.face[key]??value))*ease;}
      if(!reduced&&canvas.dataset.petAudio!=='false'&&mood==='listening')motion.sy+=Math.min(.025,(a.level||0)*.025);
      if(!reduced&&p.petEnergy>.1&&canvas.dataset.petInteractions!=='false'){motion.lean+=Math.sign(aim.x||1)*p.petEnergy*.08;motion.y+=p.petEnergy*.35;}p.petEnergy*=Math.exp(-dt/1200);
      p.shiftX = reduced ? 0 : (p.shiftX||0)+((motion.x||0)-(p.shiftX||0))*ease;
      if (p.outfit !== canvas.dataset.outfit) { p.previousOutfit = p.outfit; p.outfit = canvas.dataset.outfit; p.outfitTime = now; }
      p.outfitAlpha = reduced ? 1 : Math.min(1, (now - p.outfitTime) / 220);
      if (window.NookCompanion) p.wardrobe = window.NookCompanion.wardrobeStep(p.wardrobe, p.lookX * .1 + motion.lean * 3 + (canvas.classList.contains('is-squish') ? .8 : 0), dt, reduced);
      if(!reduced&&window.NookLife){for(const [key,target]of [['tip',motion.lean*4+p.arm*.025],['lag',(p.tip||0)-motion.lean*4]]){const r=canvas._nookPreview?.paused?{value:target,velocity:0}:window.NookLife.spring(p[key]||0,p[key+'Velocity']||0,target,dt,key==='tip'?11:8,.55);p[key]=r.value;p[key+'Velocity']=r.velocity;}}else p.tip=p.lag=0;
      p.gaze += (motion.gaze-p.gaze)*ease;
      p.arm += (motion.arm-p.arm)*ease;
      p.lookX += (Math.max(-3, Math.min(3, aim.x)) - p.lookX) * ease;
      p.lookY += (Math.max(-3, Math.min(3, aim.y)) - p.lookY) * ease;
      const hop =
          canvas.classList.contains("is-hop") ||
          canvas.classList.contains("is-happy") ||
          mood === "happy",
        squish =
          canvas.classList.contains("is-squish") ||
          canvas.classList.contains("is-hold") ||
          mood === "receiving";
      if (hop && !previousHop) hopStart = now;
      if (squish && !previousSquish) squishStart = now;
      previousHop = hop;
      previousSquish = squish;
      const ht = (now - hopStart) / 650,
        st = (now - squishStart) / 420;
      const h = !canvas._nookPreview&&hopStart && ht < 1 ? Math.sin(Math.PI * ht) : 0,
        q = !canvas._nookPreview&&squishStart && st < 1 ? Math.sin(Math.PI * st) : 0;
      const targetY=motion.y-h*3;
      if(!reduced&&window.NookLife?.spring){const result=canvas._nookPreview?.paused?{value:targetY,velocity:0}:window.NookLife.spring(p.hopY,p.hopVelocity||0,targetY,dt);p.hopY=result.value;p.hopVelocity=result.velocity;}else{p.hopY=0;p.hopVelocity=0;}
      p.sx = reduced ? 1 : p.sx+(motion.sx+q*.16-h*.04-p.sx)*ease;
      p.sy = reduced ? 1 : p.sy+(motion.sy-q*.17+h*.06-p.sy)*ease;
      p.lean = reduced
        ? 0
        : p.lean +
          ((canvas.classList.contains("is-lean") ? -0.12 : motion.lean) -
            p.lean) *
            ease;
      const blink = window.NookLife ? window.NookLife.blink(animationNow,p.phase) : now % 5700 > 5300 && now % 5700 < 5450;
      p.blink = reduced||canvas._nookPreview?.paused ? 1 : p.blink + ((blink ? 0.08 : 1) - p.blink) * ease;
      draw(canvas, now, reduced, animationNow);
      canvas._nookFrames = (canvas._nookFrames || 0) + 1;
      const fps=theatre?.frameRate({reduced,economy:mode==='economy',quality:canvas.dataset.petQuality,active:theatre.WORK.includes(mood)||['happy','speaking','listening','greeting','receiving','dancing','triumph','oops','coffee','peekaboo','bow','parcel','reminder','conductor','snooze','sparkle','stretch'].includes(mood)||now-lastInteraction<1800||Boolean(canvas._nookEntrance)||Boolean(canvas._nookPreview),paused:canvas._nookPreview?.paused,sleepy:mood==='sleepy'})||0;canvas._nookFPS=fps;if(fps)schedule(fps>=60?0:Math.max(0,1000/fps-8));
    }
    let pokes = [],
      pointerStart = null;
    let affectionTimer;
    canvas.addEventListener("pointerenter", () => {
      if(canvas.dataset.petInteractions==='false')return;lastInteraction=performance.now();
      affectionTimer = setTimeout(() => {
        if (!["expectant", "receiving"].includes(canvas.dataset.mood))
          react(canvas, "affection", 1800);
      }, 2000);
    });
    if (
      canvas.classList.contains("seed") &&
      !canvas.classList.contains("outfit-preview")
    )
      react(canvas, "greeting", 1500);
    canvas.addEventListener("pointerdown", (event) => {
      if(event.button!==0||canvas.dataset.petInteractions==='false')return;lastInteraction=performance.now();
      pressTimer=setTimeout(()=>{if(pointerStart){react(canvas,'curious',1400);canvas._nookPose.petEnergy=.5;}},550);
      pointerStart = { x: event.clientX, y: event.clientY, time:performance.now() };
    });
    canvas.addEventListener("pointerup", (event) => {
      clearTimeout(pressTimer);if(canvas.dataset.petInteractions==='false'||event.button!==0)return;
      const press=pointerStart;pointerStart=null;
      if (
        !press ||
        Math.hypot(
          event.clientX - press.x,
          event.clientY - press.y,
        ) > 6
      )
        return;
      const now = performance.now();if(now-press.time>550){react(canvas,'affection',1600);canvas._nookPose.petEnergy=.7;return;}
      pokes = pokes.filter((time) => now - time < 1700);
      pokes.push(now);
      canvas.dispatchEvent(new CustomEvent('nook-pet-interaction', { bubbles: true }));
      react(
        canvas,
        pokes.length >= 4 ? "dizzy" : pokes.length >= 2 ? "annoyed" : "happy",
        pokes.length >= 4 ? 2200 : 900,
      );
    });
    canvas.addEventListener("pointermove", (e) => {
      if(canvas.dataset.petInteractions==='false')return;lastInteraction=performance.now();
      const r = canvas.getBoundingClientRect();
      if(window.NookTheatre){stroke=window.NookTheatre.petStroke(stroke,{x:(e.clientX-r.left)*48/Math.max(1,r.width),y:(e.clientY-r.top)*48/Math.max(1,r.height),time:performance.now(),buttons:e.buttons});if(stroke.trigger){canvas._nookPose.petEnergy=stroke.energy;react(canvas,'affection',900);}}
      if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6){clearTimeout(pressTimer);pointerStart=null;}
      schedule();
      canvas._nookAim = {
        x: ((e.clientX - r.left) / r.width - 0.5) * 6,
        y: ((e.clientY - r.top) / r.height - 0.5) * 6,
      };
    });
    canvas.addEventListener("pointercancel",()=>{clearTimeout(pressTimer);pointerStart=null;stroke=null;});
    canvas.addEventListener("pointerleave", () => {
      clearTimeout(affectionTimer);clearTimeout(pressTimer);pointerStart=null;stroke=null;
      canvas._nookAim = { x: 0, y: 0 };
      schedule();
    });
  }
  function previewTime(canvas,now){const p=canvas._nookPreview;return p.paused?p.time:p.time+(now-p.started)*p.speed;}
  function preview(canvas,options={}){const current=canvas._nookPreview||{time:0,speed:1,paused:false,started:performance.now()},time=previewTime({_nookPreview:current},performance.now());canvas._nookPreview={...current,time,...options,started:performance.now()};canvas.dataset.animationPreview='true';if(options.mood)canvas.dataset.mood=options.mood;canvas._nookReaction=null;if(options.mood&&canvas._nookPose)canvas._nookPose.petEnergy=0;canvas._nookWake?.();}
  function entrance(canvas,mode,previous){if(mode===previous||canvas.dataset.petEntrances==='false')return;canvas._nookEntrance={mode:mode==='asleep'?'retreat':mode==='peek'?'peek':'emerge',start:performance.now()};canvas._nookWake?.();}
  function audioFor(mood,now){const data=audioState[mood==='speaking'?'speech':'input']||{};return now-data.time<Math.max(350,data.duration||0)?data:{};}
  function audio(value){if(!value||!['speech','input'].includes(value.kind))return;audioState[value.kind]={...value,level:Math.max(0,Math.min(1,Number(value.level)||0)),time:performance.now()};for(const c of document.querySelectorAll('canvas.seed,canvas.home-pet,canvas.chat-hero-pet,#voice-pet'))if(c.dataset.petAudio!=='false')c._nookWake?.();}
  function mount() {
    document
      .querySelectorAll(
        "canvas.seed,canvas.brand-seed,canvas.preview-companion",
      )
      .forEach(bind);
  }
  if (typeof document !== "undefined") {
    window.nook?.onPetAudio?.(audio);
    if (window.nook?.onState) window.nook.onState(state => {
      const root = document.documentElement;const speaking=state.speech?.phase==='speaking';if(speechActive!==speaking){speechActive=speaking;if(!speaking)audioState.speech={};for(const c of document.querySelectorAll('canvas.seed,canvas.home-pet,canvas.chat-hero-pet,#voice-pet'))c._nookWake?.();}
      const motion = state.effectiveMotion || state.look?.motion || 'full';
      root.dataset.density = state.look?.density || 'comfortable';
      const nextTheme=state.look?.theme||'black',themeChanged=root.dataset.theme!==nextTheme;root.dataset.theme = nextTheme;
      if(themeChanged)for(const c of document.querySelectorAll('canvas.seed,canvas.brand-seed,canvas.preview-companion'))c._nookWake?.();
      root.dataset.scheme = window.NookAppearance?.isLightTheme(root.dataset.theme) ? 'light' : 'dark';
      if (root.dataset.motion !== motion) {
        root.dataset.motion = motion;
        window.dispatchEvent(new Event('nook-motion-change'));
      }
    });
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", mount);
    else mount();
  }
  return { bind, mount, react, preview, entrance, audio };
});
