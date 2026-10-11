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
  voiceTranscribing = false;
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
  if (!recording) return;
  recording = false;
  clearTimeout(voiceTimeout);
  cancelAnimationFrame(voiceAnimation);
  const rate = voiceContext.sampleRate;
  voiceProcessor.onaudioprocess = null;
  voiceProcessor.disconnect();
  voiceSource.disconnect();
  voiceStream.getTracks().forEach((track) => track.stop());
  await voiceContext.close();
  voiceContext = null;
  seed._nookReaction = null;
  featureNode("voice-wave").hidden = true;
  featureNode("voice-button").textContent = "◉ Dictate";
  featureNode("voice-button").setAttribute("aria-label", "Start dictation");
  if (cancel) {
    voiceFrames = [];
    return;
  }
  const count = voiceFrames.reduce((sum, frame) => sum + frame.length, 0),
    samples = new Float32Array(count);
  let offset = 0;
  for (const frame of voiceFrames) {
    samples.set(frame, offset);
    offset += frame.length;
  }
  voiceFrames = [];
  if (count < rate * 0.25) {
    featureMessage("Recording too short. Try again.");
    return;
  }
  voiceTranscribing = true;
  featureNode("voice-button").disabled = true;
  featureMessage("Transcribing…");
  try {
    const result = await window.nook.transcribe(
      window.NookAudio.encodeWav(samples, rate),
    );
    if (!result.ok) throw new Error(result.error);
    if (result.text) {
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
    renderShell();
  }
}
featureNode("voice-button").addEventListener("click", async () => {
  if (voiceTranscribing) return;
  if (recording) {
    await stopVoice();
    return;
  }
  const button = featureNode("voice-button");
  button.disabled = true;
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    voiceContext = new AudioContext();
    await voiceContext.resume();
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
  } catch (_) {
    voiceStream?.getTracks().forEach((track) => track.stop());
    if (voiceContext) voiceContext.close().catch(() => {});
    featureMessage(
      "Microphone unavailable. Check Windows microphone permissions.",
    );
  } finally {
    button.disabled = false;
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && recording) {
    stopVoice(true);
    featureMessage("Dictation canceled.");
  }
});
window.addEventListener("beforeunload", () => {
  voiceStream?.getTracks().forEach((track) => track.stop());
});
