"""Direct LLM backend — Claude API (if key set) or Claude Code CLI (fallback)."""

from __future__ import annotations

import asyncio
import os
import logging
from typing import AsyncGenerator

log = logging.getLogger(__name__)


def _has_api_key() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


async def send_prompt(system: str, user_msg: str, model: str | None = None) -> str:
    """Send a prompt and return the full response."""
    if _has_api_key():
        return await _send_via_api(system, user_msg, model)
    return await _send_via_cli(system, user_msg)


async def stream_prompt(
    system: str, user_msg: str, model: str | None = None
) -> AsyncGenerator[str, None]:
    """Stream tokens (only supported with API key; CLI returns full response)."""
    if _has_api_key():
        async for token in _stream_via_api(system, user_msg, model):
            yield token
    else:
        result = await _send_via_cli(system, user_msg)
        yield result


# ── Claude API path ────────────────────────────────────────────

_client = None


def _get_client():
    global _client
    if _client is None:
        from anthropic import AsyncAnthropic
        _client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


async def _send_via_api(system: str, user_msg: str, model: str | None = None) -> str:
    client = _get_client()
    model = model or os.getenv("LLM_MODEL", "claude-sonnet-4-20250514")
    log.info("API call to %s (%d chars)", model, len(user_msg))
    response = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )
    return response.content[0].text


async def _stream_via_api(
    system: str, user_msg: str, model: str | None = None
) -> AsyncGenerator[str, None]:
    client = _get_client()
    model = model or os.getenv("LLM_MODEL", "claude-sonnet-4-20250514")
    async with client.messages.stream(
        model=model,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


# ── Claude Code CLI path (no API key needed) ──────────────────


async def _send_via_cli(system: str, user_msg: str) -> str:
    """Use the Claude Code CLI in print mode as the LLM backend."""
    full_prompt = f"{user_msg}"
    cmd = [
        "claude",
        "-p", full_prompt,
        "--append-system-prompt", system,
        "--output-format", "text",
    ]
    log.info("CLI call (%d char prompt, %d char system)", len(user_msg), len(system))
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        err_msg = stderr.decode(errors="replace").strip()
        log.error("CLI failed (rc=%d): %s", proc.returncode, err_msg[:500])
        return f"[CLI error: {err_msg[:200]}]"
    return stdout.decode(errors="replace").strip()
