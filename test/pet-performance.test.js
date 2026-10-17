const test=require('node:test'),assert=require('node:assert/strict'),T=require('../lib/pet-performance');
test('task sequences prepare, work and settle; celebrations finish rather than looping forever',()=>{
 assert.equal(T.scene('coding',0).stage,'notice');assert.equal(T.scene('coding',500).stage,'prepare');assert.equal(T.scene('coding',1500).stage,'work');assert.equal(T.scene('happy',1800).stage,'settle');assert.equal(T.scene('happy',1800).y,0);assert.ok(T.scene('happy',500).y<0);assert.equal(require('../lib/motion').taskMood('Download model'),'downloading');assert.equal(require('../lib/motion').taskMood('Search documentation'),'searching');assert.equal(require('../lib/motion').taskMood('Plan the next task'),'planning');
});
test('body, expressions and choreography remain finite and bounded across every performance',()=>{
 for(const mood of T.CLIPS)for(let time=0;time<20000;time+=137){const p=T.scene(mood,time),f=T.face(mood,time,{active:true,level:1,viseme:6});for(const n of Object.values(p).filter(n=>typeof n==='number'))assert.ok(Number.isFinite(n)&&Math.abs(n)<12);for(const n of Object.values(f))assert.ok(Number.isFinite(n)&&Math.abs(n)<=2);assert.ok(!T.bodyPath(p.lean*10,p.y,Math.sin(time)).includes('NaN'));}assert.equal(T.bodyPath(Infinity,NaN,Infinity),T.bodyPath());assert.equal(T.entrance('emerge',2000).y,0);
});
test('idle gestures have rests and do not repeat the last gesture immediately',()=>{
 const idle=T.createIdle(42);let last='',current='',rests=0,gestures=0;for(let time=0;time<180000;time+=100){const p=idle.update(time);if(p.gesture==='rest'){rests++;current='';}else if(p.gesture!==current){assert.notEqual(p.gesture,last);last=current=p.gesture;gestures++;}}assert.ok(rests>100);assert.ok(gestures>5);
});
test('petting recognizes gentle strokes while rejecting drag and rapid pointer jumps',()=>{
 let state=null;for(let i=0;i<12;i++)state=T.petStroke(state,{x:i%2?18:0,y:12,time:i*90,buttons:0});assert.equal(state.trigger,true);assert.equal(T.petStroke(state,{x:400,y:12,time:1000,buttons:1}).trigger,false);const jump=T.petStroke({point:{x:0,y:0,time:100},energy:0},{x:300,y:0,time:101});assert.equal(jump.trigger,false);
});
test('speech shapes close during pauses; reduced and economy modes override quality',()=>{
 assert.equal(T.face('speaking',10,{active:true,viseme:0,level:1}).mouth,0);assert.equal(T.face('speaking',10,{active:false,viseme:6,level:1}).mouth,0);assert.ok(T.face('speaking',10,{active:true,viseme:6,level:.8}).mouth>0);assert.equal(T.frameRate({quality:'smooth',reduced:true}),0);assert.equal(T.frameRate({quality:'smooth',economy:true}),15);assert.equal(T.frameRate({paused:true,active:true}),0);assert.equal(T.frameRate({active:true}),60);assert.ok(T.frameRate({})<30);
});
test('streamed speech frames handle partial lines, preserve final results and ignore stopped children',async()=>{
 const {EventEmitter}=require('node:events');let done;const process=new EventEmitter();process.stdout=new EventEmitter();process.kill=()=>done(Error('Stopped'));const events=[],speech=require('../lib/speech-output').createSpeechOutput({onAudio:v=>events.push(v),run:(_e,_a,_o,cb)=>{done=cb;return process;}});const speaking=speech.speak({text:'Hello'});process.stdout.emit('data','{"event":"vis');process.stdout.emit('data','eme","id":6,"duration":120}\n');assert.equal(events.at(-1).viseme,6);done(null,'{"event":"viseme","id":6}\n{"ok":true}\n');assert.equal((await speaking).ok,true);assert.equal(events.at(-1).active,false);process.stdout.emit('data','{"event":"viseme","id":2}\n');assert.equal(events.at(-1).active,false,'Completed child output must be ignored');
});
