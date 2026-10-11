const {execFile}=require('node:child_process'),path=require('node:path');
function speechText(value){return String(value||'').replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g,' Code block omitted. ').replace(/https?:\/\/\S+/g,' link ').replace(/[#*_>`]/g,'').replace(/\s+/g,' ').trim().slice(0,4000);}
function createSpeechOutput({run=execFile,onChange=()=>{}}={}) {
  let child=null,sequence=0,phase='idle';
  function stop(){sequence++;child?.kill();child=null;phase='idle';onChange();return {ok:true};}
  function invoke(action,value={}) {
    const data=Buffer.from(JSON.stringify(value)).toString('base64');
    return new Promise(resolve=>{const process=run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-voice-output.ps1'),'-Action',action,'-Payload',data],{windowsHide:true,timeout:90000,maxBuffer:200000},(error,stdout)=>{if(error)return resolve({ok:false,error:'Windows speech output is unavailable.'});try{resolve(JSON.parse(String(stdout).replace(/^\uFEFF/,'')));}catch{resolve({ok:false,error:'Windows could not load a speech voice.'});}});if(action==='speak')child=process;});
  }
  return {stop,snapshot:()=>({phase}),voices:()=>invoke('voices'),async speak(value){const text=speechText(value.text);if(!text)return {ok:false,error:'There is no text to read.'};stop();const token=sequence;phase='speaking';onChange();const result=await invoke('speak',{text,voice:String(value.voice||'').slice(0,120),rate:Math.max(-3,Math.min(3,Number(value.rate)||0))});if(token===sequence){child=null;phase='idle';onChange();}return result;}};
}
module.exports={speechText,createSpeechOutput};
