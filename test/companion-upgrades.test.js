const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { percent, fromRateLimits, resetTime } = require('../lib/usage');
const { normalize, outfit, apply } = require('../lib/companion');
const { installFeatures } = require('../lib/features');
const { encodeWav } = require('../lib/audio');
test('usage preserves explicit percentages and unavailable windows; reset formats normalize once', () => {
  assert.equal(percent(1), 1); assert.equal(percent(null), null); assert.equal(percent(''), null); assert.equal(percent(false), null); assert.equal(percent(-1), null);
  const usage = fromRateLimits({ primary: { usedPercent: 1, resetsAt: 1791600000 }, secondary: { utilization: 92, resets_at: '2026-10-10T12:00:00Z' } });
  assert.equal(usage.primaryUsed, 1); assert.equal(usage.weeklyUsed, 92); assert.equal(usage.resetsAt, 1791600000000); assert.equal(usage.weekResetsAt, Date.parse('2026-10-10T12:00:00Z'));
  assert.equal(resetTime(1791600000000), 1791600000000); assert.equal(resetTime('invalid'), null); assert.equal(fromRateLimits({}), null);
});
test('original seasonal outfits and temporary overrides preserve the chosen outfit', () => {
  assert.equal(outfit({ seasonal: true }, new Date(2026, 9, 1)), 'wizard'); assert.equal(normalize({ voiceLanguage: 'fr-FR' }).voiceLanguage, 'fr-FR');
  assert.equal(normalize({ voiceLanguage: 'en;whoami' }).voiceLanguage, 'auto');
  const canvas = { dataset: {} }, config = { outfit: 'glasses' }; apply(canvas, config, 'festive'); assert.equal(canvas.dataset.outfit, 'festive'); assert.equal(config.outfit, 'glasses'); apply(canvas, config); assert.equal(canvas.dataset.outfit, 'glasses');
});
test('outfit previews never save settings, stale hover exits cannot clear a newer preview, and dictation retains its language', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-companion-upgrades-')), handlers = new Map(), calls = [];
  const kit = installFeatures({ app: { getPath: () => directory }, ipcMain: { handle: (id, fn) => handlers.set(id, fn) }, desktopCapturer: {}, clipboard: {}, getState: () => ({ sessions: [] }), readVoiceKey: () => '', decide: () => {}, broadcast: () => {}, setAttachment: () => {}, speechRunner: async (_script, args) => { calls.push(args); return args.includes('languages') ? { ok: true, languages: [{ id: 'fr-FR', name: 'French' }] } : { ok: true, text: 'bonjour', language: 'fr-FR' }; } });
  const invoke = (id, value) => handlers.get('nook:' + id)(null, value);
  try {
    assert.equal(invoke('companion-save', { outfit: 'glasses', voiceLanguage: 'fr-FR' }).voiceLanguage,'fr-FR'); const saved = fs.readFileSync(path.join(directory, 'companion.json'), 'utf8');
    invoke('outfit-preview', { outfit: 'wizard' }); invoke('outfit-preview', { outfit: 'festive' }); invoke('outfit-preview', { outfit: null, previous: 'wizard' }); assert.equal(kit.snapshot().previewOutfit, 'festive');
    assert.equal(fs.readFileSync(path.join(directory, 'companion.json'), 'utf8'), saved); invoke('outfit-preview', { outfit: null, previous: 'festive' }); assert.equal(kit.snapshot().previewOutfit, null);
    invoke('outfit-preview', { outfit: 'wizard' }); invoke('companion-save', { outfit: 'wizard' }); assert.equal(kit.snapshot().previewOutfit, null);
    assert.equal((await invoke('speech-languages')).languages[0].id, 'fr-FR'); await invoke('speech-languages'); assert.equal(calls.length, 1);
    const bytes = encodeWav(new Float32Array(16000), 16000); const result = await invoke('transcribe', { bytes }); assert.equal(result.text, 'bonjour'); assert.deepEqual(calls[1].slice(-2), ['-Language', 'fr-FR']);
    assert.equal(fs.readdirSync(directory).some(name => name.endsWith('.wav')), false);
    assert.equal((await invoke('transcribe', { bytes: [] })).ok, false);
    assert.equal((await invoke('transcribe', { bytes: {invalid:true} })).ok, false);
  } finally { await kit.stop(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('cloud dictation sends the chosen ISO language and rejects incompatible saved cultures before uploading', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nook-voice-language-')), handlers = new Map(), uploads = [], original = global.fetch;
  global.fetch = async (_url, options) => { uploads.push(options.body); return { ok: true, json: async () => ({ text: 'bonjour' }) }; };
  const kit = installFeatures({ app: { getPath: () => directory }, ipcMain: { handle: (id, fn) => handlers.set(id, fn) }, desktopCapturer: {}, clipboard: {}, getState: () => ({ sessions: [] }), readVoiceKey: () => 'test-key', decide: () => {}, broadcast: () => {}, setAttachment: () => {} });
  const invoke = (id, value) => handlers.get('nook:' + id)(null, value);
  try {
    const bytes = encodeWav(new Float32Array(16000), 16000); invoke('companion-save', { voice: 'openai', voiceLanguage: 'fr-FR' }); assert.equal((await invoke('transcribe', { bytes })).ok, true); assert.equal(uploads[0].get('language'), 'fr');
    invoke('companion-save', { voiceLanguage: 'fil-PH' }); assert.equal((await invoke('transcribe', { bytes })).ok, false); assert.equal(uploads.length, 1);
    invoke('companion-save', { voiceLanguage: 'auto' }); await invoke('transcribe', { bytes }); assert.equal(uploads[1].get('language'), null);
  } finally { global.fetch = original; await kit.stop(); fs.rmSync(directory, { recursive: true, force: true }); }
});
