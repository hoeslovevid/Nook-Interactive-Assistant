const test=require('node:test'),assert=require('node:assert/strict');
const {previewHandoff,copyHandoff}=require('../lib/chat-handoff');
const providers={a:{},b:{}},messages=[{provider:'a',role:'user',content:'Question',attachment:{private:'file'}},{provider:'a',role:'assistant',content:'Answer'},{provider:'b',role:'user',content:'Other chat'}];
test('handoff copies selected text in conversation order and preserves the source',()=>{
  const preview=previewHandoff(messages,'a'),before=JSON.stringify(messages);
  const copied=copyHandoff(messages,{from:'a',to:'b',revision:preview.revision,selected:[1,0]},providers);
  assert.deepEqual(copied.map(row=>row.content),['Question','Answer']);assert.equal(JSON.stringify(messages),before);
  assert.ok(copied.every(row=>Object.keys(row).toSorted().join(',')==='content,provider,role'));
});
test('handoff rejects stale responses, duplicate/out-of-range selection and unknown destinations',()=>{
  const input={from:'a',to:'b',revision:previewHandoff(messages,'a').revision,selected:[0]};
  assert.throws(()=>copyHandoff([...messages,{provider:'a',role:'assistant',content:'new'}],input,providers),/changed/);
  for(const selected of [[],[0,0],[-1],[8],[.5]])assert.throws(()=>copyHandoff(messages,{...input,selected},providers));
  assert.throws(()=>copyHandoff(messages,{...input,to:'constructor'},providers));
});
test('handoff never silently truncates long replies and rejects oversized selections',()=>{
  const rows=[{provider:'a',role:'assistant',content:'x'.repeat(20000)}],preview=previewHandoff(rows,'a');
  assert.equal(copyHandoff(rows,{from:'a',to:'b',revision:preview.revision,selected:[0]},providers)[0].content.length,20000);
  rows[0].content='x'.repeat(64001);assert.throws(()=>copyHandoff(rows,{from:'a',to:'b',revision:previewHandoff(rows,'a').revision,selected:[0]},providers),/64,000/);
});
