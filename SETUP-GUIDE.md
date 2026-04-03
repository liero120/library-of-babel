# Library of Babel — Setup Guide

## What This Is

A cooperative AI-to-human document review system. Instead of summarizing documents for you, it **challenges your thinking** through three modes:

- **Provocation** — Counter-arguments, logical fallacy flags, challenging questions
- **Lens** — Analyzes text through a specific frame (financial, ethical, technical, legal)
- **Scaffold** — Asks YOU questions to force deeper thinking (never answers for you)

No chat box. No summaries. Structured buttons only. Based on Advait Sarkar's "Tools for Thought" research at Microsoft Research.

The LLM backend is **M365 Copilot Chat** running in a headless browser — no API keys needed, uses your existing work Copilot license.

---

## Architecture

```
library-of-babel/
├── backend/                  # Python FastAPI server
│   ├── server.py             # REST API + WebSocket endpoints
│   ├── document.py           # Document chunking (PDF, text, markdown, URL)
│   ├── prompts.py            # System prompts per mode (the intellectual core)
│   ├── provocation.py        # LLM dispatcher (API vs headless browser)
│   ├── llm_browser.py        # Playwright → M365 Copilot Chat automation
│   ├── llm_api.py            # Direct Claude API (alternative backend)
│   ├── context_file.py       # Builds .babel-context.md for browser mode
│   └── session.py            # SQLite database (documents, sessions, outlines)
├── mobile/                   # React 19 + Vite + Tailwind frontend
│   └── src/
│       ├── components/       # ReadTab, ProvocationPanel, OutlineTab, etc.
│       ├── hooks/            # useDocument, useProvocation, useOutline
│       └── api/              # REST client + TypeScript types
├── .env                      # Config (LLM_BACKEND, COPILOT_URL)
├── .copilot-auth/            # Saved M365 login session (created at setup)
├── babel.db                  # SQLite database (created at runtime)
├── setup.sh                  # Mac/Linux setup script
├── setup.bat                 # Windows setup script
└── .vscode/                  # VS Code launch configs + tasks
```

---

## Prerequisites (Install These First)

### 1. Python 3.12

**Windows (PowerShell as admin):**
```powershell
winget install Python.Python.3.12
```

Or download from https://python.org — **check "Add Python to PATH"** during install.

**Mac:**
```bash
brew install python@3.12
```

**Verify:**
```bash
python --version
# Should show Python 3.12.x
```

> **Windows note:** If you get "Python was not found; run without arguments to install from the Microsoft Store" — either Python isn't installed or isn't on PATH. After installing, **close and reopen VS Code entirely** (not just the terminal).

### 2. Node.js 18+

**Windows (PowerShell):**
```powershell
winget install OpenJS.NodeJS.LTS
```

Or download from https://nodejs.org (LTS version).

**Mac:**
```bash
brew install node
```

**Verify:**
```bash
node --version
npm --version
```

### 3. Git

Usually already installed. Verify with `git --version`. If not:

**Windows:**
```powershell
winget install Git.Git
```

---

## Setup Steps

### Step 1: Clone the repo

```bash
git clone https://github.com/liero120/library-of-babel.git
cd library-of-babel
```

Or download the ZIP from GitHub and extract it.

### Step 2: Open in VS Code

```bash
code .
```

Or: File → Open Folder → select `library-of-babel`

### Step 3: Switch terminal to Command Prompt (Windows only)

PowerShell has execution policy issues with Python venvs. Switch to Command Prompt:

1. Click the dropdown arrow next to **+** in the VS Code terminal panel
2. Select **Command Prompt**

Or set it as default: `Ctrl+Shift+P` → "Terminal: Select Default Profile" → **Command Prompt**

### Step 4: Python backend setup

```bash
python -m venv venv

# Activate — pick your OS:
# Windows Command Prompt:
venv\Scripts\activate
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
playwright install chromium
```

> **Windows PowerShell execution policy error?** Run this first:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### Step 5: Configure environment

```bash
# Windows:
copy .env.example .env

# Mac/Linux:
cp .env.example .env
```

The defaults are already set for M365 Copilot. No edits needed.

### Step 6: Frontend setup

```bash
cd mobile
npm install
cd ..
```

### Step 7: Authenticate with M365 Copilot (one time)

Make sure your venv is activated, then:

```bash
python -m backend.llm_browser --auth
```

This opens a real Chrome window:
1. It navigates to `https://m365.cloud.microsoft/chat/`
2. **Log in with your work Microsoft account**
3. Complete MFA if prompted
4. Wait until you see the Copilot chat interface loaded
5. Go back to the terminal and **press Enter**

Your session is saved to `.copilot-auth/state.json`. You won't need to do this again unless the session expires (typically a few hours to a few days).

---

## Running the App

