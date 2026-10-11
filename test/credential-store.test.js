const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createCredentialStore}=require('../lib/credential-store');
function fixture(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nook-credentials-')),values={};
  const adapter={read:async targets=>Object.fromEntries(targets.filter(target=>Object.hasOwn(values,target)).map(target=>[target,values[target]])),write:async(target,value)=>{values[target]=value;},delete:async target=>{delete values[target];}};
  const store=createCredentialStore({directory,providers:['chatgpt','claude'],decrypt:value=>value.slice(4),adapter});
  return{store,values,adapter,directory,file:path.join(directory,'provider-keys.json'),close(){fs.rmSync(directory,{recursive:true,force:true});}};
}
test('migration verifies writes and keeps only encrypted recovery data; secrets stay out of status',async()=>{
  const f=fixture();try{
    fs.writeFileSync(f.file,JSON.stringify({chatgpt:'enc:sample-private-key'}));assert.equal((await f.store.init()).ready,true);
    assert.equal(f.store.snapshot().chatgpt,'sample-private-key');assert.equal(fs.existsSync(f.file),false);
    assert.ok(!fs.readFileSync(f.file+'.migrated','utf8').includes('"sample-private-key"'));assert.ok(!JSON.stringify(f.store.status()).includes('sample-private-key'));
    await f.store.set('claude','another-test-key');await f.store.remove('chatgpt');assert.equal(f.store.snapshot().chatgpt,undefined);
    await assert.rejects(f.store.set('constructor','bad'));assert.equal(f.store.snapshot().claude,'another-test-key');
  }finally{f.close();}
});
test('failed migration retains the encrypted file; native keys win over old copies',async()=>{
  const f=fixture();try{
    const raw=JSON.stringify({chatgpt:'enc:old'});fs.writeFileSync(f.file,raw);f.adapter.write=async()=>{throw new Error('native failure');};
    assert.equal((await f.store.init()).ready,false);assert.equal(fs.readFileSync(f.file,'utf8'),raw);
  }finally{f.close();}
  const g=fixture();try{
    g.values[g.store.target('chatgpt')]='current';fs.writeFileSync(g.file,JSON.stringify({chatgpt:'enc:old'}));
    assert.equal((await g.store.init()).ready,true);assert.equal(g.store.snapshot().chatgpt,'current');
  }finally{g.close();}
});
test('a subsequent migration preserves both distinct encrypted recovery copies',async()=>{
  const f=fixture();try{
    fs.writeFileSync(f.file+'.migrated',JSON.stringify({chatgpt:'enc:previous'}));
    const raw=JSON.stringify({claude:'enc:new-recovery'});fs.writeFileSync(f.file,raw);
    assert.equal((await f.store.init()).ready,true);
    const backups=fs.readdirSync(f.directory).filter(name=>name.startsWith('provider-keys.json.migrated'));
    assert.equal(backups.length,2);assert.ok(backups.some(name=>fs.readFileSync(path.join(f.directory,name),'utf8')===raw));
  }finally{f.close();}
});
