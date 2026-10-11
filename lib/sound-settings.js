const fs = require('node:fs'), path = require('node:path');
const EVENTS = ['hi', 'ask', 'finish', 'error', 'interaction'];
const EXTENSIONS = ['wav', 'mp3', 'ogg', 'm4a'];
const ALIASES = { hi: ['greet'], ask: ['approval'] };
function normalizeSounds(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  const number = Number(input.volume), volume = Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 60;
  return { volume, enabled: Object.fromEntries(EVENTS.map(kind => [kind, input.enabled?.[kind] !== false])) };
}
function audioType(bytes, extension) {
  if (extension === 'wav' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') return 'audio/wav';
  if (extension === 'ogg' && bytes.toString('ascii', 0, 4) === 'OggS') return 'audio/ogg';
  if (extension === 'mp3' && (bytes.toString('ascii', 0, 3) === 'ID3' || bytes[0] === 255 && (bytes[1] & 224) === 224)) return 'audio/mpeg';
  if (extension === 'm4a' && bytes.toString('ascii', 4, 8) === 'ftyp') return 'audio/mp4';
  return '';
}
function createSoundSettings(directory) {
  const folder = path.join(directory, 'sounds'), file = path.join(directory, 'sound-settings.json');
  const cache = new Map();
  let settings; try { settings = normalizeSounds(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { settings = normalizeSounds(); }
  function find(kind) {
    if (!EVENTS.includes(kind)) return null;
    for (const name of [kind, ...(ALIASES[kind] || [])]) for (const extension of EXTENSIONS) {
      const target = path.join(folder, name + '.' + extension);
      try {
        const stat = fs.statSync(target); if (!stat.isFile() || stat.size > 2000000) continue;
        const stamp = stat.size + ':' + stat.mtimeMs + ':' + stat.ctimeMs, previous = cache.get(target);
        if (previous?.stamp === stamp) { if (previous.mime) return previous; continue; }
        const bytes = fs.readFileSync(target), mime = audioType(bytes, extension), sound = { target, bytes, mime, stamp }; cache.set(target, sound); if (mime) return sound;
      } catch { cache.delete(target); }
    }
    return null;
  }
  function snapshot() { return { ...settings, enabled: { ...settings.enabled }, custom: Object.fromEntries(EVENTS.map(kind => { const sound = find(kind); return [kind, sound ? path.basename(sound.target) : '']; })) }; }
  function remove(kind) {
    if (!EVENTS.includes(kind)) throw new Error('Unknown sound event.');
    for (const name of [kind, ...(ALIASES[kind] || [])]) for (const ext of EXTENSIONS) {
      const target = path.join(folder, name + '.' + ext); if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  }
  return {
    snapshot,
    save(input) { const next = normalizeSounds({ ...settings, ...input, enabled: { ...settings.enabled, ...input?.enabled } }); fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(file, JSON.stringify(next)); settings = next; return snapshot(); },
    read(kind) { const sound = find(kind); return sound ? 'data:' + sound.mime + ';base64,' + sound.bytes.toString('base64') : ''; },
    import(kind, source) {
      if (!EVENTS.includes(kind)) throw new Error('Unknown sound event.');
      const extension = path.extname(source).slice(1).toLowerCase(), stat = fs.statSync(source);
      if (!EXTENSIONS.includes(extension) || !stat.isFile() || stat.size > 2000000) throw new Error('Choose a WAV, MP3, OGG, or M4A file under 2 MB.');
      const bytes = fs.readFileSync(source); if (!audioType(bytes, extension)) throw new Error('This file is not a supported audio recording.');
      fs.mkdirSync(folder, { recursive: true });
      const temporary = path.join(folder, kind + '.import'); fs.writeFileSync(temporary, bytes);
      // Read the source before removing old files, so importing the current sound is safe.
      const destination = path.join(folder, kind + '.' + extension);
      fs.renameSync(temporary, destination);
      for (const name of [kind, ...(ALIASES[kind] || [])]) for (const ext of EXTENSIONS) {
        const target = path.join(folder, name + '.' + ext); if (target !== destination && fs.existsSync(target)) fs.unlinkSync(target);
      }
      cache.clear(); return snapshot();
    },
    remove(kind) { remove(kind); return snapshot(); },
  };
}
module.exports = { EVENTS, normalizeSounds, audioType, createSoundSettings };
