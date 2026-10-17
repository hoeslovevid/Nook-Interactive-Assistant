const fs=require('node:fs'),path=require('node:path'),version=require('../package.json').version;
const output=process.argv[2]||'dist';
if(version.includes('-')){if(!/^\d+\.\d+\.\d+-beta\.\d+$/.test(version))throw new Error('Preview releases must use version X.Y.Z-beta.N');const from=path.join(output,'latest.yml'),to=path.join(output,'beta.yml');if(fs.existsSync(from)){fs.copyFileSync(from,to);fs.unlinkSync(from);}if(!fs.existsSync(to))throw new Error('Beta update metadata is missing');}
