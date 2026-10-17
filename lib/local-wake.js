const path=require('node:path');
function wakeCommand(text,phrase='hey nook'){
 const words=String(phrase).normalize('NFKC').match(/[\p{L}\p{N}]+/gu);if(!words?.length)return null;
 const pattern=words.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[\\p{P}\\s]+');
 const value=String(text).normalize('NFKC'),match=value.match(new RegExp('^\\s*'+pattern+'(?=$|[^\\p{L}\\p{N}])[\\p{P}\\s]*','iu'));
 return match?value.slice(match[0].length).trim():null;
}
function createLocalWake({BrowserWindow,ipcMain,getSettings,getSpeech,ready,transcribe,onChange=()=>{},onWake=()=>{},onText=()=>{}}){
 let win=null,version=0,phase='off',error='',controller=null,busy=false,commandUntil=0,commandTimer=null;
 const update=(next,message='')=>{phase=next;error=message;onChange();};
 function stop(){version++;clearTimeout(commandTimer);commandUntil=0;controller?.abort();controller=null;busy=false;const old=win;win=null;old?.destroy();if(phase!=='off')update('off');}
 ipcMain.handle('nook:wake-audio',async(event,value={})=>{if(event.sender!==win?.webContents)return {ok:false,error:'Wake capture is unavailable.'};const own=version;
  if(value.action==='error'){stop();update('error','Local wake microphone could not start. Check Voice setup and retry.');return {ok:false};}
  if(value.action==='ready'){update('armed');return {ok:true};}
  if(value.action!=='audio'||busy)return {ok:false};
  const bytes=Buffer.from(value.bytes||[]);if(bytes.length<46||bytes.length>300000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.readUInt32LE(24)!==16000)return {ok:false,error:'Invalid wake audio.'};
  busy=true;controller=new AbortController();update('processing');
  try{const result=await transcribe(bytes,controller.signal);if(own!==version)return {ok:false};if(!result.ok)throw new Error('Local speech could not complete.');const matched=wakeCommand(result.text,getSettings().wakePhrase),command=commandUntil>Date.now()&&matched===null?String(result.text||'').trim():matched;clearTimeout(commandTimer);commandUntil=0;update('armed');if(command!==null){if(command)onText(command,{followUp:false});else{commandUntil=Date.now()+20000;update('listening');commandTimer=setTimeout(()=>{if(own===version){commandUntil=0;update('armed');}},20000);onWake({local:true});}}return {ok:true};}
  catch(e){if(own===version){stop();update('error','Local wake recognition stopped. Check the downloaded Parakeet model and retry.');}return {ok:false};}
  finally{if(own===version){busy=false;controller=null;}}
 });
 return {stop,snapshot:()=>({phase,error,engine:'parakeet'}),async start(){stop();if(!ready()){update('error','Download Parakeet in Voice before enabling local wake listening.');return;}const own=version;update('starting');win=new BrowserWindow({show:false,width:1,height:1,skipTaskbar:true,webPreferences:{preload:path.join(__dirname,'../preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});const target=win;target.webContents.setWindowOpenHandler(()=>({action:'deny'}));target.webContents.on('will-navigate',e=>e.preventDefault());target.on('closed',()=>{if(win===target){win=null;update('off');}});try{await target.loadFile(path.join(__dirname,'../wake-capture.html'));if(own!==version)return;target.webContents.send('nook:wake-start',{microphoneId:getSpeech().microphoneId});}catch{if(own===version){stop();update('error','Could not start the local wake microphone.');}}}};
}
module.exports={wakeCommand,createLocalWake};
