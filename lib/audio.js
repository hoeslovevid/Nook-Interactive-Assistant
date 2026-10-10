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
  return { encodeWav };
});
