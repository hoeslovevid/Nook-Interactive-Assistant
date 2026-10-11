const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createSoundSettings}=require('../lib/sound-settings');
test('sound import validates audio, preserves files on rejection, and saves event volume',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nook-sounds-'));try{
    const sounds=createSoundSettings(directory),recording=Buffer.alloc(44);recording.write('RIFF');recording.write('WAVE',8);
    const source=path.join(directory,'test.wav');fs.writeFileSync(source,recording);sounds.import('ask',source);assert.match(sounds.read('ask'),/^data:audio\/wav;base64,/);
    fs.writeFileSync(source,'Not audio');assert.throws(()=>sounds.import('ask',source));assert.ok(sounds.read('ask'));
    sounds.save({volume:999,enabled:{ask:false}});const reopened=createSoundSettings(directory);assert.equal(reopened.snapshot().volume,100);assert.equal(reopened.snapshot().enabled.ask,false);
    assert.throws(()=>sounds.import('../outside',source));sounds.remove('ask');assert.equal(sounds.read('ask'),'');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
