const {spawn}=require('node:child_process'),path=require('node:path');
function createFullscreenWatcher(onChange,{spawner=spawn,platform=process.platform}={}){
  let child=null,last='',buffer='';
  return {
    start(){
      if(child||platform!=='win32')return;
      const processHandle=spawner('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-fullscreen.ps1'),'-SkipPid',String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','ignore']});
      child=processHandle;
      processHandle.stdout.on('data',chunk=>{
        if(child!==processHandle)return;
        buffer+=chunk.toString();if(buffer.length>8000)buffer='';let at;
        while((at=buffer.indexOf('\n'))>=0){
          const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);
          try{const value=JSON.parse(line);if(typeof value.fullscreen==='boolean'&&(!value.fullscreen||Number.isFinite(value.x)&&Number.isFinite(value.y))&&line!==last){last=line;onChange(value);}}catch{}
        }
      });
      const ended=()=>{if(child!==processHandle)return;child=null;last='';buffer='';onChange({fullscreen:false});};
      processHandle.on('error',ended);processHandle.on('exit',ended);
    },
    stop(){const old=child;child=null;old?.kill();last='';buffer='';}
  };
}
module.exports={createFullscreenWatcher};
