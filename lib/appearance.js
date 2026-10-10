const DEFAULT_LOOK = {
  accent: "#b7c6ff",
  paper: "#edf0f6",
  islandTop: "#0a0a0a",
  islandBottom: "#000000",
  seed: "#edf0f6",
  radius: 22,
  theme: "black",
  density: "comfortable",
  motion: "full",
  notchWidth: 620,
};

const THEMES = {
  black: { app: "#000000", panel: "#101010", sidebar: "#050505" },
  graphite: { app: "#101218", panel: "#191d26", sidebar: "#14171f" },
  midnight: { app: "#0d1426", panel: "#17223a", sidebar: "#111b30" },
  forest: { app: "#101b18", panel: "#1b2b25", sidebar: "#14221c" },
};

const COLOR_KEYS = ["accent", "paper", "islandTop", "islandBottom", "seed"];

function isHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeLook(input) {
  const look = { ...DEFAULT_LOOK };
  if (!input || typeof input !== "object") {
    return look;
  }
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
  const width = Number(input.notchWidth);
  if (Number.isFinite(width)) look.notchWidth = Math.min(820, Math.max(520, Math.round(width / 20) * 20));
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
    `--radius: ${look.radius}px;`,
    `--app: ${theme.app};--panel: ${theme.panel};--sidebar: ${theme.sidebar};`,
    "}",
  ].join("") + (look.motion === "reduced" ? "*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:0s!important;scroll-behavior:auto!important}" : "");
}

module.exports = { DEFAULT_LOOK, normalizeLook, lookToCss };
