// Test-only CSS media emulation; never change the product's accessibility settings.
// https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setEmulatedMedia
async function emulateMotion(contents,value='no-preference') {
  if(!['reduce','no-preference'].includes(value))throw Error('Choose a supported motion preference.');
  if(!contents.debugger.isAttached())contents.debugger.attach('1.3');
  await contents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value}]});
}
module.exports={emulateMotion};
