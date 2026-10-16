(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NookCompanion = api;
})(typeof window === "undefined" ? globalThis : window, () => {
  const OUTFITS = ["none", "cap", "glasses", "headphones", "scarf", "winter", "crown", "bow", "raincoat", "sunvisor", "wizard", "festive"];
  function normalize(input = {}) {
    return {
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
    const next = OUTFITS.includes(preview) ? preview : outfit(settings);
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
    const sway = pose.sway || 0;
    ctx.translate(24, outfit === 'glasses' ? 27 : 18);
    ctx.rotate((pose.lookX || 0) * .016 + sway * .08);
    ctx.translate(-24 + (pose.lookX || 0) * .3, -(outfit === 'glasses' ? 27 : 18) + (pose.lookY || 0) * .18);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (outfit === "glasses") {
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
  return { OUTFITS, normalize, outfit, apply, agentColor, draw, wardrobeStep };
});
