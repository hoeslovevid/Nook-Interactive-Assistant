const fs=require('node:fs/promises'),path=require('node:path'),{Worker}=require('node:worker_threads');
async function readDocument(file){
 const stat=await fs.stat(file);if(!stat.isFile()||stat.size>20000000)throw new Error('Choose a document up to 20 MB.');
 const extension=path.extname(file).toLowerCase();if(!['.pdf','.docx','.txt','.md','.csv','.json','.js','.ts','.tsx','.jsx','.py','.css','.html','.xml','.yaml','.yml','.toml','.rs','.go','.c','.cpp','.h','.java','.swift','.kt','.sql','.log'].includes(extension))throw new Error('Choose a PDF, Word (.docx), text, or source file.');
 const bytes=await fs.readFile(file);if(bytes.length>20000000)throw new Error('Choose a document up to 20 MB.');return new Promise((resolve,reject)=>{
 const modulePath=path.join(__dirname,'document-worker.js'),input={bytes,name:path.basename(file),extension},isolated=extension==='.pdf';
 // Native canvas code used by PDF.js can crash a worker's entire host process on Windows.
 // Run PDFs in a separate Node process; text and Word retain the lighter worker thread.
 const worker=isolated?require('node:child_process').fork(modulePath,[],{execArgv:['--max-old-space-size=192'],serialization:'advanced',windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:['ignore','ignore','ignore','ipc']}):new Worker(modulePath,{workerData:input,resourceLimits:{maxOldGenerationSizeMb:192}});let settled=false,result=null;
 const kill=()=>isolated?worker.kill():worker.terminate().catch(()=>{});
 const done=(error,value,terminate=false)=>{if(settled)return;settled=true;clearTimeout(timer);if(terminate)kill();error?reject(error):resolve(value);};
 const timer=setTimeout(()=>done(new Error('Document reading took too long. Try a smaller document.'),null,true),20000);
 worker.once('message',value=>{result=value;});worker.once('error',error=>done(new Error('Could not read this document: '+error.message),null,true));
 worker.once('exit',code=>{if(settled)return;if(code!==0||!result)return done(new Error('Document reading stopped ('+code+').'));done(result.error?new Error(result.error):null,result.document);});
 if(isolated)worker.send(input,error=>{if(error)done(new Error('Document reading could not start.'),null,true);});
 });
}
async function indexProject(root){
 const ignore=require('ignore'),base=await fs.realpath(root),documents=[];let bytes=0,skipped=0,truncated=false,visited=0;const began=Date.now();
 const deny=name=>/^(?:\.git|\.hg|\.svn|node_modules|dist|build|vendor|coverage|\.cache|\.next|\.venv|venv|\.idea|\.vscode|\.aws|\.ssh|\.codex|\.agents)$/i.test(name)||/^(?:\.env(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|tokens?(?:\..*)?|id_(?:rsa|ed25519)|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i.test(name)||/\.(?:pem|key|pfx|p12|jks|keystore|kdbx|sqlite|db)$/i.test(name);
 async function rule(file,root){try{const stat=await fs.lstat(file);if(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=100000)return {root,matcher:ignore().add(await fs.readFile(file,'utf8'))};}catch{}return null;}
 function ignored(target,isDirectory,rules){let hidden=false;for(const r of rules){const relative=path.relative(r.root,target).split(path.sep).join('/');if(!relative||relative==='..'||relative.startsWith('../')||path.isAbsolute(relative))continue;const match=r.matcher.test(relative+(isDirectory?'/':''));if(match.ignored)hidden=true;else if(match.unignored)hidden=false;}return hidden;}
 const ancestors=[];let cursor=base,repository='';for(let i=0;i<30;i++){if(await fs.lstat(path.join(cursor,'.git')).catch(()=>null)){repository=cursor;break;}const parent=path.dirname(cursor);if(parent===cursor)break;ancestors.unshift(parent);cursor=parent;}
 const inherited=[];if(repository){const exclude=await rule(path.join(repository,'.git','info','exclude'),repository);if(exclude)inherited.push(exclude);for(const dir of ancestors.filter(dir=>dir===repository||dir.startsWith(repository+path.sep))){const r=await rule(path.join(dir,'.gitignore'),dir);if(r)inherited.push(r);}}
 async function walk(dir,rules,depth=0){if(depth>12){skipped++;return;}const rel=path.relative(base,dir).split(path.sep).join('/');const active=[...rules];const ownRule=await rule(path.join(dir,'.gitignore'),dir);if(ownRule)active.push(ownRule);
 const entries=(await fs.readdir(dir,{withFileTypes:true}).catch(()=>{skipped++;return [];})).sort((a,b)=>a.name.localeCompare(b.name));for(const entry of entries){visited++;if(visited>5000||Date.now()-began>15000||documents.length>=160||bytes>=4000000){truncated=true;return;}const name=entry.name,relative=(rel?rel+'/':'')+name,target=path.join(dir,name);if(entry.isSymbolicLink()||deny(name)||ignored(target,entry.isDirectory(),active)){skipped++;continue;}const real=await fs.realpath(target).catch(()=>null);if(!real||(!real.startsWith(base+path.sep)&&real!==base)){skipped++;continue;}if(entry.isDirectory())await walk(target,active,depth+1);else if(entry.isFile()){const stat=await fs.stat(target);if(stat.size>250000){skipped++;continue;}if(!/\.(?:txt|md|csv|json|js|ts|tsx|jsx|py|css|html|xml|yaml|yml|toml|rs|go|c|cpp|h|java|swift|kt|sql)$/i.test(name)){skipped++;continue;}const buffer=await fs.readFile(target);if(buffer.length>250000||buffer.includes(0)){skipped++;continue;}const content=buffer.toString('utf8');if(/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:sk-[A-Za-z0-9_-]{20,})|(?:gh[pousr]_[A-Za-z0-9]{25,}))/u.test(content)){skipped++;continue;}if(bytes+buffer.length>4000000){truncated=true;continue;}bytes+=buffer.length;documents.push({id:relative,name:relative,pages:[{number:1,label:'File',text:content}]});}}
 }
 if(!ignored(base,true,inherited))await walk(base,inherited);else skipped++;return {name:path.basename(base),root:base,documents,skipped,truncated};
}
module.exports={readDocument,indexProject};
