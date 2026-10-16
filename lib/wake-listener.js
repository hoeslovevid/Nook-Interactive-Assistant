const {spawn}=require('node:child_process'),path=require('node:path');
function createWakeListener({launch=spawn,onChange=()=>{},onWake=()=>{},onText=()=>{},onIdle=()=>{}}={}){
  let child=null,state={phase:'off',error:''},generation=0,buffer='';
  const update=(phase,error='')=>{state={phase,error};onChange();};
  function stop(){generation++;const process=child;child=null;buffer='';process?.kill();update('off');}
  function start(language='auto',{followUp=false}={}){stop();const id=generation;update('starting');try{child=launch('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-wake.ps1'),'-Language',language,...(followUp?['-FollowUp']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe']});const own=child;own.stderr?.resume?.();
    own.stdout.on('data',chunk=>{if(id!==generation)return;buffer+=chunk.toString('utf8');if(buffer.length>16000){stop();update('error','Speech recognition returned an oversized result.');return;}let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);try{const event=JSON.parse(line);if(event.type==='ready'||event.type==='idle')update(event.type==='ready'&&followUp?'listening':'armed');else if(event.type==='wake'){update('listening');onWake();}else if(event.type==='text'&&typeof event.text==='string'&&event.text.trim()){update('armed');onText(event.text.trim().slice(0,2000),{followUp});}else if(event.type==='error'){const old=child;child=null;old?.kill();update('error','Wake-word recognition could not start. Check the default Windows microphone and installed speech language.');}}catch{}}});
    own.on('error',()=>{if(id===generation){child=null;update('error','Windows speech recognition is unavailable.');}});own.on('exit',()=>{if(id===generation&&child===own){child=null;if(followUp){update('off');onIdle();return;}update('error','Speech recognition stopped. Restart the listener in Connection health.');}});
  }catch{child=null;update('error','Windows speech recognition is unavailable.');}}
  return {start,stop,snapshot:()=>({...state})};
}
module.exports={createWakeListener};
