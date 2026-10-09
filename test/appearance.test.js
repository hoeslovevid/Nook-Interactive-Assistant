const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeLook, lookToCss, DEFAULT_LOOK } = require("../lib/appearance");

test("bad colors fall back to the default look", () => {
  const look = normalizeLook({ accent: "red", radius: 2, islandTop: "#112233" });
  assert.equal(look.accent, DEFAULT_LOOK.accent);
  assert.equal(look.radius, 10);
  assert.equal(look.islandTop, "#112233");
});

test("look css only contains the saved colors", () => {
  const css = lookToCss({ accent: "#abcdef", radius: 18 });
  assert.match(css, /--lime: #abcdef;/);
  assert.match(css, /--radius: 18px;/);
  assert.doesNotMatch(css, /[<>]/);
});
