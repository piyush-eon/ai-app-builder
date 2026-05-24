import { Sparkles, Zap, Code2, Eye, Package, ImageIcon } from "lucide-react";

export const SUGGESTIONS = [
  "A Spotify stats dashboard with charts",
  "A kanban board with drag and drop",
  "A weather app with animated icons",
  "A personal finance tracker",
  "A recipe finder with filters",
  "A pomodoro timer with tasks",
];

export const FEATURES = [
  {
    icon: Zap,
    label: "Instant generation",
    desc: "Describe your app in plain English. Gemini 3.5 Flash returns production-ready React + Tailwind code in seconds.",
  },
  {
    icon: Eye,
    label: "Live preview",
    desc: "Your app renders instantly in the browser via Sandpack. No install, no build step — just a working preview.",
  },
  {
    icon: Code2,
    label: "Full source code",
    desc: "Browse every generated file. Edit directly in the built-in editor and watch the preview update in real time.",
  },
  {
    icon: Package,
    label: "Smart packages",
    desc: "AI picks the right npm packages. We validate them against the npm registry and filter hallucinated ones silently.",
  },
  {
    icon: Sparkles,
    label: "AI error recovery",
    desc: "When your preview throws an error, a banner appears. One click sends the error to AI and auto-fixes the code.",
  },
  {
    icon: ImageIcon,
    label: "Image-aware prompts",
    desc: "Attach screenshots or mockups to your prompt. The AI reads them and generates code that matches your design.",
  },
];

export const STEPS = [
  {
    number: "01",
    label: "Describe your app",
    desc: "Type a prompt or pick a suggestion. Add screenshots for extra context.",
  },
  {
    number: "02",
    label: "AI generates code",
    desc: "Gemini writes React + Tailwind components, picks dependencies, and structures your files.",
  },
  {
    number: "03",
    label: "Preview & refine",
    desc: "See your app live instantly. Keep chatting to iterate — AI remembers the full conversation.",
  },
  {
    number: "04",
    label: "Export or deploy",
    desc: "Open in CodeSandbox, copy the source, or deploy to a live URL — all in one click.",
  },
];

export const PLACEHOLDERS = [
  "A task manager with priority labels and drag-and-drop…",
  "A crypto portfolio tracker with live charts…",
  "A markdown notes app with live preview…",
  "An expense tracker with monthly breakdowns…",
  "A habit tracker with streaks and heatmaps…",
];
