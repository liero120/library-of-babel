"""Database layer — aiosqlite with WAL mode."""

import os
import aiosqlite

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "babel.db")
_db: aiosqlite.Connection | None = None

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf','markdown','text','url')),
    source_ref  TEXT,
    full_text   TEXT NOT NULL,
    section_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sections (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    idx     INTEGER NOT NULL,
    title   TEXT,
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(doc_id, idx)
);

CREATE TABLE IF NOT EXISTS sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id          INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    current_section INTEGER NOT NULL DEFAULT 0,
    mode            TEXT NOT NULL DEFAULT 'provocation',
    lens_type       TEXT,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provocations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    doc_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    section_idx INTEGER NOT NULL,
    mode        TEXT NOT NULL,
    action      TEXT NOT NULL,
    lens_type   TEXT,
    prompt_sent TEXT NOT NULL,
    response    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outlines (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    section_idx INTEGER,
    note_text   TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sections_doc ON sections(doc_id, idx);
CREATE INDEX IF NOT EXISTS idx_provocations_session ON provocations(session_id, section_idx);
CREATE INDEX IF NOT EXISTS idx_outlines_doc ON outlines(doc_id, section_idx);
"""


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
        await _db.execute("PRAGMA synchronous=NORMAL")
    return _db


async def init_db():
    db = await get_db()
    await db.executescript(SCHEMA_SQL)
    await db.commit()


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None


# ── Documents ──────────────────────────────────────────────────


async def insert_document(
    title: str,
    source_type: str,
    source_ref: str | None,
    full_text: str,
    sections: list[dict],
) -> int:
    db = await get_db()
    cursor = await db.execute(
        "INSERT INTO documents (title, source_type, source_ref, full_text, section_count) "
        "VALUES (?, ?, ?, ?, ?)",
        (title, source_type, source_ref, full_text, len(sections)),
    )
    doc_id = cursor.lastrowid
    for s in sections:
        await db.execute(
            "INSERT INTO sections (doc_id, idx, title, content, word_count) "
            "VALUES (?, ?, ?, ?, ?)",
            (doc_id, s["idx"], s.get("title"), s["content"], s["word_count"]),
        )
    await db.commit()
    return doc_id


async def get_documents() -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, title, source_type, source_ref, section_count, created_at "
        "FROM documents ORDER BY updated_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_document(doc_id: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc = await cursor.fetchone()
    if not doc:
        return None
    result = dict(doc)
    cursor = await db.execute(
        "SELECT idx, title, content, word_count FROM sections "
        "WHERE doc_id = ? ORDER BY idx",
        (doc_id,),
    )
    result["sections"] = [dict(r) for r in await cursor.fetchall()]
    return result


async def get_section(doc_id: int, idx: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute(
        "SELECT idx, title, content, word_count FROM sections "
        "WHERE doc_id = ? AND idx = ?",
        (doc_id, idx),
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def delete_document(doc_id: int) -> bool:
    db = await get_db()
    cursor = await db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    await db.commit()
    return cursor.rowcount > 0


# ── Sessions ───────────────────────────────────────────────────


async def create_session(doc_id: int, mode: str = "provocation", lens_type: str | None = None) -> dict:
    db = await get_db()
    cursor = await db.execute(
        "INSERT INTO sessions (doc_id, mode, lens_type) VALUES (?, ?, ?)",
        (doc_id, mode, lens_type),
    )
    await db.commit()
    session_id = cursor.lastrowid
    cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    return dict(await cursor.fetchone())


async def get_sessions() -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT s.*, d.title as doc_title FROM sessions s "
        "JOIN documents d ON s.doc_id = d.id ORDER BY s.updated_at DESC"
    )
    return [dict(r) for r in await cursor.fetchall()]


async def get_session(session_id: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute(
        "SELECT s.*, d.title as doc_title FROM sessions s "
        "JOIN documents d ON s.doc_id = d.id WHERE s.id = ?",
        (session_id,),
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def update_session(session_id: int, **kwargs) -> dict | None:
    db = await get_db()
    allowed = {"current_section", "mode", "lens_type"}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return await get_session(session_id)
    updates["updated_at"] = "datetime('now')"
    set_clause = ", ".join(
        f"{k} = {v}" if k == "updated_at" else f"{k} = ?" for k in updates
    )
    values = [v for k, v in updates.items() if k != "updated_at"]
    values.append(session_id)
    await db.execute(f"UPDATE sessions SET {set_clause} WHERE id = ?", values)
    await db.commit()
    return await get_session(session_id)


# ── Provocations ───────────────────────────────────────────────


async def insert_provocation(
    session_id: int,
    doc_id: int,
    section_idx: int,
    mode: str,
    action: str,
    lens_type: str | None,
    prompt_sent: str,
    response: str,
) -> int:
    db = await get_db()
    cursor = await db.execute(
        "INSERT INTO provocations "
        "(session_id, doc_id, section_idx, mode, action, lens_type, prompt_sent, response) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (session_id, doc_id, section_idx, mode, action, lens_type, prompt_sent, response),
    )
    await db.commit()
    return cursor.lastrowid


async def get_provocations(
    session_id: int, section_idx: int | None = None
) -> list[dict]:
    db = await get_db()
    if section_idx is not None:
        cursor = await db.execute(
            "SELECT * FROM provocations WHERE session_id = ? AND section_idx = ? "
            "ORDER BY created_at",
            (session_id, section_idx),
        )
    else:
        cursor = await db.execute(
            "SELECT * FROM provocations WHERE session_id = ? ORDER BY created_at",
            (session_id,),
        )
    return [dict(r) for r in await cursor.fetchall()]


# ── Outlines ───────────────────────────────────────────────────


async def upsert_outline(
    doc_id: int,
    section_idx: int | None,
    note_text: str,
    position: int = 0,
    note_id: int | None = None,
) -> int:
    db = await get_db()
    if note_id:
        await db.execute(
            "UPDATE outlines SET note_text = ?, position = ?, updated_at = datetime('now') "
            "WHERE id = ?",
            (note_text, position, note_id),
        )
        await db.commit()
        return note_id
    cursor = await db.execute(
        "INSERT INTO outlines (doc_id, section_idx, note_text, position) VALUES (?, ?, ?, ?)",
        (doc_id, section_idx, note_text, position),
    )
    await db.commit()
    return cursor.lastrowid


async def get_outline(doc_id: int) -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM outlines WHERE doc_id = ? ORDER BY section_idx, position",
        (doc_id,),
    )
    return [dict(r) for r in await cursor.fetchall()]


async def delete_outline(note_id: int) -> bool:
    db = await get_db()
    cursor = await db.execute("DELETE FROM outlines WHERE id = ?", (note_id,))
    await db.commit()
    return cursor.rowcount > 0
