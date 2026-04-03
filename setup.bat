@echo off
REM Library of Babel — Windows Setup Script
REM Run this once after cloning: setup.bat

echo.
echo   ==========================================
echo     Library of Babel — Setup (Windows)
echo     Cooperative AI-to-Human Document Review
echo   ==========================================
echo.

REM ── Check prerequisites ─────────────────────

echo   [1/5] Checking prerequisites...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   ERROR: Python not found. Install Python 3.10+ and try again.
    exit /b 1
)
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   ERROR: Node.js not found. Install Node 18+ and try again.
    exit /b 1
)
python --version
node --version
echo.

REM ── Python backend ──────────────────────────

echo   [2/5] Setting up Python backend...
if not exist "venv" (
    python -m venv venv
    echo   Created virtual environment
)

call venv\Scripts\activate.bat

pip install -q -r requirements.txt
echo   Python dependencies installed

echo   Installing Playwright Chromium...
playwright install chromium 2>nul || python -m playwright install chromium
echo   Playwright ready
echo.

REM ── Environment config ──────────────────────

echo   [3/5] Configuring environment...
if not exist ".env" (
    copy .env.example .env >nul
    echo   Created .env from .env.example
) else (
    echo   .env already exists — skipping
)
echo.

REM ── Frontend ────────────────────────────────

echo   [4/5] Setting up frontend...
cd mobile
call npm install
cd ..
echo   Frontend dependencies installed
echo.

REM ── M365 Copilot auth ──────────────────────

echo   [5/5] M365 Copilot authentication...
if exist ".copilot-auth\state.json" (
    echo   Auth state already exists
    echo   To re-authenticate: python -m backend.llm_browser --auth
) else (
    echo.
    echo   This will open a browser to M365 Copilot.
    echo   Log in with your work account, then press Enter here.
    echo.
    set /p REPLY="  Ready to authenticate? [Y/n] "
    if /i "%REPLY%"=="n" (
        echo   Skipped. Run later: python -m backend.llm_browser --auth
    ) else (
        python -m backend.llm_browser --auth
    )
)

echo.
echo   ==========================================
echo     Setup complete!
echo   ==========================================
echo.
echo   To run Library of Babel:
echo.
echo   Terminal 1 (backend):
echo     venv\Scripts\activate
echo     uvicorn backend.server:app --port 8001
echo.
echo   Terminal 2 (frontend):
echo     cd mobile ^&^& npm run dev
echo.
echo   Then open: http://localhost:5173
echo.
