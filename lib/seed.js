(function seedModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.NookSeed = api;
})(typeof window === "undefined" ? globalThis : window, function seedFactory() {
  const TEAR = "M24 3c8 6 16 14 16 25a16 16 0 1 1-32 0C8 17 16 9 24 3z";

  function color(canvas, name, fallback) {
    const custom = canvas.dataset && canvas.dataset[name];
    if (custom) {
      return custom;
    }
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
    return value || fallback;
  }

  function draw(canvas, now) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const size = canvas.width;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = canvas._nookPose;
    const breath = reduced ? 0 : Math.sin(now / 560) * 0.035;
    const blink = reduced ? 1 : state.blink;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(state.lean);
    ctx.translate(0, state.hopY * (size / 48));
    ctx.scale(state.sx * (1 + breath), state.sy * (1 - breath));
    ctx.scale(size / 48, size / 48);
    ctx.translate(-24, -24);
    ctx.fillStyle = color(canvas, "body", color(canvas, "seed", "#f4f0e6"));
    ctx.fill(new Path2D(TEAR));
    ctx.save();
    ctx.translate(24 + state.lookX, 27 + state.lookY * 0.4);
    ctx.scale(1, blink);
    ctx.fillStyle = color(canvas, "ink", "#14161a");
    ctx.beginPath();
    ctx.ellipse(0, 0, state.rx, state.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color(canvas, "pupil", color(canvas, "lime", "#dff25a"));
    ctx.beginPath();
    ctx.arc(state.lookX * 0.8, 0.4, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function bind(canvas) {
    if (canvas._nookBound) {
      return;
    }
    canvas._nookBound = true;
    canvas._nookAim = { x: 0, y: 0 };
    canvas._nookPose = {
      lookX: 0,
      lookY: 0,
      lean: 0,
      hopY: 0,
      sx: 1,
      sy: 1,
      rx: 6.5,
      ry: 7.5,
      blink: 1,
      hop: 0,
      squish: 0,
      hopArmed: false,
      squishArmed: false,
    };
    const step = (now) => {
      const pose = canvas._nookPose;
      const aim = canvas._nookAim || { x: 0, y: 0 };
      pose.lookX += (aim.x - pose.lookX) * 0.18;
      pose.lookY += (aim.y - pose.lookY) * 0.18;
      const wide = canvas.classList.contains("is-wide") || document.body.classList.contains("is-alert");
      const hovering = canvas.classList.contains("is-hover");
      const targetRx = wide ? 9.4 : hovering ? 8 : 6.5;
      const targetRy = wide ? 10.2 : hovering ? 8.8 : 7.5;
      pose.rx += (targetRx - pose.rx) * 0.18;
      pose.ry += (targetRy - pose.ry) * 0.18;
      const doze = canvas.classList.contains("is-doze");
      const cycle = (now % 5400) / 5400;
      const blinking = !doze && cycle > 0.42 && cycle < 0.48;
      const targetBlink = doze ? 0.14 : blinking ? 0.08 : 1;
      pose.blink += (targetBlink - pose.blink) * 0.35;
      const leaning = canvas.classList.contains("is-lean");
      const targetLean = leaning ? -0.12 : 0;
      pose.lean += (targetLean - pose.lean) * 0.16;
      const holding = canvas.classList.contains("is-hold");
      const hopping = canvas.classList.contains("is-hop") || canvas.classList.contains("is-happy");
      const squishing = canvas.classList.contains("is-squish");
      if (hopping && !pose.hopArmed) {
        pose.hop = 1;
        pose.hopArmed = true;
      }
      if (!hopping) {
        pose.hopArmed = false;
      }
      if (squishing && !pose.squishArmed) {
        pose.squish = 1;
        pose.squishArmed = true;
      }
      if (!squishing) {
        pose.squishArmed = false;
      }
      pose.hop *= 0.9;
      pose.squish *= 0.86;
      pose.hopY = -Math.sin(pose.hop * Math.PI) * 6;
      const squash = Math.sin(pose.squish * Math.PI);
      const holdScale = holding ? 0.16 : 0;
      pose.sx = 1 + squash * 0.18 + holdScale;
      pose.sy = 1 - squash * 0.22 - holdScale;
      draw(canvas, now);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function mount() {
    document.querySelectorAll("canvas.seed, canvas.brand-seed").forEach(bind);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }

  return { bind, mount };
});
