"""Compile attributed Coucou translations and Nook's own interface strings."""
from pathlib import Path
import json
root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'locales/coucou.json').read_text(encoding='utf-8'))
catalog.update(json.loads((root / 'locales/core.json').read_text(encoding='utf-8')))
languages = ['zh-Hans', 'hi', 'es', 'ar', 'fr', 'bn', 'pt-BR', 'ru', 'id']
for file in sorted((root / 'locales').glob('*.tsv')):
    for line in file.read_text(encoding='utf-8').splitlines():
        if not line or line.startswith('#'): continue
        values = line.split('|')
        if len(values) != 10: raise ValueError('Expected nine translations: ' + values[0])
        catalog[values[0]] = dict(zip(languages, values[1:]))
aliases_file = root / 'locales/aliases.json'
if aliases_file.exists():
    for english, key in json.loads(aliases_file.read_text(encoding='utf-8')).items():
        if key not in catalog: raise ValueError('Unknown localization alias: ' + key)
        catalog[english] = catalog[key]
source = '// Coucou translations: MIT, copyright 2026 Louis Raillé. See Coucou-Translation-LICENSE.txt.\n(function(root){ const catalog=' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '; if(typeof module==="object"&&module.exports)module.exports=catalog;else root.NookLocaleCatalog=catalog; })(globalThis);\n'
(root / 'lib/locale-catalog.js').write_text(source, encoding='utf-8')
print('Compiled', len(catalog), 'localized interface phrases.')
