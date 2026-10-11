const test = require('node:test'), assert = require('node:assert/strict');
const { inlineTokens, markdownBlocks, webUrl } = require('../lib/rich-markdown');
test('rich formatting preserves lists, quotes, and unfinished streamed code fences', () => {
  const tick = String.fromCharCode(96);
  const blocks = markdownBlocks('# Title\n\n1. First\n  - Nested\n> Quoted\n' + tick.repeat(3) + 'js\nconst x=1');
  assert.equal(blocks[0].type,'heading'); assert.equal(blocks[2].ordered,true); assert.equal(blocks[3].indent,1);
  assert.equal(blocks[4].type,'quote'); assert.equal(blocks[5].text,'const x=1');
  assert.deepEqual(inlineTokens('**bold** and ' + tick + 'code' + tick).map(row=>row.type),['strong','text','code']);
});
test('chat links reject script/file/data protocols and credentials; HTML stays literal', () => {
  for (const value of ['javascript:alert(1)','file:///C:/private','data:text/html,test','https://user:password@example.com']) assert.equal(webUrl(value),'');
  assert.equal(webUrl('https://example.com/doc'),'https://example.com/doc');
  assert.equal(inlineTokens('<img src=x onerror=alert(1)>')[0].type,'text');
  assert.equal(inlineTokens('[run](javascript:evil)')[0].type,'text');
});
