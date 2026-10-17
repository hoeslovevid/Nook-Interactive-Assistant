(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NookMotion = api;
})(typeof window === "undefined" ? globalThis : window, () => {
  function springProgress(t) {
    if (t >= 1) return 1;
    if (t <= 0) return 0;
    return 1 - Math.exp(-8 * t) * (Math.cos(9 * t) + 0.55 * Math.sin(9 * t));
  }
  function companionMood({
    pending = false,
    drop = false,
    receiving = false,
    thinking = false,
    celebrating = false,
    dancing = false,
    working = false,
    task = "",
    hover = false,
    sleeping = false,
  } = {}) {
    return receiving
      ? "receiving"
      : drop
        ? "curious"
        : pending
          ? "expectant"
          : celebrating
            ? "happy"
            : thinking
              ? "thinking"
              : working
                ? taskMood(task)
                : dancing
                  ? "dancing"
                  : hover
                    ? "curious"
                    : sleeping
                      ? "sleepy"
                      : "idle";
  }
  function taskMood(task) {
    const text = String(task || "").toLowerCase();
    if (/download|install|upload/.test(text))return 'downloading';
    if (/plan|design|outline|organize/.test(text))return 'planning';
    if (/search|browse|fetch/.test(text))return 'searching';
    if (/bash|shell|powershell|terminal|execute|command/.test(text))
      return "running";
    if (/edit|write|patch|replace|create/.test(text)) return "coding";
    if (/read|search|grep|glob|browse|fetch|list/.test(text)) return "reading";
    return "focused";
  }
  function companionPose(mood, elapsed, reduced = false) {
    const t = elapsed / 1000;
    const pose = { x: 0, y: 0, lean: 0, sx: 1, sy: 1, gaze: 0, arm: 0 };
    if (reduced) return pose;
    switch (mood) {
      case "dancing":
        pose.y = -Math.abs(Math.sin(t * 5)) * 2;
        pose.lean = Math.sin(t * 5) * 0.16;
        pose.arm = Math.sin(t * 8) * 2.5;
        break;
      case "greeting":
        pose.arm = Math.sin(t * 12) * 2.8;
        pose.lean = -0.08;
        break;
      case "annoyed":
        pose.lean = Math.sin(t * 18) * 0.05;
        pose.gaze = -1;
        break;
      case "dizzy":
        pose.lean = Math.sin(t * 6) * 0.22;
        pose.gaze = Math.sin(t * 7) * 3;
        pose.y = Math.cos(t * 7) * 0.8;
        break;
      case "speaking":
        pose.y = Math.sin(t*3)*.3;pose.lean = Math.sin(t*2.2)*.035;pose.arm = Math.sin(t*4)*.7;break;
      case "listening":
        pose.sy = 1 + Math.sin(t * 4) * 0.03;
        pose.sx = 2 - pose.sy;
        pose.lean = -0.07;
        break;
      case "reading":
        pose.gaze = ((t * 1.1) % 1) * 3 - 1.5;
        pose.arm = Math.sin(t * 2) * .45;
        pose.y = Math.sin(t * 2) * 0.5;
        pose.lean = Math.sin(t * 1.3) * 0.04;
        break;
      case "coding":
        pose.y = Math.sin(t * 8) * 0.55;
        pose.lean = Math.sin(t * 5) * 0.055;
        pose.arm = Math.sin(t * 11) * 1.3;
        break;
      case "running":
        pose.y = -Math.abs(Math.sin(t * 3.6)) * 2.8;
        pose.lean = Math.sin(t * 3.6) * 0.06;
        pose.sx = 1 + Math.cos(t * 7.2) * 0.035;
        pose.sy = 2 - pose.sx;
        break;
      case "thinking":
        pose.y = Math.sin(t * 2) * 0.8;
        pose.lean = Math.sin(t * 1.6) * 0.09;
        pose.gaze = Math.sin(t * 1.4) * 1.5;
        break;
      case "expectant":
        pose.lean = Math.sin(t * 2.4) * 0.07;
        pose.arm = Math.sin(t * 6) * 2.5;
        pose.sy = 1 + Math.sin(t * 2.4) * 0.025;
        break;
      case "happy":
        pose.y = -Math.abs(Math.sin(t * 5)) * 4;
        pose.lean = Math.sin(t * 5) * 0.09;
        pose.sx = 1 + Math.cos(t * 10) * 0.05;
        pose.sy = 2 - pose.sx;
        break;
      case "receiving":
        pose.sx = 1 + Math.sin(t * 5) * 0.09;
        pose.sy = 2 - pose.sx;
        pose.y = Math.sin(t * 5) * 1;
        break;
      case "curious":
        pose.lean = -0.1 + Math.sin(t * 1.8) * 0.035;
        break;
      case "sleepy":
        pose.sy = 0.96 + Math.sin(t * 1.5) * 0.025;
        pose.sx = 2 - pose.sy;
        pose.y = 1;
        break;
      case "focused":
        pose.lean = Math.sin(t * 2.5) * 0.04;
        pose.y = Math.sin(t * 3) * 0.5;
        break;
      default:
        pose.y = Math.sin(t * 1.5) * 0.45;
    }
    return pose;
  }
  return { springProgress, companionMood, taskMood, companionPose };
});
