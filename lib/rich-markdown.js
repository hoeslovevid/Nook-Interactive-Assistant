(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NookRichMarkdown = api;
})(globalThis, () => {
  function webUrl(value) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
  }
  function inlineTokens(text, depth = 0) {
    if (depth > 5) return [{ type: 'text', text }];
    const result = [], pattern = /\\([\\*_\x60[\]])|\x60([^\x60\n]+)\x60|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
    let start = 0, match;
    while ((match = pattern.exec(text))) {
      if (match.index > start) result.push({ type: 'text', text: text.slice(start, match.index) });
      if (match[1]) result.push({ type: 'text', text: match[1] });
      else if (match[2]) result.push({ type: 'code', text: match[2] });
      else if (match[3] || match[4]) result.push({ type: 'strong', children: inlineTokens(match[3] || match[4], depth + 1) });
      else if (match[5] || match[6]) result.push({ type: 'em', children: inlineTokens(match[5] || match[6], depth + 1) });
      else { const href = webUrl(match[8]); result.push(href ? { type: 'link', href, children: inlineTokens(match[7], depth + 1) } : { type: 'text', text: match[0] }); }
      start = pattern.lastIndex;
    }
    if (start < text.length) result.push({ type: 'text', text: text.slice(start) });
    return result;
  }
  function markdownBlocks(text) {
    const blocks = [], lines = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').slice(0, 200000).split(/\r?\n/);
    let code = null;
    for (const line of lines) {
      const fence = line.match(/^\s*(\x60{3,}|~{3,})\s*(.*)$/);
      if (fence) {
        if (code && fence[1][0] === code.marker && fence[1].length >= code.size) { blocks.push(code); code = null; }
        else if (!code) code = { type: 'code', lang: fence[2].trim().slice(0, 40), text: '', marker: fence[1][0], size: fence[1].length };
        else code.text += line + '\n';
        continue;
      }
      if (code) { code.text += line + '\n'; continue; }
      if (!line.trim()) { blocks.push({ type: 'break', text: '' }); continue; }
      const heading = line.match(/^(#{1,6})\s+(.+)$/), quote = line.match(/^\s*>\s?(.*)$/), item = line.match(/^(\s*)(?:([-+*])|(\d+)[.)])\s+(.+)$/);
      if (heading) blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      else if (quote) blocks.push({ type: 'quote', text: quote[1] });
      else if (item) blocks.push({ type: 'item', indent: Math.min(5, Math.floor(item[1].replace(/\t/g, '  ').length / 2)), ordered: Boolean(item[3]), start: Number(item[3]) || 1, text: item[4] });
      else blocks.push({ type: 'text', text: line });
    }
    if (code) blocks.push(code);
    return blocks.map(block => block.type === 'code' ? { ...block, text: block.text.replace(/\n$/, '') } : block);
  }
  function renderMarkdown(text, { document: doc = document, openUrl = () => {}, copy = value => navigator.clipboard.writeText(value), copyLabel = 'Copy code' } = {}) {
    const fragment = doc.createDocumentFragment();
    function inline(parent, value) {
      function append(target, tokens) {
        for (const token of tokens) {
          if (token.type === 'text') { target.append(doc.createTextNode(token.text)); continue; }
          const node = doc.createElement(token.type === 'link' ? 'a' : token.type);
          if (token.type === 'link') { node.href = token.href; node.rel = 'noopener noreferrer'; node.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); openUrl(token.href); }); }
          if (token.children) append(node, token.children); else node.textContent = token.text;
          target.append(node);
        }
      }
      append(parent, inlineTokens(value));
    }
    let lists = [], paragraph = null, quote = null;
    for (const block of markdownBlocks(text)) {
      if (block.type === 'item') {
        paragraph = quote = null;
        let level = Math.min(block.indent, lists.length);
        if (level > 0 && !lists[level - 1]?.lastElementChild) level = 0;
        lists = lists.slice(0, level + 1);
        if (!lists[level] || (lists[level].tagName === 'OL') !== block.ordered) {
          const list = doc.createElement(block.ordered ? 'ol' : 'ul'); if (block.ordered) list.start = block.start;
          (level === 0 ? fragment : lists[level - 1].lastElementChild).append(list); lists[level] = list;
        }
        const item = doc.createElement('li'); inline(item, block.text); lists[level].append(item); continue;
      }
      lists = [];
      if (block.type === 'break') { paragraph = quote = null; continue; }
      if (block.type === 'code') {
        paragraph = quote = null;
        const panel = doc.createElement('div'); panel.className = 'markdown-code';
        const header = doc.createElement('div'); header.className = 'markdown-code-header';
        const label = doc.createElement('span'); label.textContent = block.lang || 'Code';
        const button = doc.createElement('button'); button.type = 'button'; button.className = 'text-button'; button.dataset.localize = 'true'; button.textContent = copyLabel;
        button.addEventListener('click', event => { event.stopPropagation(); Promise.resolve(copy(block.text)).catch(() => {}); });
        const pre = doc.createElement('pre'), code = doc.createElement('code'); code.textContent = block.text; pre.append(code); header.append(label, button); panel.append(header, pre); fragment.append(panel); continue;
      }
      if (block.type === 'heading') { paragraph = quote = null; const heading = doc.createElement('h' + block.level); inline(heading, block.text); fragment.append(heading); continue; }
      if (block.type === 'quote') { paragraph = null; if (!quote) { quote = doc.createElement('blockquote'); fragment.append(quote); } else quote.append(doc.createElement('br')); inline(quote, block.text); continue; }
      quote = null; if (!paragraph) { paragraph = doc.createElement('p'); fragment.append(paragraph); } else paragraph.append(doc.createElement('br')); inline(paragraph, block.text);
    }
    return fragment;
  }
  return { markdownBlocks, inlineTokens, webUrl, renderMarkdown };
});
