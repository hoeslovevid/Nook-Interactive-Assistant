const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function installExpansion({directory,ipcMain,dialog,credential,speech,encrypt,decrypt,broadcast,isSettings,openPath,launch,getState}){
 const personal=require('./personal-tools').createPersonalTools({directory,encrypt,decrypt,openPath,launch}),portfolio=require('./portfolio').createPortfolio({directory,encrypt,decrypt,readKey:id=>credential.snapshot()[id],onChange:broadcast}),imports=new Map();let discovered=new Map(),appsAt=0,appJob=null;
 const admin=new Set(['settings','key-save','key-remove','voices','voice-preview','contacts-add','contacts-remove','contacts-import','contacts-commit','personal-clear','apps-discover','apps-approve','apps-pick','apps-remove','portfolio-save','portfolio-clear']);
 ipcMain.handle('nook:extensions',async(event,{action,value}={})=>{try{
  if(admin.has(action)&&!isSettings(event.sender))throw new Error('Manage this feature in the Nook app.');
  if(action==='snapshot')return {ok:true,...snapshot()};
  if(action==='settings')return {ok:true,contacts:personal.contacts(),apps:personal.apps(),portfolio:portfolio.settings(),error:personal.snapshot().error};
  if(action==='contacts-find')return {ok:true,contacts:personal.findContacts(value)};
  if(action==='contacts-add'){personal.addContact(value);broadcast();return {ok:true};}
  if(action==='contacts-remove'){personal.removeContact(value);broadcast();return {ok:true};}
  if(action==='contacts-import'){const pick=await dialog.showOpenDialog({title:'Import contacts for local email drafts',properties:['openFile'],filters:[{name:'Contacts',extensions:['csv','vcf']}]});if(pick.canceled)return {ok:true,cancelled:true};const file=pick.filePaths[0],stat=fs.statSync(file);if(!stat.isFile()||stat.size>1000000)throw new Error('Choose a CSV or vCard file within 1 MB.');const rows=require('./personal-tools').parseContacts(fs.readFileSync(file,'utf8'),path.extname(file).toLowerCase()),id=crypto.randomUUID();imports.clear();imports.set(id,{rows,expires:Date.now()+300000});return {ok:true,id,contacts:rows};}
  if(action==='contacts-commit'){const offer=imports.get(value);imports.delete(value);if(!offer||offer.expires<Date.now())throw new Error('Preview the contact import again.');const count=personal.importContacts(offer.rows);broadcast();return {ok:true,count};}
  if(action==='personal-clear'){personal.clear();broadcast();return {ok:true};}
  if(action==='apps-discover'){if(appJob)return appJob;if(Date.now()-appsAt<300000&&discovered.size)return {ok:true,apps:[...discovered.values()]};appJob=(async()=>{const result=await require('./native').runScript('windows-apps.ps1',[],20000);if(!result.ok)throw new Error(result.error);discovered=new Map();for(const value of (result.apps||[]).slice(0,1000)){try{const a=require('./personal-tools').cleanApp(value);discovered.set(a.id,a);}catch{}}appsAt=Date.now();return {ok:true,apps:[...discovered.values()]};})();try{return await appJob;}finally{appJob=null;}}
  if(action==='apps-approve'){const chosen=discovered.get(value?.id);if(!chosen)throw new Error('Find installed apps and select one first.');personal.addApp({...chosen,name:value.name||chosen.name});broadcast();return {ok:true};}
  if(action==='apps-pick'){const pick=await dialog.showOpenDialog({title:'Approve an app for voice launching',properties:['openFile'],filters:[{name:'Windows application',extensions:['exe']}]});if(pick.canceled)return {ok:true,cancelled:true};const file=pick.filePaths[0];const app=personal.addApp({name:value?.name||path.basename(file,'.exe'),kind:'exe',target:file});broadcast();return {ok:true,app:{id:app.id,name:app.name}};}
  if(action==='apps-remove'){personal.removeApp(value);broadcast();return {ok:true};}
  if(action==='key-save'){const id=value?.id;if(!['elevenlabs','portfolio-kraken','portfolio-coinbase','coingecko'].includes(id))throw new Error('Choose a supported connection.');let key=String(value.key||'').trim();if(id==='portfolio-coinbase'){key=JSON.stringify(require('./portfolio-networks').coinbaseKey(value));}else if(id==='portfolio-kraken'){if(!/^[A-Za-z0-9+/=_-]{10,200}$/.test(value.key||'')||!/^[A-Za-z0-9+/=]{20,250}$/.test(value.secret||''))throw new Error('Enter the Kraken API key and base64 private key.');key=JSON.stringify({key:value.key,secret:value.secret});}else if(!/^[A-Za-z0-9_-]{8,256}$/.test(key))throw new Error('Enter a valid API key.');await credential.set(id,key);broadcast();return {ok:true};}
  if(action==='key-remove'){if(!['elevenlabs','portfolio-kraken','portfolio-coinbase','coingecko'].includes(value))throw new Error('Choose a supported connection.');await credential.remove(value);if(value==='elevenlabs')speech.stop();broadcast();return {ok:true};}
  if(action==='voices')return await speech.cloudVoices(value||'');
  if(action==='voice-preview'){if(getState().prefs?.muted)throw new Error('Unmute Nook to preview a voice.');return await speech.speak({provider:'elevenlabs',voice:value?.voice,rate:value?.rate||0,text:'Hi, I’m Nook. Your workspace companion is ready.'});}
  if(action==='portfolio-save')return {ok:true,...portfolio.save(value)};
  if(action==='portfolio-hide')return {ok:true,...portfolio.hide(value)};
  if(action==='portfolio-refresh')return {ok:true,...await portfolio.refresh()};
  if(action==='portfolio-clear'){portfolio.clear();return {ok:true};}
  throw new Error('Unknown feature action.');
 }catch(error){return {ok:false,error:error.message};}});
 function snapshot(){const keys=credential.snapshot();return {personal:personal.snapshot(),portfolio:portfolio.snapshot(),keys:{elevenlabs:Boolean(keys.elevenlabs),kraken:Boolean(keys['portfolio-kraken']),coinbase:Boolean(keys['portfolio-coinbase']),coingecko:Boolean(keys.coingecko)}};}
 return {personal,portfolio,snapshot,stop(){portfolio.stop();imports.clear();}};
}
module.exports={installExpansion};
