(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NookSeed = api;
})(typeof window === "undefined" ? globalThis : window, () => {
  const BODY =
    "M24 5 C29 12 40 16 40 29 C40 40 33 44 24 44 C15 44 8 40 8 29 C8 18 17 12 24 5Z";
  function color(canvas, name, fallback) {
    return (
      canvas.dataset[name] ||
      getComputedStyle(document.documentElement)
        .getPropertyValue("--" + name)
        .trim() ||
      fallback
    );
  }
  function moodOf(canvas, now) {
    const normal = canvas.dataset.mood || "idle";
    if (["expectant", "receiving"].includes(normal)) return normal;
    return canvas._nookReaction && now < canvas._nookReaction.until
      ? canvas._nookReaction.mood
      : normal;
  }
  function react(canvas, mood, duration = 1200) {
    canvas._nookReaction = { mood, until: performance.now() + duration };
  }
  function draw(canvas, now, reduced) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = canvas._nookPose,
      mood = moodOf(canvas, now),
      size = canvas.width;
    const sleepy = mood === "sleepy",
      happy = mood === "happy",
      focus = ["focused", "thinking", "coding", "reading", "running"].includes(
        mood,
      ),
      receiving = mood === "receiving";
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.scale(size / 48, size / 48);
    ctx.translate(24, 26);
    const breathe = reduced ? 0 : Math.sin(now / 900) * 0.018;
    ctx.translate(0, reduced ? 0 : p.hopY);
    ctx.rotate(reduced ? 0 : p.lean);
    ctx.scale(p.sx * (1 + breathe), p.sy * (1 - breathe));
    ctx.translate(-24, -26);
    const body = color(canvas, "body", color(canvas, "seed", "#edf0f6"));
    const fill = ctx.createLinearGradient(12, 8, 36, 44);
    fill.addColorStop(0, "#ffffff");
    fill.addColorStop(0.32, body);
    fill.addColorStop(1, body);
    ctx.shadowColor = "rgba(0,0,0,.22)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = fill;
    ctx.fill(new Path2D(BODY));
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // Small hands make work and approval reactions readable at notch size.
    if (
      [
        "coding",
        "expectant",
        "receiving",
        "happy",
        "greeting",
        "dancing",
      ].includes(mood)
    ) {
      ctx.fillStyle = body;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          24 + side * 15,
          32 + (side === 1 ? p.arm : 0),
          3,
          4,
          side * 0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,.42)";
    ctx.lineWidth = 0.6;
    ctx.stroke(new Path2D(BODY));
    ctx.fillStyle = "rgba(15,20,35,.08)";
    ctx.beginPath();
    ctx.ellipse(24, 40, 9, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    const ink = color(canvas, "ink", "#13161c");
    // Two eyes give Nook expressive reactions while retaining its seed silhouette.
    for (const x of [18, 30]) {
      ctx.save();
      ctx.translate(x + (p.lookX + p.gaze) * 0.35, 27 + p.lookY * 0.25);
      ctx.scale(1, p.blink * (sleepy ? 0.35 : 1));
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
      } else if (happy) {
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
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (receiving) {
      ctx.fillStyle = ink;
      ctx.ellipse(24, 34, 3.3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === "expectant" || mood === "curious") {
      ctx.arc(24, 34, 1.3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.moveTo(21.5, 33);
      ctx.quadraticCurveTo(24, happy ? 37 : 35, 26.5, 33);
      ctx.stroke();
    }
    if (happy || mood === "curious") {
      ctx.fillStyle = "rgba(225,136,157,.24)";
      for (const x of [13, 35]) {
        ctx.beginPath();
        ctx.ellipse(x, 32, 2.5, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (window.NookCompanion)
      window.NookCompanion.draw(
        ctx,
        p.outfit,
        color(canvas, "pupil", color(canvas, "lime", "#b7c6ff")),
        { lookX: p.lookX, lookY: p.lookY, sway: p.wardrobe?.sway, alpha: p.outfitAlpha },
      );
    if (p.previousOutfit && p.outfitAlpha < 1) window.NookCompanion.draw(ctx, p.previousOutfit, color(canvas, 'pupil', '#b7c6ff'), { lookX: p.lookX, lookY: p.lookY, sway: p.wardrobe?.sway, alpha: 1 - p.outfitAlpha });
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
    }
    if (mood === "coding") {
      ctx.fillStyle = "#333c53";
      ctx.fillRect(12, 38, 24, 7);
      ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#b7c6ff"));
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 6; col++)
          ctx.fillRect(14 + col * 3.3, 40 + row * 2, 2, 1);
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
      ctx.lineTo(40, 41);
      ctx.stroke();
    }
    ctx.restore();
    if (["sleepy", "happy", "receiving"].includes(mood)) {
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
    if (mood === "dancing") {
      ctx.save();
      ctx.scale(size / 48, size / 48);
      ctx.font = "bold 7px Segoe UI";
      ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#b7c6ff"));
      ctx.fillText("♪", 4, reduced ? 17 : 17 + Math.sin(now / 200) * 2);
      ctx.fillText("♫", 39, reduced ? 11 : 11 + Math.cos(now / 200) * 2);
      ctx.restore();
    }
    if (mood === "affection") {
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
    if (mood === "thinking" || mood === "listening") {
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
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let last = 0,
      hopStart = 0,
      squishStart = 0,
      previousHop = false,
      previousSquish = false,
      lastMood = "",
      moodStart = 0;
    function step(now) {
      if (!canvas.isConnected) return;
      const reduced = media.matches,
        dt = Math.min(64, now - last || 16);
      last = now;
      const p = canvas._nookPose,
        aim = canvas._nookAim || { x: 0, y: 0 },
        ease = 1 - Math.exp(-dt / 85),
        mood = canvas.dataset.mood || "idle";
      if (mood !== lastMood) {
        lastMood = mood;
        moodStart = now;
      }
      const motion = window.NookMotion
        ? window.NookMotion.companionPose(mood, now - moodStart, reduced)
        : { y: 0, lean: 0, sx: 1, sy: 1, gaze: 0, arm: 0 };
      if (p.outfit !== canvas.dataset.outfit) { p.previousOutfit = p.outfit; p.outfit = canvas.dataset.outfit; p.outfitTime = now; }
      p.outfitAlpha = reduced ? 1 : Math.min(1, (now - p.outfitTime) / 220);
      if (window.NookCompanion) p.wardrobe = window.NookCompanion.wardrobeStep(p.wardrobe, p.lookX * .1 + motion.lean * 3 + (canvas.classList.contains('is-squish') ? .8 : 0), dt, reduced);
      p.gaze = motion.gaze;
      p.arm = motion.arm;
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
      const h = hopStart && ht < 1 ? Math.sin(Math.PI * ht) : 0,
        q = squishStart && st < 1 ? Math.sin(Math.PI * st) : 0;
      p.hopY = reduced ? 0 : motion.y - h * 3;
      p.sx = reduced ? 1 : motion.sx + q * 0.16 - h * 0.04;
      p.sy = reduced ? 1 : motion.sy - q * 0.17 + h * 0.06;
      p.lean = reduced
        ? 0
        : p.lean +
          ((canvas.classList.contains("is-lean") ? -0.12 : motion.lean) -
            p.lean) *
            ease;
      const blink = now % 5700 > 5300 && now % 5700 < 5450;
      p.blink = reduced ? 1 : p.blink + ((blink ? 0.08 : 1) - p.blink) * ease;
      if (!document.hidden) draw(canvas, now, reduced);
      if (document.hidden || canvas.offsetParent === null || mood === "sleepy")
        setTimeout(() => requestAnimationFrame(step), 250);
      else requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    let pokes = [],
      pointerStart = null;
    let affectionTimer;
    canvas.addEventListener("pointerenter", () => {
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
      pointerStart = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("pointerup", (event) => {
      if (
        !pointerStart ||
        Math.hypot(
          event.clientX - pointerStart.x,
          event.clientY - pointerStart.y,
        ) > 6
      )
        return;
      const now = performance.now();
      pokes = pokes.filter((time) => now - time < 1700);
      pokes.push(now);
      react(
        canvas,
        pokes.length >= 4 ? "dizzy" : pokes.length >= 2 ? "annoyed" : "happy",
        pokes.length >= 4 ? 2200 : 900,
      );
    });
    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      canvas._nookAim = {
        x: ((e.clientX - r.left) / r.width - 0.5) * 6,
        y: ((e.clientY - r.top) / r.height - 0.5) * 6,
      };
    });
    canvas.addEventListener("pointerleave", () => {
      clearTimeout(affectionTimer);
      canvas._nookAim = { x: 0, y: 0 };
    });
  }
  function mount() {
    document
      .querySelectorAll(
        "canvas.seed,canvas.brand-seed,canvas.preview-companion",
      )
      .forEach(bind);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", mount);
    else mount();
  }
  return { bind, mount, react };
});
