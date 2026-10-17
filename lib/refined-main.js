const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function installRefined({directory,ipcMain,dialog,isSettings,encrypt,decrypt,broadcast,routingState,applyModel,saveCompanion,getCompanion,isBusy}){
 const file=path.join(directory,'interface-options.json');let prefs={advanced:false,activityQueue:true};try{const p=JSON.parse(fs.readFileSync(file,'utf8'));prefs={advanced:p.advanced===true,activityQueue:p.activityQueue!==false};}catch{}
 const memory=require('./memory-center').createMemoryCenter({directory,encrypt,decrypt,onChange:broadcast}),offers=new Map(),P=require('./pet-packs');
 function put(item){for(const [id,o]of offers)if(o.expires<Date.now())offers.delete(id);while(offers.size>=12)offers.delete(offers.keys().next().value);const id=crypto.randomUUID();offers.set(id,{...item,expires:Date.now()+120000});return id;}
 const admin=new Set(['preferences','memories','memory-enable','memory-save','memory-remove','memory-clear','pet-import','pet-export','pet-apply','pet-builtins']);
 ipcMain.handle('nook:refined',async(e,{action,value}={})=>{try{
  if(admin.has(action)&&!isSettings(e.sender))throw Error('Open the Nook app to change this setting.');
  if(action==='snapshot')return {ok:true,...snapshot()};
  if(action==='preferences'){const next={advanced:typeof value?.advanced==='boolean'?value.advanced:prefs.advanced,activityQueue:typeof value?.activityQueue==='boolean'?value.activityQueue:prefs.activityQueue};fs.writeFileSync(file+'.tmp',JSON.stringify(next));fs.renameSync(file+'.tmp',file);prefs=next;broadcast();return {ok:true,...snapshot()};}
  if(action==='memories')return {ok:true,...memory.list()};
  if(action==='memory-enable')memory.enable(value);
  else if(action==='memory-save')memory.save(value);
  else if(action==='memory-remove')memory.remove(value);
  else if(action==='memory-clear')memory.clear();
  else if(action==='recommend'){const selection=require('./smart-models').recommend(value,routingState());return {ok:true,...selection,id:put({kind:'model',request:value,rows:selection.rows})};}
  else if(action==='model-apply'){if(isBusy())throw Error('Finish or stop the current reply first.');const offer=offers.get(value?.id);offers.delete(value?.id);if(!offer||offer.kind!=='model'||offer.expires<Date.now())throw Error('Refresh these recommendations first.');const selected=offer.rows.find(r=>r.provider===value.provider&&r.model===value.model),current=require('./smart-models').recommend(offer.request,routingState()).rows;if(!selected||!current.some(r=>r.provider===selected.provider&&r.model===selected.model&&r.cost===selected.cost))throw Error('This recommendation changed. Review a fresh list.');applyModel(selected);return {ok:true};}
  else if(action==='pet-builtins')return {ok:true,packs:P.BUILTINS.map(p=>({id:put({kind:'pet',pack:p}),pack:p}))};
  else if(action==='pet-import'){const pick=await dialog.showOpenDialog({title:'Preview a Nook pet pack',properties:['openFile'],filters:[{name:'Nook pet pack',extensions:['json']}]});if(pick.canceled)return {ok:true,cancelled:true};const f=pick.filePaths[0];if(!fs.statSync(f).isFile()||fs.statSync(f).size>20000)throw Error('Choose a pet pack within 20 KB.');const pack=P.parsePack(JSON.parse(fs.readFileSync(f,'utf8')));return {ok:true,id:put({kind:'pet',pack}),pack};}
  else if(action==='pet-apply'){const offer=offers.get(value);offers.delete(value);if(!offer||offer.kind!=='pet'||offer.expires<Date.now())throw Error('Preview this pet pack again.');saveCompanion({petPack:offer.pack,outfit:offer.pack.outfit,skin:offer.pack.skin,seasonal:false,layered:false});return {ok:true};}
  else if(action==='pet-export'){const c=getCompanion(),skin=require('./companion').SKINS[c.skin],active=c.petPack?.outfit===c.outfit&&c.petPack?.skin===c.skin?c.petPack:null,pack=P.exportPack({...skin,...active,name:active?.name||'My Nook',body:active?.body||skin.body,top:active?.top||skin.top,ink:active?.ink||skin.ink,outfit:c.outfit,skin:c.skin});const pick=await dialog.showSaveDialog({title:'Save a shareable pet pack',defaultPath:'Nook-pet.json',filters:[{name:'Nook pet pack',extensions:['json']}]});if(!pick.canceled)fs.writeFileSync(pick.filePath,JSON.stringify(pack,null,2));return {ok:true,cancelled:pick.canceled};}
  else throw Error('Unknown customization action.');return {ok:true,...snapshot()};
 }catch(error){return {ok:false,error:error.message};}});
 function snapshot(){return {prefs:{...prefs},memory:memory.snapshot()};}
 return {snapshot,memory};
}
module.exports={installRefined};
