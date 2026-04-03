"""Headless browser LLM backend — automates M365 Copilot Chat via Playwright.

Targets: https://m365.cloud.microsoft/chat/
Uses Fluent UI selectors (.fai-* classes) and Lexical rich text editor.

Usage:
  # One-time auth (launches visible browser for manual login):
  python -m backend.llm_browser --auth

  # Runtime: used by provocation.py when LLM_BACKEND=browser
"""

from __future__ import annotations

import asyncio
import logging
import os

log = logging.getLogger(__name__)

_AUTH_STATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".copilot-auth")
_AUTH_STATE_FILE = os.path.join(_AUTH_STATE_DIR, "state.json")

# M365 Copilot Chat selectors (Fluent UI)
_DEFAULT_COPILOT_URL = "https://m365.cloud.microsoft/chat/"

# Input: Lexical rich text editor (contentEditable span, NOT textarea)
_DEFAULT_INPUT_SEL = '[role="textbox"][contenteditable="true"]'
_FALLBACK_INPUT_SELS = [
    '.fai-EditorInput__input',
    '.fai-ChatInput__editor [contenteditable="true"]',
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Copilot"]',
    'textarea',
]

# Response: Fluent AI CopilotMessage content
_DEFAULT_RESPONSE_SEL = '.fai-CopilotMessage__content'
_FALLBACK_RESPONSE_SELS = [
    '.fai-CopilotMessage',
    'div[data-content="ai-message"]',
    '[data-content="response"]',
]

# Busy state: aria-busy on CopilotMessage while streaming
_BUSY_SEL = '.fai-CopilotMessage[aria-busy="true"]'
_FALLBACK_BUSY_SELS = [
    '[aria-busy="true"]',
    '[data-is-typing="true"]',
    '.typing-indicator',
    '.is-typing',
]

# Stability: wait this long after busy clears to confirm response is complete
_STABILITY_WAIT_S = 2.5


