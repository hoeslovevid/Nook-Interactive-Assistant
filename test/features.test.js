const test=require('node:test');
const assert=require('node:assert/strict');
const {normalize,outfit}=require('../lib/companion');
const {encodeWav}=require('../lib/audio');
const {companionMood,companionPose}=require('../lib/motion');
const {buildChatRequest}=require('../lib/chat');
test('wardrobe choices are validated and seasons select original outfits',()=>{
  assert.equal(normalize({outfit:'unknown'}).outfit,'none');
  assert.equal(outfit({outfit:'glasses',seasonal:false},new Date(2026,11,1)),'glasses');
  assert.equal(outfit({seasonal:true},new Date(2026,11,1)),'winter');
  assert.equal(outfit({seasonal:true},new Date(2026,6,1)),'cap');
});
test('microphone samples become a bounded mono PCM WAV',()=>{
  const wav=encodeWav(new Float32Array([-2,0,2]),16000);const view=new DataView(wav.buffer);
  assert.equal(Buffer.from(wav).toString('ascii',0,4),'RIFF');assert.equal(view.getUint32(24,true),16000);
  assert.equal(view.getInt16(44,true),-32768);assert.equal(view.getInt16(46,true),0);assert.equal(view.getInt16(48,true),32767);
  assert.throws(()=>encodeWav([],1),/sample rate/);
});
test('music dancing yields to agent work and approvals',()=>{
  assert.equal(companionMood({dancing:true}),'dancing');assert.equal(companionMood({dancing:true,working:true,task:'Read'}),'reading');
  assert.equal(companionMood({dancing:true,pending:true}),'expectant');
  for(const mood of ['dancing','greeting','annoyed','dizzy','listening'])assert.deepEqual(companionPose(mood,500,true),{x:0,y:0,lean:0,sx:1,sy:1,gaze:0,arm:0});
});
test('reviewed screenshots use provider-specific vision formats',()=>{
  const attachment={name:'Editor',image:'data:image/jpeg;base64,aGVsbG8='};
  const openai=buildChatRequest('chatgpt',[{role:'user',content:'What is here?'}],{attachment});
  assert.equal(openai.body.messages.at(-1).content[1].image_url.url,attachment.image);
  const claude=buildChatRequest('claude',[{role:'user',content:'What is here?'}],{attachment});
  assert.equal(claude.body.messages[0].content[1].source.media_type,'image/jpeg');
  assert.equal(claude.body.messages[0].content[0].text,'What is here?');
});
