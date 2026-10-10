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

test('older appearance settings retain defaults; new options are validated and width is bounded', () => {
  assert.equal(normalizeLook({ accent: '#abcdef' }).notchWidth, 620);
  const look = normalizeLook({ theme: 'forest', density: 'compact', motion: 'economy', notchWidth: 9999 });
  assert.equal(look.theme, 'forest'); assert.equal(look.density, 'compact'); assert.equal(look.motion, 'economy'); assert.equal(look.notchWidth, 820);
  assert.equal(normalizeLook({ notchWidth: 530 }).notchWidth, 540);
  assert.equal(normalizeLook({ theme: 'bad}', motion: 'bad}', density: 'bad}', notchWidth: 'bad' }).theme, 'black');
  assert.match(lookToCss({ theme: 'forest', motion: 'reduced' }), /--app: #101b18;/);
  assert.match(lookToCss({ motion: 'reduced' }), /transition-duration:0s!important/);
});

test('black defaults apply to the app and notch; legacy default colors upgrade without losing customization', () => {
  const fresh = normalizeLook({});
  assert.equal(fresh.theme, 'black'); assert.equal(fresh.islandTop, '#0a0a0a'); assert.equal(fresh.islandBottom, '#000000');
  assert.match(lookToCss({}), /--app: #000000;--panel: #101010;--sidebar: #050505;/);
  const migrated = normalizeLook({ islandTop: '#20242E', islandBottom: '#13161c', accent: '#abcdef', radius: 30 });
  assert.equal(migrated.islandBottom, '#000000'); assert.equal(migrated.accent, '#abcdef'); assert.equal(migrated.radius, 30);
  const custom = normalizeLook({ islandTop: '#112233', islandBottom: '#13161c' });
  assert.equal(custom.islandTop, '#112233'); assert.equal(custom.islandBottom, '#13161c');
  const explicit = normalizeLook({ theme: 'graphite', islandTop: '#20242e', islandBottom: '#13161c' });
  assert.equal(explicit.theme, 'graphite'); assert.equal(explicit.islandTop, '#20242e');
  assert.doesNotThrow(() => normalizeLook({ islandTop: { toLowerCase: 'invalid' }, islandBottom: 12 }));
});
