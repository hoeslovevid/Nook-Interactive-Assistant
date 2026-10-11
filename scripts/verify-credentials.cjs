// Exercise the Windows API with a disposable, non-secret entry, then remove it.
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const adapter = require('../lib/credential-store').createWindowsAdapter();
const target = 'Nook/' + crypto.randomBytes(10).toString('hex') + '/verification';
(async () => {
  try {
    await adapter.write(target, 'Nook verification · 日本語');
    assert.equal((await adapter.read([target]))[target], 'Nook verification · 日本語');
    await adapter.delete(target); assert.equal((await adapter.read([target]))[target], undefined);
    console.log('Windows Credential Manager write, Unicode read, and delete passed.');
  } finally { await adapter.delete(target); }
})().catch(() => { console.error('Windows Credential Manager verification failed.'); process.exitCode = 1; });
