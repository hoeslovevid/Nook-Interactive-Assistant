const seed = document.querySelector(".seed");
let originX = 0;
let originY = 0;
let startX = 0;
let startY = 0;
let moved = false;
seed.title =
  "Drag onto a window for context · Right-click for shortcuts · Double-click to go home";

seed.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  moved = false;
  originX = event.screenX;
  originY = event.screenY;
  startX = window.screenX;
  startY = window.screenY;
  if (event.isTrusted) seed.setPointerCapture(event.pointerId);
});

seed.addEventListener("pointermove", (event) => {
  if (!seed.hasPointerCapture(event.pointerId)) {
    return;
  }
  moved ||= Math.hypot(event.screenX - originX, event.screenY - originY) > 8;
  window.nook.movePet(
    startX + event.screenX - originX,
    startY + event.screenY - originY,
  );
});
seed.addEventListener("pointerup", async (event) => {
  if (!seed.hasPointerCapture(event.pointerId)) return;
  seed.releasePointerCapture(event.pointerId);
  if (!moved) return;
  try {
    const result = await window.nook.dropPet(event.screenX, event.screenY);
    window.NookSeed.react(seed, result.ok ? "happy" : "curious");
    seed.title = result.image
      ? "Window attached. Review it in chat before sending."
      : "Drag onto a window for context · Right-click for shortcuts";
  } catch (_) {
    seed.title = "Could not capture this window. Use Window context in chat.";
  }
});
seed.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  window.nook.petMenu();
});
seed.addEventListener("dblclick", () => {
  if (!moved) window.nook.petHome();
});

let latestState = {};
let sleeping = false;
let seenCelebrate = 0;
let celebrationUntil = 0;
function updateMood() {
  window.NookCompanion.agentColor(seed, latestState);
  seed.dataset.mood =
    latestState.demoMood ||
    window.NookMotion.companionMood({
      task: (latestState.sessions || []).find((session) => !session.finished)
        ?.task,
      dancing: Boolean(latestState.features?.music?.playing),
      thinking: Boolean(latestState.chatBusy),
      pending: Boolean(latestState.pending),
      celebrating: Date.now() < celebrationUntil,
      working: (latestState.sessions || []).some(
        (session) => !session.finished,
      ),
      sleeping,
    });
}
window.nook.onPet((mode) => {
  document.body.classList.toggle('is-travelling', mode === 'travel');
  sleeping = mode === "asleep";
  document.body.classList.toggle("is-asleep", sleeping);
  updateMood();
});
window.nook.onState((state) => {
  latestState = state;
  window.NookCompanion.apply(seed, state.features?.companion, state.features?.previewOutfit);
  if (state.celebrate && seenCelebrate !== state.celebrate) {
    seenCelebrate = state.celebrate;
    celebrationUntil = Date.now() + 1200;
    window.setTimeout(updateMood, 1250);
  }
  updateMood();
});
seed.addEventListener("click", () => {
  seed.classList.add("is-squish");
  window.setTimeout(() => seed.classList.remove("is-squish"), 450);
});
