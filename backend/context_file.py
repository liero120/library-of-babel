"""Local context file manager for headless browser mode.

Rebuilds .babel-context.md before each prompt so the Copilot session
gets full reading context (since there's no persistent system prompt).
"""

from __future__ import annotations

import os
from backend.prompts import get_system_prompt

_CONTEXT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".babel-context.md")
_MAX_CONTEXT_CHARS = 4000


def update_context_file(
    doc_title: str,
    section_idx: int,
    total_sections: int,
    section_title: str | None,
    section_text: str,
    mode: str,
    lens_type: str | None,
    user_notes: str | None,
    history: list[dict] | None,
) -> str:
    """Rebuild the context file and return its content."""
    system_prompt = get_system_prompt(mode, lens_type)

    parts = [
        "# Library of Babel — Reading Context\n",
        f"## Your Role\n{system_prompt}\n",
        f"## Current Document\n**{doc_title}**\nSection {section_idx + 1} of {total_sections}",
    ]
    if section_title:
        parts[-1] += f": {section_title}"
    parts[-1] += "\n"

    if history:
        parts.append("## Previous Analysis (this section)")
        for h in history[-3:]:
            snippet = h.get("response", "")[:200]
            parts.append(f"- [{h.get('action', '?')}]: {snippet}")
        parts.append("")

    if user_notes:
        parts.append(f"## Reader's Notes\n{user_notes}\n")

    parts.append(
        "## Rules\n"
        "- NEVER summarize the text\n"
        "- NEVER generate outlines\n"
        "- Respond ONLY with the specific analysis requested\n"
    )

    content = "\n".join(parts)

    # Truncate to stay within Copilot context limits
    if len(content) > _MAX_CONTEXT_CHARS:
        content = content[:_MAX_CONTEXT_CHARS] + "\n\n[Context truncated]"

    with open(_CONTEXT_PATH, "w") as f:
        f.write(content)

    return content


def read_context_file() -> str:
    """Read the current context file."""
    if os.path.exists(_CONTEXT_PATH):
        with open(_CONTEXT_PATH) as f:
            return f.read()
    return ""
