const test=require('node:test'),assert=require('node:assert/strict');
const {resolveLanguage,t,menu}=require('../lib/locale');
const catalog=require('../lib/locale-catalog');
test('system language normalizes regional locales with a stable English fallback',()=>{
  assert.equal(resolveLanguage('system','es-MX'),'es');assert.equal(resolveLanguage('system','pt-BR'),'pt');
  assert.equal(resolveLanguage('system','zh-Hans-CN'),'zh');assert.equal(resolveLanguage('system','de-DE'),'en');
  assert.equal(resolveLanguage('ar','en-US'),'ar');
});
test('localized templates preserve model IDs, counts and menu structure',()=>{
  assert.equal(t('Gemini model','es'),'Modelo de Gemini');
  assert.equal(t('Step 2 of 7 · no account needed','es'),'Paso 2 de 7 · sin cuenta');
  assert.equal(t('Uses gpt-4.1-mini with your OpenAI key.','es'),'Usa gpt-4.1-mini con tu clave de OpenAI.');
  assert.equal(t('1 models','ru'),'1 модель');assert.equal(t('5 models','ru'),'5 моделей');
  assert.equal(t('Bookworm','ar'),'قارئ');
  const click=()=>{};const translated=menu([{label:'Open Nook',click,submenu:[{label:'Allow'}]}],'es');
  assert.equal(translated[0].click,click);assert.equal(translated[0].submenu[0].label,'Permitir');
});
test('every authored translation has all nine non-English languages and preserves placeholders',()=>{
  const fs=require('node:fs'),path=require('node:path');
  for(const file of fs.readdirSync(path.join(__dirname,'../locales')).filter(file=>file.endsWith('.tsv'))){
    for(const row of fs.readFileSync(path.join(__dirname,'../locales',file),'utf8').split(/\r?\n/).filter(row=>row&&!row.startsWith('#'))){
      const parts=row.split('|');assert.equal(parts.length,10,row);const placeholders=(parts[0].match(/\{[a-z]+\}/g)||[]).sort();
      for(const text of parts.slice(1)){assert.ok(text.trim());assert.deepEqual((text.match(/\{[a-z]+\}/g)||[]).sort(),placeholders,parts[0]);}
      assert.equal(Object.keys(catalog[parts[0]]).length,9);
    }
  }
});
