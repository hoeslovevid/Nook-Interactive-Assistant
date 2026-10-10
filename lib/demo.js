const STEPS = [
  [
    "Meet Nook",
    "Your companion watches your coding sessions and keeps requests within reach.",
    "idle",
  ],
  [
    "Watch the work",
    "Reading, editing, and terminal tasks have their own animations. Select a session to inspect its diff.",
    "coding",
  ],
  [
    "You stay in control",
    "Try Allow or Deny below. This is a sample request; no command will run.",
    "expectant",
  ],
  [
    "Answer a question",
    "Agents can ask you to choose an approach directly from the notch.",
    "expectant",
  ],
  [
    "Chat your way",
    "Connect a cloud provider or a local model. This sample conversation works without an API key.",
    "thinking",
  ],
  [
    "Your workspace at a glance",
    "Keep services, music, and plan usage nearby. These figures are sample data.",
    "dancing",
  ],
  [
    "Ready when you are",
    "Connect an agent or a model, choose an outfit, and make Nook yours.",
    "happy",
  ],
];
function demoState(real, step = 0, answered = false) {
  step = Math.max(0, Math.min(STEPS.length - 1, Number(step) || 0));
  const [title, detail, mood] = STEPS[step];
  const session = {
    id: "demo-claude",
    sessionId: "demo",
    agent: "claude",
    label: "Claude · sample project",
    task: step === 1 ? "Edit" : "Read",
    file: "sample/app.js",
    detail: "Updated the greeting",
    added: 1,
    removed: 1,
    diff: '-const greeting = "Hello";\n+const greeting = "Hello from Nook";',
    finished: step === 6,
    final: step === 6 ? "Updated the greeting and checked the result." : "",
    steps: [
      {
        time: Date.now(),
        title: "Edit",
        task: "Edit",
        detail: "Updated the greeting",
        file: "sample/app.js",
        diff: '-const greeting = "Hello";\n+const greeting = "Hello from Nook";',
        added: 1,
        removed: 1,
      },
    ],
  };
  return {
    ...real,
    status: title,
    hint: detail,
    demo: true,
    demoStep: step,
    demoMood: mood,
    sessions: [
      session,
      {
        ...session,
        id: "demo-codex",
        agent: "codex",
        label: "Codex · tests",
        task: "Bash",
        file: "",
        diff: "",
        detail: "Checking unit tests",
      },
    ],
    activity: [
      {
        id: "demo-edit",
        title: "Sample edit",
        detail: "Updated the greeting",
        agent: "claude",
        file: session.file,
        added: 1,
        removed: 1,
      },
    ],
    pending:
      !answered && (step === 2 || step === 3)
        ? {
            id: `demo-request-${step}`,
            agent: "claude",
            title:
              step === 2 ? "Run sample tests?" : "Choose a sample approach",
            detail:
              step === 2
                ? "npm test · sample only"
                : "Which style should the greeting use?",
            kind: step === 2 ? "approval" : "question",
            always: false,
            questions:
              step === 3
                ? [
                    {
                      question: "Greeting style",
                      options: [{ label: "Friendly" }, { label: "Minimal" }],
                      multi: false,
                    },
                  ]
                : [],
          }
        : null,
    attachment: null,
    messages:
      step === 4
        ? [
            {
              role: "user",
              content: "What can you help me with?",
              provider: "chatgpt",
            },
            {
              role: "assistant",
              content:
                "Explain code, review an attached screenshot, or help plan your next change.",
              provider: "chatgpt",
            },
          ]
        : [],
    services:
      step === 5
        ? [
            {
              id: "github",
              title: "GitHub · sample",
              detail: "2 open PRs · checks passing",
            },
            { id: "vercel", title: "Vercel · sample", detail: "Preview ready" },
          ]
        : [],
    usage: [],
    github: null,
    githubBadge: "",
    celebrate: step === 6 ? 1 : 0,
    features: {
      ...real.features,
      music:
        step === 5
          ? {
              available: true,
              title: "A little focus · sample",
              artist: "Demo soundtrack",
              playing: true,
              canToggle: false,
              canNext: false,
              canPrevious: false,
              canSeek: false,
            }
          : { available: false },
    },
  };
}
module.exports = { STEPS, demoState };