You need two terminals running simultaneously.

### Terminal 1 — Backend

```bash
# Make sure venv is activated first
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

uvicorn backend.server:app --port 8001
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Database initialized
```

### Terminal 2 — Frontend

```bash
cd mobile
npm run dev
```

You should see:
```
  VITE v8.0.x  ready in XXXms
  ➜  Local:   http://localhost:5173/
```

### Open the app

Go to **http://localhost:5173** in your browser.

### VS Code shortcut

After setup, you can also use **`Ctrl+Shift+B`** to start both terminals at once.

---

## Using Library of Babel

### Add a document
1. You start on the **Library** tab
2. Tap the **+** button (bottom right)
3. Choose **Paste Text** and paste an article, report, or document
4. Give it a title and tap **Add to Library**

### Read and provoke
1. Tap the document to open it — you're now on the **Read** tab
2. The document is split into sections — navigate with Prev/Next
3. Below the text, pick a mode:

| Mode | Color | What it does |
|------|-------|-------------|
| **Provoke** | Red | "Challenge this" / "Find weakness" / "What am I missing?" |
| **Lens** | Purple | Pick a lens (financial, ethical, legal, etc.) then "Analyze" |
| **Scaffold** | Green | "How does this connect?" / "What if false?" / "What's my argument?" |

4. Tap a button. Wait 15-20 seconds. The AI provocation appears below.

### Take notes
- Switch to the **Outline** tab
- Add notes per section — this is YOUR space
- The AI never writes here. You build your own argument.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `python not found` | Install Python, **restart VS Code entirely** (not just terminal) |
| `node not found` | Install Node.js, restart VS Code |
| PowerShell won't activate venv | Use Command Prompt instead, or run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `venv\Scripts\Activate.ps1 not recognized` | Run `python -m venv venv` first — the venv hasn't been created yet |
| Copilot returns no response | Session expired — re-run `python -m backend.llm_browser --auth` |
| `[Browser error: ...]` | Re-authenticate. Selectors may have changed — check `.env` overrides |
| Port 8001 in use | Kill it: `npx kill-port 8001` (or `lsof -ti:8001 \| xargs kill` on Mac) |
| Frontend won't start | Make sure you ran `cd mobile && npm install` |
| `playwright install chromium` fails | Try `python -m playwright install chromium` |

---

## How It Works (Technical)

1. You paste a document → backend chunks it into 400-800 word sections
2. You tap a provocation button → backend builds a mode-specific prompt
3. In browser mode: Playwright opens headless Chromium with your saved M365 cookies, types the prompt into Copilot Chat, waits for the response, scrapes it back
4. The `.babel-context.md` file in the project root shows exactly what was sent to Copilot (transparency/debug)
5. All provocations are saved to `babel.db` — full audit trail

### LLM Backend Options (`.env`)

| Setting | How it works |
|---------|-------------|
| `LLM_BACKEND=browser` | Headless Playwright → M365 Copilot Chat (default, no API key needed) |
| `LLM_BACKEND=api` | Direct Claude API (needs `ANTHROPIC_API_KEY` in `.env`) |

---

## Current Status (2026-04-03)

### What's built and working
- Full backend: FastAPI with 16 REST endpoints + WebSocket
- Document ingestion: plain text, markdown, PDF (PyMuPDF), URL fetch
- Three engagement modes with distinct prompt templates
- M365 Copilot headless browser automation with Fluent UI selectors
- Claude API + Claude Code CLI fallback for VPS deployment
- React PWA frontend: Library, Read, Outline tabs
- Engagement throttle: structured buttons only, no free-text chat
- SQLite database with full provocation audit trail
- Local context file (.babel-context.md) for transparency
- PWA: service worker, manifest, installable on Android/iOS
- Capacitor config ready for native Android APK build
- VS Code workspace config (F5 to debug, Ctrl+Shift+B to run all)
- Setup scripts for Mac/Linux and Windows

### Deployed on VPS
- Live at: https://srv1195671.hstgr.cloud/babel/
- Backend: `babel-backend.service` on port 8001
- Nginx: `/babel/api/`, `/babel/ws`, `/babel/` routes configured
- Uses Claude Code CLI as LLM backend (no API key on VPS either)

### Tested end-to-end
- Document upload and chunking (text → 3 sections)
- Session creation and management
- Provocation mode "challenge" — excellent output
- Scaffold mode "falsify" — asks questions without answering
- Outline CRUD via API
- All REST endpoints verified

### Not yet tested
- PDF upload on frontend (backend works)
- URL fetch on frontend
- WebSocket streaming provocations
- M365 headless browser mode (needs work laptop with Copilot access)
- Android APK build via Capacitor
- Session expiry handling / auto re-auth

---

## Repo

https://github.com/liero120/library-of-babel