class CopilotBrowser:
    """Manages a persistent headless browser session to M365 Copilot Chat."""

    def __init__(self):
        self._pw = None
        self._browser = None
        self._page = None
        self._copilot_url = os.getenv("COPILOT_URL", _DEFAULT_COPILOT_URL)
        self._input_sel = os.getenv("COPILOT_INPUT_SELECTOR", _DEFAULT_INPUT_SEL)
        self._response_sel = os.getenv("COPILOT_RESPONSE_SELECTOR", _DEFAULT_RESPONSE_SEL)

    async def init(self):
        """Launch headless browser with saved auth state."""
        from playwright.async_api import async_playwright

        self._pw = await async_playwright().start()

        if os.path.exists(_AUTH_STATE_FILE):
            log.info("Loading saved auth state from %s", _AUTH_STATE_FILE)
            self._browser = await self._pw.chromium.launch(headless=True)
            ctx = await self._browser.new_context(storage_state=_AUTH_STATE_FILE)
        else:
            log.warning("No saved auth state — run `python -m backend.llm_browser --auth` first")
            self._browser = await self._pw.chromium.launch(headless=True)
            ctx = await self._browser.new_context()

        self._page = await ctx.new_page()
        await self._page.goto(self._copilot_url, wait_until="networkidle", timeout=30000)
        # Wait for the chat input to be ready
        await self._wait_for_input()
        log.info("Browser ready at %s", self._copilot_url)

    async def _wait_for_input(self):
        """Wait for the chat input to appear, trying multiple selectors."""
        page = self._page
        for sel in [self._input_sel] + _FALLBACK_INPUT_SELS:
            try:
                await page.wait_for_selector(sel, timeout=5000)
                self._input_sel = sel
                log.info("Found input with selector: %s", sel)
                return
            except Exception:
                continue
        log.warning("Could not find chat input — may need re-auth or selector update")

    async def _find_response_selector(self) -> str:
        """Find the working response selector."""
        page = self._page
        for sel in [self._response_sel] + _FALLBACK_RESPONSE_SELS:
            elements = await page.query_selector_all(sel)
            if elements:
                self._response_sel = sel
                return sel
        return self._response_sel

    async def send_prompt(self, prompt: str) -> str:
        """Type prompt into M365 Copilot Chat, wait for response, return text."""
        if not self._page:
            await self.init()

        page = self._page

        try:
            # Count existing responses before sending
            existing = await page.query_selector_all(self._response_sel)
            prev_count = len(existing)

            # Click the input and type (Lexical contentEditable — can't use fill())
            input_el = await page.wait_for_selector(self._input_sel, timeout=10000)
            await input_el.click()
            # Clear any existing text
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Backspace")
            # Type the prompt
            await page.keyboard.type(prompt, delay=5)
            await page.keyboard.press("Enter")

            log.info("Prompt sent (%d chars), waiting for response...", len(prompt))

            # Wait for Copilot to START responding (busy state appears)
            try:
                for sel in [_BUSY_SEL] + _FALLBACK_BUSY_SELS:
                    try:
                        await page.wait_for_selector(sel, timeout=10000)
                        log.info("Busy state detected: %s", sel)
                        break
                    except Exception:
                        continue
            except Exception:
                log.info("No busy indicator found — waiting for new response element")

            # Wait for Copilot to FINISH responding (busy state clears)
            try:
                await page.wait_for_function(
                    """() => {
                        const busy = document.querySelectorAll('[aria-busy="true"]');
                        return busy.length === 0;
                    }""",
                    timeout=120000,
                )
            except Exception:
                log.warning("Busy state wait timed out — proceeding anyway")

            # Stability window: wait for content to stop changing
            await asyncio.sleep(_STABILITY_WAIT_S)

            # Find the response selector that works
            await self._find_response_selector()

            # Extract the latest response
            messages = await page.query_selector_all(self._response_sel)
            if not messages or len(messages) <= prev_count:
                # Try waiting a bit more
                await asyncio.sleep(3)
                messages = await page.query_selector_all(self._response_sel)

            if not messages:
                log.warning("No response elements found with any selector")
                return "[No response captured — Copilot may need re-authentication. Run: python -m backend.llm_browser --auth]"

            last = messages[-1]
            text = await last.inner_text()
            result = text.strip()
            log.info("Response captured (%d chars)", len(result))
            return result

        except Exception as e:
            log.error("Browser prompt failed: %s", e)
            return f"[Browser error: {e}. Try re-authenticating: python -m backend.llm_browser --auth]"

    async def new_conversation(self):
        """Start a fresh conversation (navigate to base URL)."""
        if self._page:
            await self._page.goto(self._copilot_url, wait_until="networkidle", timeout=30000)
            await self._wait_for_input()
            log.info("Started new Copilot conversation")

    async def close(self):
        """Shut down the browser."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._pw:
            await self._pw.stop()
            self._pw = None
        self._page = None


async def authenticate():
    """Interactive auth — opens visible browser for manual M365 login."""
    from playwright.async_api import async_playwright

    os.makedirs(_AUTH_STATE_DIR, exist_ok=True)
    copilot_url = os.getenv("COPILOT_URL", _DEFAULT_COPILOT_URL)

    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=False)
    context = await browser.new_context()
    page = await context.new_page()
    await page.goto(copilot_url)

    print(f"""
  ┌─────────────────────────────────────────────────────┐
  │  M365 Copilot Chat — One-Time Authentication        │
  ├─────────────────────────────────────────────────────┤
  │                                                     │
  │  A browser window has opened to:                    │
  │  {copilot_url:<52}│
  │                                                     │
  │  1. Log in with your work Microsoft account         │
  │  2. Complete MFA if prompted                        │
  │  3. Wait until you see the Copilot chat interface   │
  │  4. Come back here and press Enter                  │
  │                                                     │
  │  Your session will be saved for headless reuse.     │
  └─────────────────────────────────────────────────────┘
""")
    input("  Press Enter when you see the Copilot chat ready... ")

    await context.storage_state(path=_AUTH_STATE_FILE)
    print(f"\n  Auth state saved to {_AUTH_STATE_FILE}")
    print("  You can now run Library of Babel with LLM_BACKEND=browser\n")

    await browser.close()
    await pw.stop()


# CLI entry point
if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

    if "--auth" in sys.argv:
        asyncio.run(authenticate())
    else:
        print("Usage: python -m backend.llm_browser --auth")
