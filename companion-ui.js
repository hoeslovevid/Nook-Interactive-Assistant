const featureNode = (id) => document.getElementById(id);
function featureMessage(text) {
  featureNode("feature-status").textContent = text;
  featureNode("feature-status").hidden = !text;
}
let musicState = {},
  recording = false,
  voiceContext = null,
  voiceStream = null,
  voiceSource = null,
  voiceProcessor = null,
  voiceAnalyser = null,
  voiceFrames = [],
  voiceTimeout = 0,
  voiceAnimation = 0,
  voiceTranscribing = false,
  voiceStarting = false,
  voiceGeneration = 0;
const microphoneSelect = featureNode('voice-device');
let microphoneId = '',voiceSpeechConfig=null;
try { microphoneId = localStorage.getItem('nook-microphone') || ''; } catch {}
function microphoneOptions(devices) {
  microphoneSelect.replaceChildren(new Option('Windows default', ''));
  for (const device of devices.filter(d => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default')) {
    microphoneSelect.append(new Option(device.label || 'Microphone ' + microphoneSelect.options.length, device.deviceId));
  }
  if (microphoneId && !devices.some(d => d.deviceId === microphoneId)) microphoneSelect.append(new Option('Saved microphone · unavailable', microphoneId));
  microphoneSelect.value = microphoneId;
}
async function refreshMicrophones() {
  try { microphoneOptions(await navigator.mediaDevices.enumerateDevices()); }
  catch { featureMessage('Could not list microphones. Check Windows microphone permissions, then retry.'); }
}
microphoneSelect.addEventListener('change', async () => {
  const selected=microphoneSelect.value,result=await window.nook.flow('save',{microphoneId:selected});
  if(!result.ok){microphoneSelect.value=microphoneId;featureMessage(result.error);return;}
  microphoneId=selected;try{localStorage.setItem('nook-microphone',microphoneId);}catch{}
});
featureNode('voice-devices-refresh').addEventListener('click', refreshMicrophones);
featureNode('voice-configure').addEventListener('click', () => window.nook.openApp('companion'));
navigator.mediaDevices?.addEventListener('devicechange', refreshMicrophones);
refreshMicrophones();
function paintMusic(next) {
  musicState = next || {};
  featureNode("music-card").hidden = !musicState.available;
  if (!musicState.available) return;
  featureNode("music-title").textContent = musicState.title || "Now playing";
  featureNode("music-artist").textContent =
    musicState.artist || musicState.app || "";
  const art = featureNode("music-art");
  art.hidden = !musicState.artwork;
  if (musicState.artwork) art.src = musicState.artwork;
  featureNode("music-toggle").textContent = musicState.playing
    ? "Pause"
    : "Play";
  for (const [id, cap] of [
    ["music-toggle", "canToggle"],
    ["music-next", "canNext"],
    ["music-previous", "canPrevious"],
    ["music-shuffle", "canShuffle"],
    ["music-repeat", "canRepeat"],
  ])
    featureNode(id).disabled = !musicState[cap];
  featureNode("music-shuffle").setAttribute(
    "aria-pressed",
    String(Boolean(musicState.shuffle)),
  );
  featureNode("music-repeat").textContent =
    musicState.repeat === "Track"
      ? "Repeat one"
      : musicState.repeat === "List"
        ? "Repeat all"
        : "Repeat";
  const slider = featureNode("music-position");
  slider.disabled = !musicState.canSeek;
  slider.max = String(Math.max(1, musicState.duration || 1));
  if (document.activeElement !== slider)
    slider.value = String(musicState.position || 0);
}
async function mediaAction(action, position) {
  try {
    const result = await window.nook.media(action, position);
    if (!result.ok || result.changed === false)
      featureNode("media-note").textContent =
        result.error || "This player does not support that control.";
    else {
      featureNode("media-note").textContent = "";
      paintMusic(result);
      renderShell();
    }
  } catch (_) {
    featureNode("media-note").textContent =
      "Could not reach your music player.";
  }
}
for (const [id, action] of [
  ["music-toggle", "toggle"],
  ["music-next", "next"],
  ["music-previous", "previous"],
  ["music-shuffle", "shuffle"],
  ["music-repeat", "repeat"],
])
  featureNode(id).addEventListener("click", () => mediaAction(action));
featureNode("music-position").addEventListener("change", (event) =>
  mediaAction("seek", Number(event.target.value)),
);
function previewAttachment(attached) {
  const preview = featureNode("screenshot-preview");
  preview.hidden = !attached?.image;
  if (attached?.image) featureNode("screenshot-image").src = attached.image;
  else featureNode("screenshot-image").removeAttribute("src");
}
window.nook.onState((next) => {
  window.NookCompanion.apply(seed, next.features?.companion, next.features?.previewOutfit);
  paintMusic(next.features?.music);
  previewAttachment(next.attachment);
});
featureNode("remove-screenshot").addEventListener("click", () =>
  window.nook.clearFile(),
);
featureNode("window-cancel").addEventListener("click", () => {
  featureNode("window-picker").hidden = true;
  renderShell();
});
featureNode("window-button").addEventListener("click", async () => {
  const button = featureNode("window-button");
  button.disabled = true;
  featureNode("window-picker").hidden = false;
  featureNode("window-sources").textContent = "Finding your windows…";
  renderShell();
  try {
    const result = await window.nook.windows();
    if (!result.ok) throw new Error(result.error);
    const sources = result.sources || [];
    featureNode("window-sources").replaceChildren();
    if (!sources.length)
      featureNode("window-sources").textContent =
        "No windows found. Open or restore a window and try again.";
    for (const source of sources) {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "window-choice";
      const image = document.createElement("img");
      image.src = source.preview;
      image.alt = "";
      const title = document.createElement("span");
      title.textContent = source.name;
      choice.append(image, title);
      choice.addEventListener("click", async () => {
        choice.disabled = true;
        try {
          const capture = await window.nook.captureWindow(source.id);
          if (!capture.ok) throw new Error(capture.error);
          featureNode("window-picker").hidden = true;
          if(capture.preview){await window.NookContextReview.open(capture.id);return;}
          previewAttachment(capture);
          featureMessage(
            "Screenshot attached. Review it, then send your question.",
          );
        } catch (error) {
          featureMessage(error.message);
        } finally {
          choice.disabled = false;
          renderShell();
        }
      });
      featureNode("window-sources").append(choice);
    }
  } catch (error) {
    featureNode("window-sources").textContent = error.message;
  } finally {
    button.disabled = false;
    renderShell();
  }
});
function waveform() {
  if (!recording || !voiceAnalyser) return;
  const samples = new Uint8Array(voiceAnalyser.frequencyBinCount);
  voiceAnalyser.getByteTimeDomainData(samples);
  const level = Math.min(
    1,
    samples.reduce((sum, value) => sum + Math.abs(value - 128), 0) /
      samples.length /
      24,
  );
  for (const [i, bar] of Array.from(
    featureNode("voice-wave").children,
  ).entries())
    bar.style.height = 4 + level * (8 + (i % 3) * 4) + "px";
  voiceAnimation = requestAnimationFrame(waveform);
}
async function stopVoice(cancel = false) {
  if (voiceStarting && !recording) { voiceGeneration++; return; }
  if (!recording) return;
  recording = false;
  voiceTranscribing = true;
  featureNode('voice-button').disabled = true;
  clearTimeout(voiceTimeout);
  cancelAnimationFrame(voiceAnimation);
  const rate = voiceContext.sampleRate;
  const context = voiceContext, frames = voiceFrames;
  voiceFrames = [];
  releaseVoiceResources();
  voiceContext = null;
  seed._nookReaction = null;
  document.body.classList.remove('is-recording');
  featureNode("voice-wave").hidden = true;
  featureNode("voice-button").textContent = "◉ Dictate";
  featureNode("voice-button").setAttribute("aria-label", "Start dictation");
  try {
    await context.close().catch(() => {});
    if (cancel) return;
    const count = frames.reduce((sum, frame) => sum + frame.length, 0), samples = new Float32Array(count);
    let offset = 0;
    for (const frame of frames) { samples.set(frame, offset); offset += frame.length; }
    if (count < rate * 0.25) { featureMessage("Recording too short. Try again."); return; }
    featureMessage("Transcribing…");
    const result = await window.nook.transcribe(
      window.NookAudio.encodeWav(state?.features?.companion?.voice === "offline" ? window.NookAudio.resample(samples, rate) : samples, state?.features?.companion?.voice === "offline" ? 16000 : rate),voiceSpeechConfig,
    );
    if (!result.ok) throw new Error(result.error);
    if (result.text) {
      if(window.NookEverydayUI?.voiceMode()) {await window.NookEverydayUI.reviewVoice(result.text);return;}
      chatInput.value = (chatInput.value + " " + result.text)
        .trim()
        .slice(0, 2000);
      featureMessage("Review your dictated message before sending.");
      chatInput.focus();
    } else featureMessage("No speech recognized. Try speaking more clearly.");
  } catch (error) {
    featureMessage(error.message);
  } finally {
    voiceTranscribing = false;
    featureNode("voice-button").disabled = false;
    microphoneSelect.disabled = false;
    renderShell();
  }
}
function releaseVoiceResources() {
  if (voiceProcessor) {voiceProcessor.onaudioprocess = null;try {voiceProcessor.disconnect();} catch {}}
  try {voiceSource?.disconnect(); voiceAnalyser?.disconnect();} catch {}
  voiceStream?.getTracks().forEach(track => {track.onended = null; track.stop();});
  voiceProcessor = voiceSource = voiceAnalyser = null;
}
async function startVoice() {
  if (voiceTranscribing || voiceStarting || recording) return;
  voiceStarting = true;
  const generation = ++voiceGeneration;
  let processing = false;
  const button = featureNode("voice-button");
  button.disabled = true;
  microphoneSelect.disabled = true;
  featureMessage('Starting microphone…');
  window.nook.focusWindow();
  try {
    // Speech setup is independent of microphone hardware. Diagnose it before recording.
    const companion = state?.features?.companion || {};voiceSpeechConfig={engine:state?.flow?.settings.engine,language:state?.flow?.settings.language,microphoneId:state?.flow?.settings.microphoneId};
    if (companion.voice === 'windows') {
      const speech = await window.nook.speechLanguages();
      if (!speech.ok || !speech.languages?.length) throw Object.assign(new Error(speech.error || 'Windows dictation is not installed. Add a Windows speech language, or choose OpenAI dictation in Companion & devices.'), {name:'SpeechSetupError'});
      if (companion.voiceLanguage && companion.voiceLanguage !== 'auto' && !speech.languages.some(language => language.id === companion.voiceLanguage)) throw Object.assign(new Error('Your dictation language is not installed. Choose an installed language or Automatic in Companion & devices.'), {name:'SpeechSetupError'});
    } else if (companion.voice==='openai'&&!state?.keys?.chatgpt) throw Object.assign(new Error('OpenAI dictation needs an OpenAI API key. Save it in Models & connections, or choose Windows dictation in Companion & devices.'), {name:'SpeechSetupError'});
    if (generation !== voiceGeneration) return;
    voiceStream = await window.NookAudio.openMicrophone(navigator.mediaDevices, microphoneId);
    if (generation !== voiceGeneration) {releaseVoiceResources();return;}
    processing = true;
    voiceContext = new AudioContext({sampleRate:16000});
    await voiceContext.resume();
    if (generation !== voiceGeneration) {releaseVoiceResources();await voiceContext.close().catch(()=>{});voiceContext=null;return;}
    voiceSource = voiceContext.createMediaStreamSource(voiceStream);
    voiceProcessor = voiceContext.createScriptProcessor(4096, 1, 1);
    voiceAnalyser = voiceContext.createAnalyser();
    voiceAnalyser.fftSize = 256;
    voiceSource.connect(voiceAnalyser);
    voiceSource.connect(voiceProcessor);
    const mute = voiceContext.createGain();
    mute.gain.value = 0;
    voiceProcessor.connect(mute);
    mute.connect(voiceContext.destination);
    voiceFrames = [];
    voiceProcessor.onaudioprocess = (event) => {
      if (recording)
        voiceFrames.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    recording = true;
    document.body.classList.add('is-recording');
    for (const track of voiceStream.getAudioTracks()) track.onended = async () => {await stopVoice(true);featureMessage('The microphone disconnected. Choose a connected input and retry.');};
    button.textContent = "■ Stop";
    button.setAttribute("aria-label", "Stop dictation");
    featureNode("voice-wave").hidden = false;
    window.NookSeed.react(seed, "listening", Infinity);
    featureMessage(
      state?.features?.companion?.voice === "openai"
        ? "Listening · Stop sends this recording to OpenAI for transcription."
        : "Listening on this PC · stops after 45 seconds.",
    );
    voiceTimeout = setTimeout(() => stopVoice(), 45000);
    waveform();
    renderShell();
    refreshMicrophones();
  } catch (error) {
    releaseVoiceResources();
    if (voiceContext) await voiceContext.close().catch(() => {});
    voiceContext = null;
    recording = false;
    clearTimeout(voiceTimeout); cancelAnimationFrame(voiceAnimation);
    seed._nookReaction = null;
    document.body.classList.remove('is-recording');
    featureNode('voice-wave').hidden = true;
    button.textContent = '◉ Dictate'; button.setAttribute('aria-label','Start dictation');
    featureMessage(error.name === 'SpeechSetupError' ? error.message : window.NookAudio.microphoneError(error, processing));
  } finally {
    voiceStarting = false;
    button.disabled = false;
    microphoneSelect.disabled = recording || voiceTranscribing;
    renderShell();
  }
}
featureNode('voice-button').addEventListener('click',()=>recording?stopVoice():startVoice());
let talkHolding=false;
const talk=featureNode('voice-talk');
async function holdTalk(event){event.preventDefault();if(voiceTranscribing||voiceStarting||recording||talkHolding)return;talkHolding=true;talk.setAttribute('aria-pressed','true');window.nook.speechOutput('stop').catch(()=>{});if(event.pointerId!=null)talk.setPointerCapture(event.pointerId);await startVoice();if(!talkHolding&&recording)await stopVoice(true);}
function releaseTalk(cancel=false){talkHolding=false;talk.setAttribute('aria-pressed','false');if(recording)stopVoice(cancel);}
talk.addEventListener('pointerdown',event=>{if(event.button===0)holdTalk(event);});talk.addEventListener('pointerup',()=>releaseTalk());talk.addEventListener('pointercancel',()=>releaseTalk(true));
talk.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)&&!event.repeat)holdTalk(event);});talk.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();releaseTalk();}});talk.addEventListener('blur',()=>{if(talkHolding)releaseTalk(true);});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && (recording || voiceStarting)) {
    stopVoice(true);
    featureMessage("Dictation canceled.");
  }
});
window.addEventListener("beforeunload", () => {
  voiceGeneration++;
  releaseVoiceResources();
});

window.nook.onState(next=>{if(next.flow?.current&&['starting','recording','transcribing'].includes(next.flow.current.phase)&&(recording||voiceStarting))stopVoice(true);});

window.nook.onState(next=>{const selected=next.flow?.settings.microphoneId;if(typeof selected==='string'&&!recording){microphoneId=selected;if(document.activeElement!==microphoneSelect&&[...microphoneSelect.options].some(o=>o.value===selected))microphoneSelect.value=selected;}});
