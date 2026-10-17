// Only voiced, bounded segments are sent to the main process's local Parakeet engine.
let stream,context,processor,source,frames=[],count=0,silent=0,voiced=0,busy=false,stopped=false,pre=[];
function stop(){stopped=true;processor?.disconnect();source?.disconnect();stream?.getTracks().forEach(t=>t.stop());context?.close().catch(()=>{});frames=pre=[];count=0;}
async function flush(){if(busy||!count)return;busy=true;const data=new Float32Array(count);let at=0;for(const frame of frames){data.set(frame,at);at+=frame.length;}frames=[];count=silent=voiced=0;try{await window.nook.wakeAudio({action:'audio',bytes:Array.from(window.NookAudio.encodeWav(data,16000))});}finally{busy=false;}}
window.nook.onWakeStart(async value=>{try{stream=await window.NookAudio.openMicrophone(navigator.mediaDevices,value.microphoneId);if(stopped){stop();return;}context=new AudioContext();await context.resume();source=context.createMediaStreamSource(stream);processor=context.createScriptProcessor(4096,1,1);processor.onaudioprocess=e=>{e.outputBuffer.getChannelData(0).fill(0);if(busy||stopped)return;const input=window.NookAudio.resample(e.inputBuffer.getChannelData(0),context.sampleRate),rms=Math.sqrt(input.reduce((sum,n)=>sum+n*n,0)/input.length),speech=rms>.012;
 if(!count&&!speech){pre.push(new Float32Array(input));if(pre.length>3)pre.shift();return;}
 if(!count){frames=pre;count=pre.reduce((n,f)=>n+f.length,0);pre=[];}
 frames.push(new Float32Array(input));count+=input.length;if(speech){voiced+=input.length;silent=0;}else silent+=input.length;
 if(count>=112000||silent>=12800){if(voiced>=2400)flush().catch(()=>{});else{frames=[];count=silent=voiced=0;}}
 };source.connect(processor);processor.connect(context.destination);await window.nook.wakeAudio({action:'ready'});
 }catch{stop();await window.nook.wakeAudio({action:'error'});}});
window.addEventListener('beforeunload',stop);
