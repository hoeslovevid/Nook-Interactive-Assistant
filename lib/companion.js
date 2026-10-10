(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NookCompanion = api;
})(typeof window === "undefined" ? globalThis : window, () => {
  const OUTFITS = ["none", "cap", "glasses", "headphones", "scarf", "winter"];
  function normalize(input = {}) {
    return {
      outfit: OUTFITS.includes(input.outfit) ? input.outfit : "none",
      seasonal: Boolean(input.seasonal),
      music: Boolean(input.music),
      voice: input.voice === "openai" ? "openai" : "windows",
    };
  }
  function outfit(settings, date = new Date()) {
    const value = normalize(settings);
    if (!value.seasonal) return value.outfit;
    const month = date.getMonth();
    return month === 11 || month < 2
      ? "winter"
      : month >= 5 && month <= 7
        ? "cap"
        : "scarf";
  }
  function apply(canvas, settings) {
    canvas.dataset.outfit = outfit(settings);
  }
  function draw(ctx, outfit, accent = "#b7c6ff") {
    ctx.save();
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
      ctx.fillRect(30, 39, 5, 6);
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
    }
    ctx.restore();
  }
  return { OUTFITS, normalize, outfit, apply, draw };
});
