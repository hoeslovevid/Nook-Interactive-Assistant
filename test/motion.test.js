const test=require('node:test'),assert=require('node:assert/strict');const {springProgress,companionMood}=require('../lib/motion');
test('spring starts and settles exactly without invalid intermediate bounds',()=>{assert.equal(springProgress(0),0);assert.equal(springProgress(1),1);for(let i=0;i<=100;i++){const value=springProgress(i/100);assert.ok(Number.isFinite(value));assert.ok(value>=0&&value<1.2);}});
test('companion responds to urgent and transient states before idle',()=>{assert.equal(companionMood({pending:true,thinking:true}),'expectant');assert.equal(companionMood({drop:true,sleeping:true}),'curious');assert.equal(companionMood({receiving:true,pending:true}),'receiving');assert.equal(companionMood({thinking:true,working:true}),'thinking');assert.equal(companionMood({celebrating:true,working:true}),'happy');assert.equal(companionMood({working:true}),'focused');assert.equal(companionMood({sleeping:true}),'sleepy');});

test('task animations distinguish reading, editing, and terminal work',()=>{
  const {taskMood,companionMood,companionPose}=require('../lib/motion');
  assert.equal(taskMood('Read'),'reading');assert.equal(taskMood('apply_patch'),'coding');assert.equal(taskMood('Bash'),'running');
  assert.equal(companionMood({working:true,task:'Grep'}),'reading');
  for(const mood of ['reading','coding','running','thinking','happy','receiving','expectant','sleepy']){
    assert.notDeepEqual(companionPose(mood,200),companionPose(mood,600));
    assert.deepEqual(companionPose(mood,200,true),{x:0,y:0,lean:0,sx:1,sy:1,gaze:0,arm:0});
  }
});
