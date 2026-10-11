const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFile } = require('node:child_process');
function createWindowsAdapter() {
  function run(action, targets, value) {
    return new Promise((resolve, reject) => {
      const child = execFile('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'windows-credentials.ps1')], { windowsHide: true, timeout: 15000, maxBuffer: 100000, encoding: 'utf8' }, (error, output) => {
        try { const result = JSON.parse(output.replace(/^\uFEFF/, '')); if (!error && result.ok) resolve(result.values); else reject(new Error('Windows Credential Manager is unavailable. Existing encrypted keys are retained.')); }
        catch { reject(new Error('Windows Credential Manager is unavailable. Existing encrypted keys are retained.')); }
      });
      child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify({ action, targets, value }));
    });
  }
  return { read: targets => run('read', targets), write: (target, value) => run('write', [target], value), delete: target => run('delete', [target]) };
}
function createCredentialStore({ directory, providers, decrypt, adapter = createWindowsAdapter() }) {
  const prefix = 'Nook/' + crypto.createHash('sha256').update(path.resolve(directory).toLowerCase()).digest('hex').slice(0, 20) + '/';
  const file = path.join(directory, 'provider-keys.json'), allowed = new Set(providers);
  let cache = {}, ready = false, error = '', pending = Promise.resolve();
  const target = name => { if (!allowed.has(name)) throw new Error('Unknown key.'); return prefix + name; };
  function serial(operation) { const next = pending.then(operation); pending = next.catch(() => {}); return next; }
  return {
    async init() {
      try {
        const values = await adapter.read(providers.map(target));
        cache = Object.fromEntries(providers.filter(name => typeof values[target(name)] === 'string').map(name => [name, values[target(name)]]));
        if (fs.existsSync(file)) {
          const legacy = JSON.parse(fs.readFileSync(file, 'utf8'));
          for (const name of providers) if (typeof legacy[name] === 'string') {
            // A key saved in Credential Manager wins over older file contents.
            const value = decrypt(legacy[name]);
            if (value && !Object.hasOwn(cache, name)) {
              await adapter.write(target(name), value);
              const verified = await adapter.read([target(name)]);
              if (verified[target(name)] !== value) throw new Error('Credential migration could not be verified.');
              cache[name] = value;
            }
          }
          // Keep an encrypted recovery copy; never create plaintext backups.
          let backup = file + '.migrated';
          if (fs.existsSync(backup) && !fs.readFileSync(backup).equals(fs.readFileSync(file))) backup += '.' + crypto.randomUUID();
          if (!fs.existsSync(backup)) fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
          fs.unlinkSync(file);
        }
        ready = true; error = '';
      } catch { error = 'Windows Credential Manager is unavailable. Existing encrypted keys are retained.'; }
      return { ready, error };
    },
    snapshot: () => ({ ...cache }),
    status: () => ({ ready, error, storage: ready ? 'Windows Credential Manager' : 'Encrypted file' }),
    set(name, value) { return serial(async () => {
      if (!ready) throw new Error(error || 'Credential Manager is not ready.');
      if (typeof value !== 'string' || !value || Buffer.byteLength(value) > 2560) throw new Error('Enter a valid key.');
      await adapter.write(target(name), value); cache[name] = value;
    }); },
    remove(name) { return serial(async () => {
      if (!ready) throw new Error(error || 'Credential Manager is not ready.');
      await adapter.delete(target(name)); delete cache[name];
    }); },
    target,
  };
}
module.exports = { createWindowsAdapter, createCredentialStore };
