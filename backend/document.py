"""Document ingestion — PDF, markdown, plain text, URL."""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict


@dataclass
class Section:
    idx: int
    title: str | None
    content: str
    word_count: int

    def to_dict(self) -> dict:
        return asdict(self)


# ── Chunking ───────────────────────────────────────────────────

_HEADING_RE = re.compile(r"^(#{1,4})\s+(.+)$", re.MULTILINE)
_MAX_WORDS = 800
_MIN_WORDS = 50


def _word_count(text: str) -> int:
    return len(text.split())


def _split_at_headings(text: str) -> list[tuple[str | None, str]]:
    """Split text at markdown headings. Returns [(heading, body), ...]."""
    parts: list[tuple[str | None, str]] = []
    matches = list(_HEADING_RE.finditer(text))
    if not matches:
        return [(None, text.strip())]
    if matches[0].start() > 0:
        preamble = text[: matches[0].start()].strip()
        if preamble:
            parts.append((None, preamble))
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.end() : end].strip()
        if body:
            parts.append((m.group(2).strip(), body))
    return parts


def _split_by_paragraphs(text: str, max_words: int = _MAX_WORDS) -> list[str]:
    """Split long text into chunks at paragraph boundaries."""
    paragraphs = re.split(r"\n\s*\n", text)
    chunks: list[str] = []
    current: list[str] = []
    current_wc = 0
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        pwc = _word_count(para)
        if current_wc + pwc > max_words and current:
            chunks.append("\n\n".join(current))
            current = [para]
            current_wc = pwc
        else:
            current.append(para)
            current_wc += pwc
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def chunk_text(text: str, max_words: int = _MAX_WORDS) -> list[Section]:
    """Split text into sections at heading boundaries or by word count."""
    heading_parts = _split_at_headings(text)
    sections: list[Section] = []
    idx = 0
    for title, body in heading_parts:
        wc = _word_count(body)
        if wc <= max_words:
            if wc >= _MIN_WORDS or not sections:
                sections.append(Section(idx=idx, title=title, content=body, word_count=wc))
                idx += 1
            elif sections:
                prev = sections[-1]
                sections[-1] = Section(
                    idx=prev.idx,
                    title=prev.title,
                    content=prev.content + "\n\n" + body,
                    word_count=prev.word_count + wc,
                )
        else:
            sub_chunks = _split_by_paragraphs(body, max_words)
            for i, chunk in enumerate(sub_chunks):
                sub_title = f"{title} (part {i + 1})" if title and len(sub_chunks) > 1 else title
                sections.append(
                    Section(idx=idx, title=sub_title, content=chunk, word_count=_word_count(chunk))
                )
                idx += 1
    if not sections:
        sections.append(Section(idx=0, title=None, content=text.strip(), word_count=_word_count(text)))
    return sections


# ── PDF ────────────────────────────────────────────────────────


def parse_pdf(file_bytes: bytes) -> tuple[str, str]:
    """Extract text from PDF using PyMuPDF. Returns (title, full_text)."""
    import fitz

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    title = doc.metadata.get("title", "") or ""
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    full_text = "\n\n".join(pages)
    if not title:
        first_line = full_text.strip().split("\n")[0][:120]
        title = first_line
    return title, full_text


# ── Markdown ───────────────────────────────────────────────────


def parse_markdown(text: str) -> tuple[str, str]:
    """Extract title from first heading."""
    m = _HEADING_RE.search(text)
    title = m.group(2).strip() if m else text.strip().split("\n")[0][:120]
    return title, text


# ── URL ────────────────────────────────────────────────────────


async def fetch_url(url: str) -> tuple[str, str]:
    """Fetch URL content, extract readable text."""
    import httpx

    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    html = resp.text
    title = ""
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match:
        title = title_match.group(1).strip()

    # Strip HTML tags for a simple text extraction
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    # Decode HTML entities
    import html as html_mod

    text = html_mod.unescape(text)
    if not title:
        title = text[:120]
    return title, text


# ── Main Entry ─────────────────────────────────────────────────


def ingest_text(text: str, title: str | None = None) -> tuple[str, list[Section]]:
    """Ingest plain text or markdown. Returns (title, sections)."""
    if title is None:
        title, text = parse_markdown(text)
    sections = chunk_text(text)
    return title, sections


def ingest_pdf(file_bytes: bytes) -> tuple[str, str, list[Section]]:
    """Ingest PDF. Returns (title, full_text, sections)."""
    title, full_text = parse_pdf(file_bytes)
    sections = chunk_text(full_text)
    return title, full_text, sections
