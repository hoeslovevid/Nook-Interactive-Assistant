const test = require('node:test'), assert = require('node:assert/strict');
const {openMicrophone, microphoneError} = require('../lib/audio');

test('Windows capture retries without processing when a driver cannot start, retaining the chosen microphone', async () => {
  const calls = [], stream = {};
  const devices = {async getUserMedia(options) {calls.push(options);if(calls.length===1)throw Object.assign(new Error('driver'),{name:'NotReadableError'});return stream;}};
  assert.equal(await openMicrophone(devices,'headset'),stream);
  assert.deepEqual(calls[1],{audio:{deviceId:{exact:'headset'}},video:false});
  assert.equal(calls[0].audio.echoCancellation,true);
});
test('blocked access is never retried and device errors offer specific recovery steps', async () => {
  let calls=0;
  await assert.rejects(openMicrophone({async getUserMedia(){calls++;throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}}),{name:'NotAllowedError'});
  assert.equal(calls,1);
  assert.match(microphoneError({name:'NotAllowedError'}),/desktop apps/);
  assert.match(microphoneError({name:'NotFoundError'}),/choose another microphone/);
  assert.match(microphoneError({name:'NotReadableError'}),/exclusively/);
  assert.match(microphoneError({},true),/audio processing/);
  await assert.rejects(openMicrophone(null),{name:'NotSupportedError'});
});
test('default-device retry requests audio only without mandatory processing constraints', async () => {
  let calls=0;
  await openMicrophone({async getUserMedia(options){if(++calls===1)throw Object.assign(new Error('constraints'),{name:'OverconstrainedError'});assert.deepEqual(options,{audio:true,video:false});return {};}});
  assert.equal(calls,2);
});
