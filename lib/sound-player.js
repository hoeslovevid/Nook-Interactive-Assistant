(() => {
  let context;
  const active = new Set();
  let latest = null, lastTone = 0, generation = 0;
  function stop() {
    generation++;
    for (const item of active) item.stop();
    active.clear();
  }
  async function play(kind, settings, preview = false) {
    if (preview) stop();
    const requested = generation;
    if (!preview && settings?.enabled?.[kind] === false) return;
    const volume = Math.max(0, Math.min(1, (settings?.volume ?? 60) / 100));
    if (!volume || active.size >= 4) return;
    if (!preview && performance.now() - lastTone < 150) return;
    lastTone = performance.now();
    const custom = await window.nook.readSound(kind);
    if (requested !== generation) return;
    if (custom) {
      const audio = new Audio(custom); audio.volume = volume;
      let timeout;
      const item = { stop() { audio.pause(); release(); } };
      const release = () => { clearTimeout(timeout); active.delete(item); };
      active.add(item); audio.onended = audio.onerror = release;
      timeout = setTimeout(() => item.stop(), 15000);
      audio.play().catch(release); return;
    }
    const Context = window.AudioContext || window.webkitAudioContext; if (!Context) return;
    context ||= new Context(); await context.resume();
    if (requested !== generation) return;
    const melodies = { hi: [440, 554], ask: [660, 880], finish: [523, 659, 784], error: [330, 262], interaction: [784, 988] };
    const notes = melodies[kind] || melodies.ask, now = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator(), gain = context.createGain(), start = now + index * .08;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001, .0667 * volume), start + .02); gain.gain.exponentialRampToValueAtTime(.0001, start + .16);
      oscillator.connect(gain).connect(context.destination); oscillator.start(start); oscillator.stop(start + .18);
      const item = { stop() { try { oscillator.stop(); } catch {} } }; active.add(item);
      oscillator.onended = () => { active.delete(item); oscillator.disconnect(); gain.disconnect(); };
    });
  }
  window.NookSoundPlayer = { play, stop };
  window.nook.onState(state => { if (state.prefs?.muted && !latest?.prefs?.muted) stop(); latest = state; });
  window.addEventListener('pagehide', stop);
  window.addEventListener('nook-pet-interaction', () => {
    if (!latest?.prefs?.muted && !window.NookAlerts?.isQuiet(latest?.workspace?.settings)) play('interaction', latest?.sounds).catch(() => {});
  });
})();
