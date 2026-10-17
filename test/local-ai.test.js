const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{EventEmitter}=require('node:events');
const {createLocalAI,hardware,normalize,archiveEntries,inside}=require('../lib/local-ai');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function fixture(t,extra={}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nook-local-')),zip=require('fflate').zipSync({'llama-server.exe':Buffer.from('fixture binary')}),model=Buffer.from('fixture weights'),assets={runtime:{url:'https://fixture.test/runtime',file:'runtime.zip',size:zip.length,sha256:sha(zip)},models:{'nook-lite':{url:'https://fixture.test/model',file:'lite.gguf',size:model.length,sha256:sha(model),name:'Lite',base:'fixture',license:'Apache-2.0'}}};let processHandle,posts=[];
 const fetcher=async(url,options)=>{if(url===assets.runtime.url)return new Response(zip);if(url===assets.models['nook-lite'].url)return new Response(model);assert.match(url,/^http:\/\/127\.0\.0\.1:/);assert.ok(options.headers.Authorization.startsWith('Bearer '));return Response.json({data:[{id:'nook-lite'}]});};
 const launch=(_exe,args)=>{assert.equal(args[args.indexOf('--host')+1],'127.0.0.1');assert.ok(args.includes('--offline'));processHandle=new EventEmitter();processHandle.kill=()=>{processHandle.killed=true;processHandle.emit('exit',0);};return processHandle;};
 const manager=createLocalAI({directory,assets,fetcher,launch,system:hardware({platform:'win32',arch:'x64',memory:16*1073741824,cores:12}),encrypt:s=>Buffer.from(s).toString('base64'),decrypt:s=>Buffer.from(s,'base64').toString(),transport:async(...args)=>{posts.push(args);return 'Local reply';},...extra});t.after(()=>{manager.stop();fs.rmSync(directory,{recursive:true,force:true});});return {manager,directory,assets,posts,get child(){return processHandle;}};
}
test('local settings and hardware bound CPU/context choices; archive and storage paths reject traversal',()=>{
 assert.equal(normalize({threads:400,context:999,model:'remote'}).threads,8);assert.equal(normalize({context:999}).context,4096);assert.equal(hardware({platform:'win32',arch:'x64',memory:8*1073741824,cores:4}).recommended,'nook-lite');assert.equal(hardware({platform:'darwin'}).supported,false);assert.throws(()=>archiveEntries({'../x':Buffer.from('bad')}),/Unsafe/);assert.throws(()=>archiveEntries({'C:/x':Buffer.from('bad')}),/Unsafe/);assert.throws(()=>inside(os.tmpdir(),path.resolve(os.tmpdir(),'../elsewhere')),/Invalid/);
});
test('verified install, managed routing and explicit memory stay private to local prompts',async t=>{
 const f=fixture(t),m=f.manager;assert.equal(m.models().ok,false);await m.install('nook-lite');assert.deepEqual(m.models().models,['nook-lite']);m.saveMemories(['Call me Alex']);const c=await m.start('nook-lite');assert.ok(!JSON.stringify(m.snapshot()).includes(c.token));await m.complete('',[{role:'user',content:'Hello'}],{model:'nook-lite'});const [provider,key,rows,options]=f.posts[0];assert.equal(provider,'nook');assert.equal(key,c.token);assert.equal(rows[0].content,'Hello');assert.match(options.system,/Call me Alex/);assert.equal(options.url,c.url);assert.equal(options.model,'nook-lite');assert.ok(!fs.readFileSync(path.join(f.directory,'local-ai/memory.json'),'utf8').includes('Alex'));m.clearMemories();assert.equal(f.child.killed,true);assert.equal(m.snapshot().memoryCount,0);await assert.rejects(m.complete('',[],{model:'nook-lite',attachment:{image:'data'}}),/image was not sent/);
});
test('checksum mismatch never installs a model and retry replaces an incomplete existing file',async t=>{
 let corrupt=true;const f=fixture(t,{fetcher:async url=>new Response(url.endsWith('runtime')?require('fflate').zipSync({'llama-server.exe':Buffer.from('fixture binary')}):Buffer.from(corrupt?'invalid weights':'fixture weights'))});await assert.rejects(f.manager.install('nook-lite'),/checksum/);assert.deepEqual(f.manager.snapshot().installed,[]);assert.equal(fs.readdirSync(path.join(f.directory,'local-ai')).some(x=>x.endsWith('.part')),false);fs.writeFileSync(path.join(f.directory,'local-ai/lite.gguf'),'incomplete');corrupt=false;await f.manager.install('nook-lite');assert.deepEqual(f.manager.snapshot().installed,['nook-lite']);
});
test('tampered installed files are rejected before process launch; uninstalled models cannot fall back remotely',async t=>{
 const f=fixture(t);await assert.rejects(f.manager.complete('',[],{model:'nook-lite'}),/Download/);await f.manager.install('nook-lite');fs.writeFileSync(path.join(f.directory,'local-ai/lite.gguf'),'tamper! weights');await assert.rejects(f.manager.start('nook-lite'),/verification/);assert.equal(f.child,undefined);assert.equal(f.posts.length,0);
});
test('cancel and suspend abort downloads without leaving installed markers',async t=>{
 const f=fixture(t,{fetcher:async(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}))});const pending=f.manager.install('nook-lite');assert.equal(f.manager.snapshot().downloading,true);f.manager.suspend();await assert.rejects(pending,/cancelled/);assert.equal(f.manager.snapshot().downloading,false);assert.deepEqual(f.manager.snapshot().installed,[]);await assert.rejects(f.manager.start('nook-lite'),/resume/);
});
test('startup cancellation kills the owned child and cannot leave the engine ready',async t=>{
 const f=fixture(t,{fetcher:async(url,{signal}={})=>{if(url.startsWith('http:'))return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}));return new Response(url.endsWith('runtime')?require('fflate').zipSync({'llama-server.exe':Buffer.from('fixture binary')}):Buffer.from('fixture weights'));}});await f.manager.install('nook-lite');const pending=f.manager.start('nook-lite');while(!f.child)await new Promise(r=>setTimeout(r,5));f.manager.unload();await assert.rejects(pending,/stopped/);assert.equal(f.child.killed,true);assert.equal(f.manager.snapshot().phase,'unloaded');
});
test('unreadable memory is preserved until explicitly cleared',async t=>{
 const f=fixture(t);f.manager.stop();const file=path.join(f.directory,'local-ai/memory.json');fs.writeFileSync(file,'unreadable');const m=createLocalAI({directory:f.directory,decrypt:()=>{throw Error('No key');},encrypt:s=>s});t.after(()=>m.stop());assert.match(m.memories().error,/preserved/);assert.throws(()=>m.saveMemories(['replacement']),/Clear/);assert.equal(fs.readFileSync(file,'utf8'),'unreadable');m.clearMemories();assert.equal(fs.existsSync(file),false);
});
test('model discovery uses installed managed models without reaching any remote provider',async()=>{
 const {createModelDiscovery}=require('../lib/model-discovery');const d=createModelDiscovery({managed:()=>({ok:true,models:['nook-lite']}),fetcher:()=>{throw Error('Unexpected network');}});assert.deepEqual((await d.discover('nook')).models,['nook-lite']);const {choose}=require('../lib/model-routing');assert.equal(choose('local',{models:{nook:'nook-lite'},health:{nook:{ready:true}}}).provider,'nook');assert.throws(()=>choose('local',{models:{nook:'nook-lite'}}),/Configure/);
});

