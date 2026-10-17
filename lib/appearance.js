(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NookAppearance = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
const DEFAULT_LOOK = {
  accent: "#b7c6ff",
  paper: "#edf0f6",
  islandTop: "#0a0a0a",
  islandBottom: "#000000",
  seed: "#edf0f6",
  pagePets: true, pageParticles: true, pageAccents:true,
  radius: 22,
  theme: "black",
  density: "comfortable",
  motion: "full",
  notchWidth: 620, peekWidth:240,
  fontScale: 1, contrast: "normal", surface: "solid", opacity: 100,
};

const THEMES = {
  black: { app: "#000000", panel: "#101010", sidebar: "#050505" },
  graphite: { app: "#101218", panel: "#191d26", sidebar: "#14171f" },
  midnight: { app: "#0d1426", panel: "#17223a", sidebar: "#111b30" },
  forest: { app: "#101b18", panel: "#1b2b25", sidebar: "#14221c" },
  pearl: { app: "#f4f6fa", panel: "#ffffff", sidebar: "#edf0f6", scheme: "light", accent: "#4e5fcd", paper: "#202735", islandTop: "#ffffff", islandBottom: "#f0f3f9", seed: "#dce3f2", muted: "#586579" },
  sand: { app: "#f7f3ed", panel: "#fffdf9", sidebar: "#eee8df", scheme: "light", accent: "#925b35", paper: "#332a23", islandTop: "#fffdf9", islandBottom: "#f3ede3", seed: "#e5d7c5", muted: "#6e6052" },
  mint: { app: "#f0f7f3", panel: "#fcfffd", sidebar: "#e5efe9", scheme: "light", accent: "#267255", paper: "#20372d", islandTop: "#fcfffd", islandBottom: "#eaf4ed", seed: "#cde5d7", muted: "#526b5d" },
};

const COLOR_KEYS = ["accent", "paper", "islandTop", "islandBottom", "seed"];

function isHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeLook(input) {
  const themeName = input && Object.hasOwn(THEMES, input.theme) ? input.theme : DEFAULT_LOOK.theme;
  const preset = THEMES[themeName];
  const look = { ...DEFAULT_LOOK, theme: themeName };
  for (const key of COLOR_KEYS) if (preset[key]) look[key] = preset[key];
  if (!input || typeof input !== "object") {
    return look;
  }
  look.pagePets=input.pagePets!==false;look.pageParticles=input.pageParticles!==false;look.pageAccents=input.pageAccents!==false;
  for (const key of COLOR_KEYS) {
    if (isHex(input[key])) {
      look[key] = input[key].toLowerCase();
    }
  }
  const radius = Number(input.radius);
  if (Number.isFinite(radius)) {
    look.radius = Math.min(32, Math.max(10, Math.round(radius)));
  }
  // Upgrade the original untouched notch colors; explicit themes and custom colors stay intact.
  if (!Object.hasOwn(input, 'theme') && typeof input.islandTop === 'string' && typeof input.islandBottom === 'string' && input.islandTop.toLowerCase() === '#20242e' && input.islandBottom.toLowerCase() === '#13161c') {
    look.islandTop = DEFAULT_LOOK.islandTop;
    look.islandBottom = DEFAULT_LOOK.islandBottom;
  }
  if (Object.hasOwn(THEMES, input.theme)) look.theme = input.theme;
  if (["comfortable", "compact"].includes(input.density)) look.density = input.density;
  if (["full", "economy", "reduced"].includes(input.motion)) look.motion = input.motion;
  Object.assign(look,{hoverOpenDelay:Math.max(0,Math.min(600,Number(input.hoverOpenDelay)||0)),hoverCloseDelay:Math.max(150,Math.min(1800,Number(input.hoverCloseDelay)||700)),glanceFirst:input.glanceFirst===true,expandApprovals:input.expandApprovals!==false,expandRecording:input.expandRecording===true,expandAgents:input.expandAgents===true,glancePriority:['approvals','agents','recording','music'].includes(input.glancePriority)?input.glancePriority:'approvals'});
  const width = Number(input.notchWidth);
  if (Number.isFinite(width)) look.notchWidth = Math.min(820, Math.max(520, Math.round(width / 20) * 20));
  look.peekWidth=Number.isFinite(Number(input.peekWidth))?Math.max(180,Math.min(400,Math.round(Number(input.peekWidth)/10)*10)):240;
  look.fontScale = Number.isFinite(Number(input.fontScale)) ? Math.max(1,Math.min(1.3,Number(input.fontScale))) : 1;
  look.opacity = Number.isFinite(Number(input.opacity)) ? Math.max(85,Math.min(100,Math.round(Number(input.opacity)))) : 100;
  look.contrast = input.contrast === 'high' ? 'high' : 'normal';
  look.surface = input.surface === 'frosted' ? 'frosted' : 'solid';
  return look;
}

function lookToCss(input) {
  const look = normalizeLook(input);
  const theme = THEMES[look.theme];
  return [
    ":root:root {",
    `--lime: ${look.accent};`,
    `--paper: ${look.paper};`,
    `--island-top: ${look.islandTop};`,
    `--island-bottom: ${look.islandBottom};`,
    `--seed: ${look.seed};`,
    `--radius: ${look.radius}px;--text-scale:${look.fontScale};--notch-opacity:${look.opacity}%;--notch-blur:${look.surface==='frosted'?'18px':'0px'};`,
    `--app: ${theme.app};--panel: ${theme.panel};--sidebar: ${theme.sidebar};`,
    `--muted: ${theme.muted || "#9ba3b2"};--line: ${theme.scheme === "light" ? "rgba(24,35,49,.14)" : "rgba(255,255,255,.09)"};`,
    `--island-shade: ${theme.scheme === "light" ? "#ffffff" : "#000000"};color-scheme: ${theme.scheme || "dark"};`,
    look.contrast === "high" ? `--muted:${theme.scheme === "light" ? "#263446" : "#e1e6ee"};--line:${theme.scheme === "light" ? "#465468" : "#8e98a8"};` : "",
    "}",
  ].join("") + (look.motion === "reduced" ? "*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:0s!important;scroll-behavior:auto!important}" : "");
}

return {
  DEFAULT_LOOK, normalizeLook, lookToCss,
  isLightTheme: (name) => Object.hasOwn(THEMES, name) && THEMES[name].scheme === "light",
  appBackground: (input) => THEMES[normalizeLook(input).theme].app,
};
});
