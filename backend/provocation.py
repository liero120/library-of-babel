"""Provocation engine — dispatches to the configured LLM backend."""

from __future__ import annotations

import logging
import os
from typing import AsyncGenerator

from backend.prompts import get_system_prompt, get_user_prompt
from backend import llm_api
from backend.context_file import update_context_file

log = logging.getLogger(__name__)


def _backend() -> str:
    return os.getenv("LLM_BACKEND", "api")


# Lazy-init browser singleton
_browser = None


async def _get_browser():
    global _browser
    if _browser is None:
        from backend.llm_browser import CopilotBrowser

        _browser = CopilotBrowser()
        await _browser.init()
    return _browser


async def generate_provocation(
    section_text: str,
    mode: str,
    action: str,
    lens_type: str | None = None,
    user_notes: str | None = None,
    history: list[dict] | None = None,
    doc_title: str = "",
    section_idx: int = 0,
    total_sections: int = 1,
    section_title: str | None = None,
) -> str:
    """Generate a provocation using the configured backend."""
    system = get_system_prompt(mode, lens_type)
    user_msg = get_user_prompt(mode, action, section_text, user_notes, history)

    backend = _backend()
    log.info("Provocation: mode=%s action=%s backend=%s", mode, action, backend)

    if backend == "browser":
        # Rebuild context file, then send to headless browser
        update_context_file(
            doc_title=doc_title,
            section_idx=section_idx,
            total_sections=total_sections,
            section_title=section_title,
            section_text=section_text,
            mode=mode,
            lens_type=lens_type,
            user_notes=user_notes,
            history=history,
        )
        browser = await _get_browser()
        return await browser.send_prompt(user_msg)
    else:
        return await llm_api.send_prompt(system, user_msg)


async def stream_provocation(
    section_text: str,
    mode: str,
    action: str,
    lens_type: str | None = None,
    user_notes: str | None = None,
    history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream provocation tokens (API backend only)."""
    system = get_system_prompt(mode, lens_type)
    user_msg = get_user_prompt(mode, action, section_text, user_notes, history)

    backend = _backend()
    if backend == "browser":
        # Browser doesn't support streaming — yield full response
        result = await generate_provocation(
            section_text, mode, action, lens_type, user_notes, history
        )
        yield result
    else:
        async for token in llm_api.stream_prompt(system, user_msg):
            yield token


async def close_browser():
    """Shut down the browser if running."""
    global _browser
    if _browser:
        await _browser.close()
        _browser = None
