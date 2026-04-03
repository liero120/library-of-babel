#!/usr/bin/env bash
# Library of Babel — Setup Script
# Run this once after cloning: ./setup.sh

set -e

BOLD='\033[1m'
AMBER='\033[33m'
GREEN='\033[32m'
RED='\033[31m'
DIM='\033[2m'
RESET='\033[0m'

echo ""
echo -e "${AMBER}${BOLD}  ┌─────────────────────────────────────────────┐${RESET}"
echo -e "${AMBER}${BOLD}  │         Library of Babel — Setup             │${RESET}"
echo -e "${AMBER}${BOLD}  │   Cooperative AI-to-Human Document Review    │${RESET}"
echo -e "${AMBER}${BOLD}  └─────────────────────────────────────────────┘${RESET}"
echo ""

# ── Check prerequisites ───────────────────────────────────────

check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        echo -e "  ${RED}Missing: $1${RESET}"
        echo -e "  ${DIM}Install $1 and re-run this script.${RESET}"
        exit 1
    fi
}

echo -e "${BOLD}  [1/5] Checking prerequisites...${RESET}"
check_cmd python3
check_cmd node
check_cmd npm

PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VER=$(node --version | cut -d'.' -f1 | tr -d 'v')

echo -e "  ${DIM}Python ${PYTHON_VER}, Node ${NODE_VER}${RESET}"

if [ "$(echo "$PYTHON_VER < 3.10" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
    echo -e "  ${RED}Python 3.10+ required (found $PYTHON_VER)${RESET}"
    exit 1
fi

# ── Python backend ────────────────────────────────────────────

echo ""
echo -e "${BOLD}  [2/5] Setting up Python backend...${RESET}"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "  ${DIM}Created virtual environment${RESET}"
fi

# Activate venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

pip install -q -r requirements.txt
echo -e "  ${GREEN}Python dependencies installed${RESET}"

echo -e "  ${DIM}Installing Playwright Chromium...${RESET}"
playwright install chromium 2>/dev/null || python -m playwright install chromium
echo -e "  ${GREEN}Playwright ready${RESET}"

# ── Environment config ────────────────────────────────────────

echo ""
echo -e "${BOLD}  [3/5] Configuring environment...${RESET}"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "  ${GREEN}Created .env from .env.example${RESET}"
    echo -e "  ${DIM}Default: LLM_BACKEND=browser (M365 Copilot)${RESET}"
else
    echo -e "  ${DIM}.env already exists — skipping${RESET}"
fi

# ── Frontend ──────────────────────────────────────────────────

echo ""
echo -e "${BOLD}  [4/5] Setting up frontend...${RESET}"

cd mobile
npm install --silent 2>/dev/null || npm install
cd ..
echo -e "  ${GREEN}Frontend dependencies installed${RESET}"

# ── M365 Copilot auth ────────────────────────────────────────

echo ""
echo -e "${BOLD}  [5/5] M365 Copilot authentication...${RESET}"

if [ -f ".copilot-auth/state.json" ]; then
    echo -e "  ${DIM}Auth state already exists (.copilot-auth/state.json)${RESET}"
    echo -e "  ${DIM}To re-authenticate: python -m backend.llm_browser --auth${RESET}"
else
    echo ""
    echo -e "  ${AMBER}This will open a browser window to M365 Copilot.${RESET}"
    echo -e "  ${AMBER}Log in with your work account, then press Enter here.${RESET}"
    echo ""
    read -p "  Ready to authenticate? [Y/n] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        python -m backend.llm_browser --auth
    else
        echo -e "  ${DIM}Skipped. Run later: python -m backend.llm_browser --auth${RESET}"
    fi
fi

# ── Done ──────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}  Setup complete!${RESET}"
echo ""
echo -e "  ${BOLD}To run Library of Babel:${RESET}"
echo ""
echo -e "  ${AMBER}Terminal 1 (backend):${RESET}"
echo -e "    source venv/bin/activate"
echo -e "    uvicorn backend.server:app --port 8001"
echo ""
echo -e "  ${AMBER}Terminal 2 (frontend):${RESET}"
echo -e "    cd mobile && npm run dev"
echo ""
echo -e "  ${AMBER}Then open:${RESET} http://localhost:5173"
echo ""
