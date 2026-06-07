# Full Stack Agentic App Builder with Next JS, Supabase, Gemini AI, Cline SDK, Shadcn UI Tutorial 🔥🔥

## https://www.youtube.com/watch?v=UUK93oW0SaA

<img width="1466" height="920" alt="forge landing" src="https://github.com/user-attachments/assets/df343943-592e-48a5-83bb-a65f80eb6028" />

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)

---

## Overview

A full-stack AI-powered React app generator where users describe what they want to build, and the AI writes production-ready React code that renders live in the browser — just like Bolt.new or Lovable.

Users get a live Sandpack preview, a persistent chat history, image upload support, and a credit-based subscription system. Pro users can trigger a Cline AI agent that autonomously improves the generated app file by file.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Auth + Billing | Clerk |
| Database | Supabase (via Prisma) |
| Image Storage | Supabase Storage |
| Rate Limiting | Arcjet |
| AI Model | Gemini 3.5 Flash |
| AI Agent (Improve) | Cline SDK (`@cline/sdk`) |
| Code Editor + Preview | Sandpack (`@codesandbox/sandpack-react`) |
| Styling | Tailwind CSS v4 + Shadcn UI |
| ORM | Prisma (Postgres adapter) |

---

## Features

### Landing Page
- Prompt textarea with rotating placeholders and suggestion chips
- Live browser mockup preview
- Features section, how-it-works steps, pricing table (Clerk `<PricingTable />`)
- Dark theme throughout

### Auth (Clerk)
- Google OAuth sign-in
- User auto-created in Supabase on first login with free credits
- Plan detection via Clerk `has()` — credits top-up on plan upgrade
- Pricing modal accessible from the header credit badge

### Workspace
- Split-panel layout: Chat (left) + Code/Preview (right)
- Full persistent chat history stored in Supabase
- AI responses rendered with `react-markdown` and a live blinking cursor during streaming
- Image upload via paperclip → Supabase Storage → CDN URL injected into prompt
- Auto-scroll, hidden scrollbar, user avatars

### AI Code Generation (`/api/gen-ai-code`)
- Gemini 3.5 Flash with `thinkingConfig` enabled
- Streams Gemini thought labels as live status steps in the chat panel
- Returns strict JSON: `{ assistantMessage, title, files, dependencies }`
- npm registry validation — hallucinated packages silently filtered
- Atomic DB transaction: workspace upsert + credit deduction in one operation

### Improve with AI — Cline SDK (`/api/improve`) — Pro + Starter
- Cline `Agent` with two tools: `update_file` + `done_improving`
- Agent streams reasoning live into the chat panel as it works
- Files patched one at a time via SSE — Sandpack updates without remounting
- `lifecycle: { completesRun: true }` ends the agent cleanly after all files are done
- Gated to Starter and Pro plans

### Fix with AI
- Sandpack listens for runtime + compile errors
- Error banner appears in Preview tab with "Fix with AI" button
- Injects the error + context into Gemini and triggers a new generation

### Code Panel (Sandpack)
- Preview and Code tabs — auto-switches to Preview after each generation
- Built-in CodeMirror editor (read-only), file explorer
- Tailwind v3 loaded via CDN inside the preview iframe
- Smart re-keying: `SandpackProvider` only remounts when file paths change, not contents
- Export to ZIP — downloads a ready-to-run CRA project with `package.json`

### Projects Page
- Grid of all past workspaces with title, first prompt preview, message count, timestamp
- Delete project with confirmation modal
- Empty state with CTA

### Token / Credit System
- Free: 10 credits · Starter: 50 · Pro: 150
- Cost: 1 credit per generation or improve
- Checked client-side and server-side (402 response as backup)
- Credits top up additively on plan upgrade, preserved on downgrade

---

## Getting Started

### Prerequisites

- Node.js 22+
- A Supabase project
- A Clerk application
- A Google AI Studio API key (Gemini)

### Installation

```bash
git clone https://github.com/roadsidecoder/buildai.git
cd buildai
npm install
```

Generate the Prisma client:

```bash
npx prisma generate
npx prisma db push
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file in the root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Database (Supabase Postgres connection string)
DATABASE_URL=

# Google Gemini
GEMINI_API_KEY=

# Arcjet
ARCJET_KEY=
```

---

## Database Setup

The Prisma schema has two models:

**User** — synced from Clerk on first login
```
id, clerkId, name, email, imageUrl, credits, plan, createdAt, updatedAt
```

**Workspace** — one per AI session
```
id, userId (FK), title, messages (JSON), fileData (JSON), createdAt, updatedAt
```

`fileData` stores both generated files and validated dependencies as a single JSON blob.

Supabase Storage bucket: `workspace-images` — public, organized by `userId/workspaceId/`.

---

## 🌟 Show your support

Give a ⭐ if this project helped you learn something new!
