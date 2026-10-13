const {spawn}=require('node:child_process'),path=require('node:path');
function createForegroundWatcher({launch=spawn}={}){
  let child=null,app='',buffer='',generation=0;
  return {snapshot:()=>({app}),start(){if(child)return;const id=++generation;try{const own=launch('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-foreground.ps1'),'-Watch'],{windowsHide:true,stdio:['ignore','pipe','pipe']});child=own;own.stderr?.resume?.();own.stdout.on('data',data=>{if(id!==generation)return;buffer+=data.toString('utf8');if(buffer.length>4000){this.stop();return;}let at;while((at=buffer.indexOf('\n'))>=0){try{const value=JSON.parse(buffer.slice(0,at).trim());app=typeof value.app==='string'?value.app.slice(0,160):'';}catch{}buffer=buffer.slice(at+1);}});const end=()=>{if(id===generation){child=null;app='';buffer='';}};own.on('error',end);own.on('exit',end);}catch{child=null;app='';}},stop(){generation++;child?.kill();child=null;app='';buffer='';}};
}
module.exports={createForegroundWatcher};