test('local provider survives chat saving, profiles, assistant and dictation preferences',t=>{
 const f=fixture(t),options={directory:f.directory,encrypt:s=>Buffer.from(s).toString('base64'),decrypt:s=>Buffer.from(s,'base64').toString()},create=require('../lib/everyday-store').createEverydayStore,store=create(options);store.save({saveChats:true});store.checkpoint([{id:'qa-local-message',provider:'nook',role:'user',content:'Keep my local conversation'}]);assert.equal(create(options).restore()[0].provider,'nook');assert.equal(create(options).restore()[0].content,'Keep my local conversation');
 assert.deepEqual(require('../lib/experience').normalize({favorites:['nook:nook-lite']}).favorites,['nook:nook-lite']);
 assert.equal(require('../lib/studio').normalize({wakeProvider:'nook'}).wakeProvider,'nook');
 assert.equal(require('../lib/voice-workspace').normalize({provider:'nook'}).provider,'nook');
});
test('idle timeout unloads an inactive engine and clears its connection',async t=>{
 t.mock.timers.enable({apis:['setInterval','Date'],now:Date.now()});const f=fixture(t);await f.manager.install('nook-lite');f.manager.save({idleMinutes:1});await f.manager.start('nook-lite');t.mock.timers.tick(75000);assert.equal(f.child.killed,true);assert.equal(f.manager.snapshot().phase,'unloaded');
});

test('installation retries temporary Windows file locks and cancellation stops retries',async()=>{
 const {renameInstalled}=require('../lib/local-ai');let attempts=0;await renameInstalled('source','target',undefined,async()=>{if(++attempts<3)throw Object.assign(Error('File locked'),{code:'EPERM'});});assert.equal(attempts,3);const stop=new AbortController();attempts=0;await assert.rejects(renameInstalled('source','target',stop.signal,async()=>{attempts++;stop.abort();throw Object.assign(Error('File locked'),{code:'EBUSY'});}),/stopped|cancelled/);assert.equal(attempts,1);
});
