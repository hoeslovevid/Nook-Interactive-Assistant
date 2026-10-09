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

window.nook.onPet((mode) => {
  document.body.classList.toggle("is-asleep", mode === "asleep");
});
