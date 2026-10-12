(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NookAudio = api;
})(typeof window === "undefined" ? globalThis : window, () => {
  function encodeWav(samples, sampleRate) {
    if (
      !Number.isFinite(sampleRate) ||
      sampleRate < 8000 ||
      sampleRate > 192000
    )
      throw new Error("Invalid sample rate.");
    const buffer = new ArrayBuffer(44 + samples.length * 2),
      view = new DataView(buffer);
    const text = (at, value) =>
      [...value].forEach((letter, i) =>
        view.setUint8(at + i, letter.charCodeAt(0)),
      );
    text(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, samples.length * 2, true);
    samples.forEach((sample, i) => {
      const value = Math.max(-1, Math.min(1, sample));
      view.setInt16(
        44 + i * 2,
        value < 0 ? value * 32768 : value * 32767,
        true,
      );
    });
    return new Uint8Array(buffer);
  }
  async function openMicrophone(devices, deviceId = '') {
    if (!devices?.getUserMedia) throw Object.assign(new Error('Microphone capture is unavailable.'), {name:'NotSupportedError'});
    const selected = deviceId ? {deviceId:{exact:deviceId}} : {};
    try {
      return await devices.getUserMedia({audio:{...selected,echoCancellation:true,noiseSuppression:true},video:false});
    } catch(error) {
      // Some Windows drivers cannot initialize Chromium's audio processing.
      // Keep the selected device, but retry with unprocessed input.
      if (!['NotReadableError','OverconstrainedError','AbortError'].includes(error.name)) throw error;
      return devices.getUserMedia({audio:deviceId?selected:true,video:false});
    }
  }
  function microphoneError(error, processing = false) {
    if (processing) return 'Could not start audio processing. Check your Windows input and output devices, then retry.';
    if (['NotAllowedError','PermissionDeniedError','SecurityError'].includes(error?.name)) return 'Microphone access is blocked. In Windows Settings → Privacy & security → Microphone, enable microphone access and access for desktop apps, then retry.';
    if (['NotFoundError','DevicesNotFoundError','OverconstrainedError'].includes(error?.name)) return 'The selected microphone is unavailable. Connect it or choose another microphone, then retry.';
    if (['NotReadableError','TrackStartError','AbortError'].includes(error?.name)) return 'Windows could not start the microphone. Check the selected input device and close apps using it exclusively, then retry.';
    return 'Microphone capture is unavailable. Check your Windows input device, then retry.';
  }
  return { encodeWav, openMicrophone, microphoneError };
});
