const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeLook, lookToCss, DEFAULT_LOOK, isLightTheme, appBackground } = require("../lib/appearance");

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

test('light presets survive saved-settings normalization and retain custom colors and layout', () => {
  for (const theme of ['pearl', 'sand', 'mint']) {
    const preset = normalizeLook({ theme });
    assert.equal(isLightTheme(theme), true);
    assert.deepEqual(normalizeLook(JSON.parse(JSON.stringify(preset))), preset);
    const custom = normalizeLook({ ...preset, islandTop: '#e6e8ed', accent: '#123456', density: 'compact', motion: 'economy', notchWidth: 760 });
    assert.equal(custom.islandTop, '#e6e8ed'); assert.equal(custom.accent, '#123456');
    assert.equal(custom.density, 'compact'); assert.equal(custom.motion, 'economy'); assert.equal(custom.notchWidth, 760);
    assert.match(lookToCss(custom), /color-scheme: light/);
  }
  assert.equal(isLightTheme('black'), false);
  assert.equal(isLightTheme('__proto__'), false);
  assert.match(lookToCss({ theme: 'bad' }), /color-scheme: dark/);
});

test('settings browser and desktop use the same validated theme presets', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const browser = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../lib/appearance'), 'utf8'), browser);
  for (const theme of ['pearl', 'sand', 'mint', 'black', 'invalid']) {
    assert.deepEqual(JSON.parse(JSON.stringify(browser.NookAppearance.normalizeLook({ theme }))), normalizeLook({ theme }));
    assert.equal(browser.NookAppearance.isLightTheme(theme), isLightTheme(theme));
    assert.equal(browser.NookAppearance.appBackground({ theme }), appBackground({ theme }));
  }
});
