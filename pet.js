const seed = document.querySelector(".seed");
let originX = 0;
let originY = 0;
let startX = 0;
let startY = 0;

seed.addEventListener("pointerdown", (event) => {
  originX = event.screenX;
  originY = event.screenY;
  startX = window.screenX;
  startY = window.screenY;
  seed.setPointerCapture(event.pointerId);
});

seed.addEventListener("pointermove", (event) => {
  if (!seed.hasPointerCapture(event.pointerId)) {
    return;
  }
  window.nook.movePet(startX + event.screenX - originX, startY + event.screenY - originY);
});


let latestState = {};
let sleeping = false;
let seenCelebrate = 0;
let celebrationUntil = 0;
function updateMood() {
  seed.dataset.mood = window.NookMotion.companionMood({
    pending: Boolean(latestState.pending),
    celebrating: Date.now() < celebrationUntil,
    working: (latestState.sessions || []).some(session => !session.finished),
    sleeping,
  });
}
window.nook.onPet(mode => {
  sleeping = mode === "asleep";
  document.body.classList.toggle("is-asleep", sleeping);
  updateMood();
});
window.nook.onState(state => {
  latestState = state;
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
