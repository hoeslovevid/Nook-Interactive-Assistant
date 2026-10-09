const DEFAULT_LOOK = {
  accent: "#dff25a",
  paper: "#f4f0e6",
  islandTop: "#22252c",
  islandBottom: "#14161a",
  seed: "#f4f0e6",
  radius: 22,
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
  return look;
}

function lookToCss(input) {
  const look = normalizeLook(input);
  return [
    ":root {",
    `--lime: ${look.accent};`,
    `--paper: ${look.paper};`,
    `--island-top: ${look.islandTop};`,
    `--island-bottom: ${look.islandBottom};`,
    `--seed: ${look.seed};`,
    `--radius: ${look.radius}px;`,
    "}",
  ].join("");
}

module.exports = { DEFAULT_LOOK, normalizeLook, lookToCss };
