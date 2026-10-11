(function (root, factory) {
  const catalog = typeof module === 'object' && module.exports ? require('./locale-catalog') : root.NookLocaleCatalog;
  const api = factory(catalog || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.NookLocale = api; api.mount(); }
})(globalThis, catalog => {
  const LANGUAGES = ['en','zh','hi','es','ar','fr','bn','pt','ru','id'];
  const localeIds = { zh: 'zh-Hans', pt: 'pt-BR' };
  function resolveLanguage(value, system = 'en') {
    const candidate = value === 'system' || !value ? system : value;
    const short = String(candidate).toLowerCase().split(/[-_]/)[0];
    return LANGUAGES.includes(short) ? short : 'en';
  }
  let language = 'en';
  const templates = Object.keys(catalog).filter(key => /\{[a-z0-9]+\}/i.test(key)).sort((a,b) => b.replace(/\{[^}]+\}/g,'').length - a.replace(/\{[^}]+\}/g,'').length).map(key => {
    const names = [], escaped = key.split(/(\{[a-z0-9]+\})/i).map(part => {
      if (/^\{/.test(part)) { const name=part.slice(1,-1); names.push(name); return /^(0|n|h|m|count|total|step|seconds|index|allowed|denied)$/i.test(name) ? '([0-9]+(?:\\.[0-9]+)?)' : '(.+?)'; }
      return part.replace(/[.*+?^\x24{}()|[\]\\]/g, '\\$&');
    }).join('');
    return { key, names, regex: new RegExp('^' + escaped + '$') };
  });
  function t(value, selected = language) {
    const text = String(value ?? ''), resolved = resolveLanguage(selected), id = localeIds[resolved] || resolved;
    if (resolved === 'en') return text;
    function translated(entry, names=[], match=[]) {
      if(typeof entry==='string')return entry;
      if(!entry || typeof entry!=='object')return '';
      const index=names.findIndex(name=>/^(count|n|total)$/.test(name));
      const form=index<0?'other':new Intl.PluralRules(id).select(Number(match[index+1]));
      return entry[form] || entry.other || '';
    }
    const exact = translated(catalog[text]?.[id]); if (exact) return exact;
    if (text.includes('\n')) return text.split('\n').map(part=>t(part,resolved)).join('\n');
    for (const template of templates) {
      const match = text.match(template.regex), value = match && translated(catalog[template.key]?.[id],template.names,match);
      if (match && value) return value.replace(/\{([a-z0-9]+)\}/gi, (whole, name) => match[template.names.indexOf(name) + 1] || whole);
    }
    if (text.includes(' · ')) return text.split(' · ').map(part => t(part, resolved)).join(' · ');
    if (text.endsWith('?')) return t(text.slice(0,-1),resolved)+'?';
    const prefixed = text.match(/^([◉▣←]\s*)(.*)$/); if (prefixed) return prefixed[1] + t(prefixed[2], resolved);
    return text;
  }
  function menu(items, selected) {
    return items.map(item => ({ ...item, ...(item.label ? { label: t(item.label, selected) } : {}), ...(item.submenu ? { submenu: menu(item.submenu, selected) } : {}) }));
  }
  function mount() {
    const texts = new WeakMap(), attributes = new WeakMap();
    const skip = 'script,style,pre,code,kbd,[data-no-localize],#transcript,#questions,#phone-drafts .draft-card>strong,#phone-drafts .draft-card>p,#history-detail h3:not([data-localize]),#history-detail p,#music-title,#music-artist,.window-choice span,.diff,.diff-code,.diff-gutter,.service-card-copy>span,#chat-model-options,.discovered-models,datalist';
    let scheduled = false, observer;
    function translateNode(node) {
      if (!node.parentElement || node.parentElement.closest(skip) && !node.parentElement.closest('[data-localize]')) return;
      const current = node.nodeValue, previous = texts.get(node);
      const source = previous && current === previous.painted ? previous.source : current;
      const core = source.trim(); if (!core) return;
      const painted = source.replace(core, t(core));
      if (current !== painted) node.nodeValue = painted;
      texts.set(node, { source, painted });
    }
    function refresh() {
      scheduled = false; observer?.disconnect();
      document.documentElement.lang = localeIds[language] || language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) translateNode(node);
      for (const element of document.querySelectorAll('[placeholder],[aria-label],[title]')) {
        if (element.closest(skip) && !element.closest('[data-localize]') || element.matches('input[type=password]')) continue;
        const previous = attributes.get(element) || {};
        for (const name of ['placeholder','aria-label','title']) {
          if (!element.hasAttribute(name)) continue;
          const current = element.getAttribute(name), original = previous[name]?.painted === current ? previous[name].source : current, painted = t(original);
          if (current !== painted) element.setAttribute(name, painted);
          previous[name] = { source: original, painted };
        }
        attributes.set(element, previous);
      }
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder','aria-label','title'] });
    }
    function schedule() { if (language !== 'en' && !scheduled) { scheduled = true; requestAnimationFrame(refresh); } }
    function start() {
      observer = new MutationObserver(schedule); refresh();
      window.nook.onState(state => {
        const next = resolveLanguage(state.prefs?.resolvedLanguage || state.prefs?.language, navigator.language);
        if (next !== language) { language = next; refresh(); window.dispatchEvent(new Event('nook-language-change')); }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  return { LANGUAGES, resolveLanguage, t, menu, mount };
});
