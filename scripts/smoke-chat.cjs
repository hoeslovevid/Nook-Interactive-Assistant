// Disposable desktop profile, Chromium's synthetic microphone, and a local HTTP model.
// No real microphone, credentials, or paid API requests are used.
const {app, BrowserWindow, Notification, ipcMain} = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const output = path.resolve(__dirname, '..', 'dist', 'chat-qa');
const data = path.join(output, 'data-' + Date.now());
fs.mkdirSync(data, {recursive:true});
app.setName('Nook chat verification'); app.setPath('userData', data);
require('node:os').homedir = () => data;
app.commandLine.appendSwitch('use-fake-device-for-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
fs.writeFileSync(path.join(data, 'prefs.json'), JSON.stringify({muted:true}));
const relay = require('../lib/relay'), originalRelay = relay.createRelay;
relay.createRelay = (_pipe, options) => originalRelay('\\\\.\\pipe\\nook-chat-qa-' + process.pid, options);
const credentials = require('../lib/credential-store'), originalCredentials = credentials.createCredentialStore;
credentials.createCredentialStore = options => originalCredentials({...options, adapter:{read:async()=>({}),write:async()=>{},delete:async()=>{}}});
Notification.prototype.show = function() {};
let transcriptions = 0, requests = [], focusChanges = 0, failNext = false, nextFailure = null;
const native = require('../lib/native'), originalScript = native.runScript;
native.runScript = async (script, args, timeout) => {
  if (script !== 'windows-speech.ps1') return originalScript(script, args, timeout);
  if (args.includes('languages')) return {ok:true,languages:[{id:'en-US',name:'English'}]};
  const bytes = fs.readFileSync(args[args.indexOf('-WaveFile')+1]);
  assert.equal(bytes.toString('ascii',0,4), 'RIFF'); assert.ok(bytes.length > 8044);
  transcriptions++; return {ok:true,text:'Hello from dictation'};
};
const originalFocusable = BrowserWindow.prototype.setFocusable;
BrowserWindow.prototype.setFocusable = function(value) {focusChanges++; return originalFocusable.call(this,value);};
const realFetch = global.fetch;
global.fetch = (url, options) => String(url)==='https://api.openai.com/v1/chat/completions' ? realFetch(`http://127.0.0.1:${server.address().port}/v1/chat/completions`,options) : String(url).startsWith('http://127.0.0.1:') ? realFetch(url,options) : Promise.resolve(new Response('{}',{status:503}));
const errors = [];
app.on('web-contents-created', (_event, contents) => contents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message);}));
const server = http.createServer(async (req,res) => {
  let body=''; for await (const chunk of req) body+=chunk;
  if(req.url.endsWith('/models')) {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'test-model'}]}));return;}
  requests.push(JSON.parse(body));
  if(failNext){failNext=false;res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error":{"message":"Invalid test credentials"}}');return;}
  if(nextFailure){const failure=nextFailure;nextFailure=null;res.writeHead(429,{'Content-Type':'application/json',...(failure.wait?{'Retry-After':failure.wait}:{})});res.end(JSON.stringify({error:failure.error}));return;}
  res.writeHead(200, {'Content-Type':'text/event-stream'});
  res.end('data: {"choices":[{"delta":{"content":"Hello from the local model"}}]}\n\ndata: [DONE]\n\n');
});
const delay = ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until = async (run,code) => {const end=Date.now()+6000;while(Date.now()<end){if(await run(code))return;await delay(50);}throw new Error('UI condition timed out: '+code);};
const watchdog = setTimeout(()=>{fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({ok:false,error:'Timed out',errors}));app.exit(1);},60000);
server.listen(0,'127.0.0.1',()=>{
  fs.writeFileSync(path.join(data,'models.json'),JSON.stringify({ollama:'test-model',ollamaUrl:`http://127.0.0.1:${server.address().port}/v1/chat/completions`}));
  require('../main');
  app.whenReady().then(async()=>{
    const findings = {};
    try {
      await delay(2000);
      const notch=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('index.html'));
      const settings=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('settings.html'));
      const run=code=>notch.webContents.executeJavaScript(code);
      await settings.webContents.executeJavaScript('window.NookTour.finish()');
      settings.focus();
      await settings.webContents.executeJavaScript('window.nook.paletteCommand("provider:ollama")');
      await delay(700);
      const before=focusChanges;
      await run('paint();paint();paint()'); await delay(100);
      findings.focusChangesWhilePainting=focusChanges-before;
      findings.nativeFocus=notch.isFocused();
      assert.equal(findings.nativeFocus,true);
      for (const keyCode of 'Hello') {notch.webContents.sendInputEvent({type:'char',keyCode}); await delay(30);}
      findings.typed=await run('chatInput.value');
      assert.equal(findings.typed,'Hello');
      notch.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});
      notch.webContents.sendInputEvent({type:'char',keyCode:'\r'});
      notch.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});
      await delay(400);
      findings.afterEnter=await run('({sending,chatError,provider,focused:document.activeElement.id,messages:state.messages,input:chatInput.value})');
      await until(run,'!sending && state.messages.some(m=>m.status==="complete")');
      assert.equal(requests.at(-1).messages.at(-1).content,'Hello');
      assert.equal(await run('document.querySelector("#transcript").textContent.includes("Hello from the local model")'),true);
      failNext=true;
      await run('chatInput.value="Retry this";chatForm.requestSubmit()');
      await until(run,'!sending && Boolean(chatError)');
      assert.equal(await run('chatInput.value'),'Retry this');
      const count=await run('state.messages.length');
      await run('document.querySelector("#chat-retry").click()');
      await until(run,'!sending && !chatError');
      assert.equal(await run('state.messages.length'),count);
      assert.equal(await run('chatInput.value'),'');findings.errorRetry=true;
      // Exercise the OpenAI recovery UI through real transport against the local server.
      await run('window.nook.saveKey("chatgpt","fake-test-key")');
      await run('window.NookChatControls.selectProvider("chatgpt")');
      nextFailure={error:{code:'credit_balance_exhausted',type:'insufficient_quota',message:'Do not display this private provider text'}};
      await run('chatInput.value="Quota failure";chatForm.requestSubmit()');await until(run,'!sending && Boolean(chatError)');
      assert.equal(await run('document.querySelector("#chat-error-title").textContent'),'API quota needs attention');
      assert.equal(await run('document.querySelector("#chat-error-account").hidden'),false);
      assert.equal(await run('document.querySelector("#chat-error-account").textContent'),'Check API billing');
      assert.ok(await run('document.querySelector("#chat-error-copy").textContent.includes("prepaid API credits")'));
      await delay(200);assert.ok(await run('document.querySelector("#chat-error-account").getBoundingClientRect().bottom < innerHeight'));
      fs.writeFileSync(path.join(output,'api-quota.png'),(await notch.webContents.capturePage()).toPNG());
      nextFailure={error:{code:'slow_down',type:'rate_limit_error'},wait:'2'};
      await run('document.querySelector("#chat-retry").click()');await until(run,'!sending && chatFailure?.kind==="rate-limit"');
      const beforeCooldown=requests.length;
      assert.equal(await run('document.querySelector("#chat-retry").disabled'),true);
      const cooldown=await run('window.nook.sendChat("chatgpt","Too soon")');assert.equal(cooldown.ok,false);assert.equal(requests.length,beforeCooldown);
      await until(run,'!document.querySelector("#chat-retry").disabled');
      await run('document.querySelector("#chat-retry").click()');await until(run,'!sending && !chatError');
      findings.quotaGuidance=true;findings.rateLimitCooldown=true;
      await run('window.NookChatControls.selectProvider("ollama");paint()');
      const sentBefore=requests.length;
      await run(`chatInput.value='Keep this draft';document.querySelector('#chat-edit-panel').hidden=false;
        document.querySelector('#chat-edit-text').focus();document.querySelector('#chat-edit-text').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true}));`);
      await delay(100); assert.equal(requests.length,sentBefore);assert.equal(await run('chatInput.value'),'Keep this draft');
      await run('document.querySelector("#chat-edit-panel").hidden=true;chatInput.value="";chatInput.focus()');
      findings.editShortcut=true;
      await run('startVoice()');
      findings.voiceStatus=await run('document.querySelector("#feature-status").textContent');
      findings.recording=await run('recording'); assert.equal(findings.recording,true);
      await delay(1100); await run('stopVoice()');
      assert.equal(transcriptions,1); assert.equal(await run('chatInput.value'),'Hello from dictation');
      assert.equal(await run('voiceStream.getTracks().every(t=>t.readyState==="ended")'),true);
      findings.textTransport=true; findings.syntheticDictation=true;
      // A second request during permission startup must not create a second stream.
      await run(`window._realMic=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window._micCalls=0;
        navigator.mediaDevices.getUserMedia=async options=>{window._micCalls++;await new Promise(r=>setTimeout(r,150));return window._realMic(options);};
        Promise.all([startVoice(),startVoice()])`);
      assert.equal(await run('window._micCalls'),1); await run('stopVoice(true)');
      // Cancel while the browser is still opening the device; no late recording survives.
      await run('window._pendingVoice=startVoice();stopVoice(true);window._pendingVoice');
      assert.equal(await run('recording'),false);
      assert.equal(await run('voiceStream.getTracks().every(t=>t.readyState==="ended")'),true);
      // Permission errors are distinct from missing or disconnected devices.
      await run(`navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Blocked','NotAllowedError');};startVoice()`);
      assert.ok(await run('document.querySelector("#feature-status").textContent.includes("desktop apps")'));
      assert.equal(await run('document.querySelector("#voice-button").disabled'),false);
      // A failed audio context must release the stream before a subsequent retry.
      await run(`navigator.mediaDevices.getUserMedia=window._realMic;window._realAudio=window.AudioContext;
        window.AudioContext=class{constructor(){throw new Error('No output device');}};startVoice()`);
      assert.equal(await run('voiceStream.getTracks().every(t=>t.readyState==="ended")'),true);
      assert.ok(await run('document.querySelector("#feature-status").textContent.includes("audio processing")'));
      await run('window.AudioContext=window._realAudio;startVoice()');assert.equal(await run('recording'),true);await run('stopVoice(true)');
      findings.microphoneRaces=true; findings.permissionRecovery=true; findings.audioFailureCleanup=true;
      ipcMain.removeHandler('nook:speech-languages');ipcMain.handle('nook:speech-languages',()=>({ok:true,languages:[]}));
      await run('window._captureCalls=0;navigator.mediaDevices.getUserMedia=options=>{window._captureCalls++;return window._realMic(options);};startVoice()');
      assert.equal(await run('window._captureCalls'),0);
      assert.ok(await run('document.querySelector("#feature-status").textContent.includes("Windows dictation is not installed")'));
      assert.equal(await run('recording'),false);
      await delay(200);
      assert.equal(await run('document.querySelector("#feature-status").getBoundingClientRect().bottom < document.querySelector("#card-chat").getBoundingClientRect().bottom'),true);
      fs.writeFileSync(path.join(output,'notch-voice-setup.png'),(await notch.webContents.capturePage()).toPNG());
      ipcMain.removeHandler('nook:speech-languages');ipcMain.handle('nook:speech-languages',()=>({ok:true,languages:[{id:'en-US',name:'English'}]}));
      findings.dictationSetup=true;
      // App inputs also keep unsaved typing while state updates arrive.
      settings.show();settings.focus();await delay(100);
      await settings.webContents.executeJavaScript('showPage("keys");document.querySelector("[data-model=ollama]").closest("details").open=true;document.querySelector("[data-model=ollama]").focus()');
      const sr=code=>settings.webContents.executeJavaScript(code);
      await sr('document.querySelector("[data-model=ollama]").select()');
      for(const keyCode of 'unsaved')settings.webContents.sendInputEvent({type:'char',keyCode});
      findings.appInput=await sr('({focus:document.activeElement.id,hidden:document.querySelector("#page-keys").hidden,dialog:document.querySelector("dialog[open]")?.outerHTML.slice(0,100),rect:document.querySelector("[data-model=ollama]").getBoundingClientRect().toJSON(),value:document.querySelector("[data-model=ollama]").value})');
      await delay(100);await run('window.nook.everyday("save",{})');await delay(100);
      assert.equal(await sr('document.querySelector("[data-model=ollama]").value'),'unsaved');
      // The detached chat uses the same keyboard and microphone controls.
      await run('window.nook.everyday("chat-window",{provider:"ollama"})');await delay(600);
      const detached=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('detached=1'));
      const dr=code=>detached.webContents.executeJavaScript(code);
      await dr('chatInput.focus()');
      for(const keyCode of 'Expanded')detached.webContents.sendInputEvent({type:'char',keyCode});
      await delay(100);assert.equal(await dr('chatInput.value'),'Expanded');
      await dr('startVoice()');await delay(1000);await dr('stopVoice()');
      assert.equal(await dr('chatInput.value'),'Expanded Hello from dictation');
      await delay(150);
      fs.writeFileSync(path.join(output,'expanded-chat.png'),(await detached.webContents.capturePage()).toPNG());
      const fits=await dr('document.querySelector("#voice-device").getBoundingClientRect().bottom < innerHeight');assert.ok(fits);
      nextFailure={error:{code:'project_spend_limit_exceeded',type:'insufficient_quota'}};
      await dr('window.NookChatControls.selectProvider("chatgpt");chatInput.value="Project limit";chatForm.requestSubmit()');
      await until(dr,'!sending && chatFailure?.kind==="quota"');
      assert.equal(await dr('document.querySelector("#chat-error-account").textContent'),'Check project settings');
      findings.expandedQuotaGuidance=true;
      findings.appTyping=true; findings.expandedVoice=true;
      assert.equal(findings.focusChangesWhilePainting,0);
      assert.deepEqual(errors,[]);
      fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({ok:true,findings,errors},null,2));
    } catch(error) {fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({ok:false,error:error.stack,findings,errors},null,2));}
    finally {clearTimeout(watchdog); server.close(); app.exit(JSON.parse(fs.readFileSync(path.join(output,'result.json'))).ok?0:1);}
  });
});
