(() => {
  const steps = [
    [
      "Welcome to Nook",
      "A small companion for your workspace. Try a guided, offline walkthrough before connecting anything.",
      "idle",
    ],
    [
      "See the work unfold",
      "Watch the pet read, edit, and run tasks. The sample sessions in the notch have a diff you can inspect.",
      "coding",
    ],
    [
      "Approve with confidence",
      "Try the sample Allow or Deny buttons in the notch. This request cannot run a command.",
      "expectant",
    ],
    [
      "Answer without switching apps",
      "Pick an answer to the sample question. Real requests stay visible until you respond.",
      "expectant",
    ],
    [
      "Chat with your preferred model",
      "The notch shows a sample conversation. Try a message: the walkthrough replies locally without using an API.",
      "thinking",
    ],
    [
      "Keep your workspace nearby",
      "Sample GitHub and deployment status sit next to music controls. Connect only the services you use.",
      "dancing",
    ],
    [
      "Make it yours",
      "Right-click the pet for its wardrobe and shortcuts. Drag it onto a window to review a screenshot in chat. Your phone can follow sessions on the same Wi-Fi.",
      "happy",
    ],
  ];
  const dialog = document.createElement("dialog");
  dialog.className = "tour-dialog";
  dialog.setAttribute("aria-labelledby", "tour-title");
  dialog.innerHTML =
    '<div class="tour-hero"><canvas class="seed outfit-preview" width="192" height="192" aria-hidden="true"></canvas><span class="eyebrow">YOUR WORKSPACE COMPANION</span></div><p id="tour-progress" class="note"></p><h2 id="tour-title"></h2><p id="tour-copy"></p><div class="tour-dots" aria-hidden="true"></div><div class="settings-actions"><button type="button" id="tour-back" class="ghost">Back</button><button type="button" id="tour-next" class="solid">Try walkthrough</button><button type="button" id="tour-close" class="ghost">Skip for now</button></div><div id="tour-connect" class="settings-actions" hidden><button type="button" class="ghost" data-connect="keys">Connect a model</button><button type="button" class="ghost" data-connect="agents">Connect an agent</button></div>';
  document.body.append(dialog);
  window.NookSeed.bind(dialog.querySelector("canvas"));
  const find = (id) => dialog.querySelector("#" + id);
  let index = 0,
    playing = false,
    seen = false,
    opener;
  function paint() {
    const [title, copy, mood] = steps[index];
    find("tour-title").textContent = title;
    find("tour-copy").textContent = copy;
    find("tour-progress").textContent =
      `Step ${index + 1} of ${steps.length} · ${playing ? "Sample data · no account needed" : "Get comfortable first"}`;
    dialog.querySelector("canvas").dataset.mood = mood;
    find("tour-back").disabled = index === 0;
    find("tour-next").textContent =
      index === steps.length - 1
        ? "Finish"
        : playing
          ? "Next"
          : "Try walkthrough";
    find("tour-close").textContent = playing
      ? "End walkthrough"
      : "Skip for now";
    find("tour-connect").hidden = index !== steps.length - 1;
    dialog.querySelector(".tour-dots").replaceChildren(
      ...steps.map((_, i) => {
        const dot = document.createElement("span");
        dot.classList.toggle("is-current", i === index);
        return dot;
      }),
    );
  }
  async function finish() {
    if (playing) await window.nook.setDemo(false);
    playing = false;
    await window.nook.saveCompanion({ onboardingDone: true });
    dialog.close();
    opener?.focus();
  }
  async function start() {
    opener = document.activeElement;
    index = 0;
    seen = true;
    if (!dialog.open) dialog.showModal();
    playing = true;
    await window.nook.setDemo(true);
    paint();
  }
  find("tour-next").addEventListener("click", async () => {
    if (!playing) {
      await start();
      return;
    }
    if (index === steps.length - 1) {
      await finish();
      return;
    }
    index++;
    await window.nook.tourStep(index);
    paint();
  });
  find("tour-back").addEventListener("click", async () => {
    index = Math.max(0, index - 1);
    if (playing) await window.nook.tourStep(index);
    paint();
  });
  find("tour-close").addEventListener("click", finish);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish();
  });
  dialog.querySelectorAll("[data-connect]").forEach((button) =>
    button.addEventListener("click", async () => {
      await finish();
      showPage(button.dataset.connect);
    }),
  );
  window.nook.onState((state) => {
    if (playing && !state.demo) {
      playing = false;
      if (dialog.open) dialog.close();
    }
    if (!seen && !state.features?.companion?.onboardingDone) {
      seen = true;
      opener = document.activeElement;
      paint();
      dialog.showModal();
    }
  });
  window.nook.onCommand((action) => {
    if (action.startsWith("page-")) {
      if (dialog.open) finish();
      showPage(action.slice(5));
    }
  });
  window.NookTour = { start, finish };
})();
